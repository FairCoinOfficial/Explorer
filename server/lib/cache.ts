import { MongoClient, Db, type Collection, type Document, type Filter } from 'mongodb'
import { rpcWithNetwork, type NetworkType, type RpcParam } from '@fairco.in/rpc-client'
import { escapeRegex, MAX_BLOCK_OFFSET, sanitizeAddressValidation } from './http'
import { getDefaultMongoUri, getMongoDatabaseName } from './db/name'
import { logger } from './logger'

const MONGODB_URI = process.env.MONGODB_URI || getDefaultMongoUri()

/** Networks accepted for cache keys; guards values that flow into Mongo `$regex`. */
const VALID_NETWORKS: readonly NetworkType[] = ['mainnet', 'testnet']

function assertValidNetwork(network: NetworkType): void {
  if (!VALID_NETWORKS.includes(network)) {
    throw new Error(`Invalid network: ${String(network)}`)
  }
}

interface CacheOptions {
  ttl?: number // Time to live in seconds
  network: NetworkType
}

/** Document stored in the `cache` collection. */
interface CacheDocument extends Document {
  _id: string
  data: unknown
  timestamp: number
  ttl: number
  expiresAt: Date
  network: NetworkType
}

interface CachedData {
  data: unknown
  timestamp: number
  ttl: number
  network: NetworkType
}

/** Summary row stored in the `recent_blocks` collection. */
interface RecentBlockSummary {
  height: number
  hash: string
  time: number
  nTx: number
  size: number
  tx: string[]
}

interface RecentBlocksDocument extends Document {
  _id: string
  blocks: RecentBlockSummary[]
  timestamp: number
  expiresAt: Date
  network: NetworkType
}

/** Extra seconds past a document's logical TTL before Mongo physically removes it. */
const TTL_INDEX_GRACE_SECONDS = 3600

/** All-zero outpoint hash used by coinbase-style inputs that reference no parent. */
const ZERO_HASH = '0000000000000000000000000000000000000000000000000000000000000000'

/**
 * Max concurrent `getblock` RPCs when rebuilding the recent-blocks window on a
 * cache miss. Keeps latency low without stampeding the daemon.
 */
const RECENT_BLOCKS_CONCURRENCY = 6

/**
 * Shape returned by the FairCoin `masternode count` RPC. Fields beyond `total`
 * and `enabled` (e.g. `inqueue`, `ipv4`) vary by build and are not relied upon.
 */
export interface MasternodeCount {
  total?: number
  enabled?: number
  inqueue?: number
}

/**
 * Run `fn` over `items` with at most `concurrency` in-flight promises.
 * Results preserve input order.
 */
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return []
  }
  const limit = Math.max(1, Math.min(concurrency, items.length))
  const results: R[] = new Array(items.length)
  let nextIndex = 0

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await fn(items[index], index)
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()))
  return results
}

export class BlockchainCache {
  private db: Db | null = null
  private client: MongoClient | null = null
  /**
   * In-flight RPC promises keyed by cache key. Concurrent identical cache
   * misses share a single upstream call (stampede protection).
   */
  protected readonly inFlight = new Map<string, Promise<unknown>>()

  protected async getDb(): Promise<Db> {
    if (!this.db) {
      this.client = new MongoClient(MONGODB_URI)
      await this.client.connect()
      const dbName = getMongoDatabaseName(MONGODB_URI)
      this.db = this.client.db(dbName)
      await this.ensureIndexes(this.db)
      logger.info(`Connected to MongoDB (cache) database: ${dbName}`)
    }
    return this.db
  }

  protected async cacheCollection(): Promise<Collection<CacheDocument>> {
    const db = await this.getDb()
    return db.collection<CacheDocument>('cache')
  }

  protected async recentBlocksCollection(): Promise<Collection<RecentBlocksDocument>> {
    const db = await this.getDb()
    return db.collection<RecentBlocksDocument>('recent_blocks')
  }

  /**
   * Create TTL indexes so cache documents self-prune. `expiresAt` is a wall-clock
   * Date; Mongo's TTL monitor deletes the doc once it passes. We add a grace
   * window so application-level `isExpired` checks (which may still serve a
   * slightly stale doc on RPC failure) win before physical deletion.
   */
  private async ensureIndexes(db: Db): Promise<void> {
    try {
      await Promise.all([
        db.collection('cache').createIndex({ expiresAt: 1 }, { expireAfterSeconds: TTL_INDEX_GRACE_SECONDS }),
        db.collection('recent_blocks').createIndex({ expiresAt: 1 }, { expireAfterSeconds: TTL_INDEX_GRACE_SECONDS }),
      ])
    } catch (error) {
      logger.error('Failed to ensure cache TTL indexes:', error)
    }
  }

  protected getCacheKey(method: string, params: RpcParam[], network: NetworkType) {
    return `${network}:${method}:${JSON.stringify(params)}`
  }

  protected isExpired(cachedData: CachedData): boolean {
    const now = Date.now()
    return now - cachedData.timestamp > cachedData.ttl * 1000
  }

  async get<T>(method: string, params: RpcParam[] = [], options: CacheOptions): Promise<T> {
    assertValidNetwork(options.network)
    const collection = await this.cacheCollection()
    const cacheKey = this.getCacheKey(method, params, options.network)
    const ttlSeconds = options.ttl ?? 3600

    try {
      const cached = await collection.findOne({ _id: cacheKey })

      if (cached && !this.isExpired(cached)) {
        return cached.data as T
      }

      // Fetch from RPC behind single-flight so concurrent misses share one call.
      const data = await this.fetchSingleFlight<T>(cacheKey, method, params, options.network)

      // Store in cache. `expiresAt` powers the Mongo TTL index.
      // `_id` comes from the filter; do not set it on the replacement body
      // (Mongo's `WithoutId` typing rejects it).
      const now = Date.now()
      await collection.replaceOne(
        { _id: cacheKey },
        {
          data,
          timestamp: now,
          ttl: ttlSeconds,
          expiresAt: new Date(now + ttlSeconds * 1000),
          network: options.network,
        },
        { upsert: true },
      )

      return data
    } catch (error) {
      logger.error(`Error in cache.get for ${method}:`, error)
      // Fallback to RPC (still single-flighted) if cache read/write fails.
      return await this.fetchSingleFlight<T>(cacheKey, method, params, options.network)
    }
  }

  /**
   * Run an RPC call de-duplicated by cache key: if an identical call is already
   * in flight, await the existing promise instead of issuing a second request.
   */
  protected async fetchSingleFlight<T>(
    cacheKey: string,
    method: string,
    params: RpcParam[],
    network: NetworkType,
  ): Promise<T> {
    const existing = this.inFlight.get(cacheKey)
    if (existing) {
      return existing as Promise<T>
    }
    const promise = rpcWithNetwork<T>(method, params, network)
    this.inFlight.set(cacheKey, promise)
    try {
      return await promise
    } finally {
      this.inFlight.delete(cacheKey)
    }
  }

  async invalidate(method: string, params: RpcParam[] = [], network: NetworkType) {
    const collection = await this.cacheCollection()
    const cacheKey = this.getCacheKey(method, params, network)
    await collection.deleteOne({ _id: cacheKey })
  }

  async invalidatePattern(pattern: string, network: NetworkType) {
    assertValidNetwork(network)
    const collection = await this.cacheCollection()

    // Escape `network` so it cannot inject regex metacharacters into the key match.
    // `pattern` is caller-supplied and intentionally treated as a regex fragment.
    const filter: Filter<CacheDocument> = {
      _id: { $regex: `^${escapeRegex(network)}:${pattern}` },
    }
    await collection.deleteMany(filter)
  }

  async clearExpired() {
    const collection = await this.cacheCollection()
    const now = Date.now()

    const filter: Filter<CacheDocument> = {
      $expr: {
        $gt: [now, { $add: ['$timestamp', { $multiply: ['$ttl', 1000] }] }],
      },
    }
    const result = await collection.deleteMany(filter)

    if (result.deletedCount > 0) {
      logger.info(`Cleared ${result.deletedCount} expired cache entries`)
    }
  }
}

/** Freshness window for the precomputed recent-blocks list. */
const RECENT_BLOCKS_TTL_MS = 30_000

/**
 * TTL for a transaction that is still in the mempool (no `blockhash` yet). Kept
 * short so the cached "unconfirmed" snapshot is replaced within seconds of the
 * tx being mined — never the hour-long window that previously made confirmed
 * transactions read as unconfirmed.
 */
const UNCONFIRMED_TX_TTL_SECONDS = 20

/**
 * TTL for a confirmed transaction. The immutable body (vin/vout/hex/blockhash)
 * never changes once mined, so it is safe to cache for a long time. The volatile
 * `confirmations` count is NOT trusted from this cache — it is always recomputed
 * live from the current block height (see {@link BlockCache.getTransaction}).
 */
const CONFIRMED_TX_TTL_SECONDS = 3600

/**
 * Shape of the fields `getrawtransaction <txid> true` returns that the explorer
 * derives confirmation state from. Everything else on the verbose result is
 * passed through untouched.
 */
interface RawTransactionConfirmationFields {
  blockhash?: string
  blockheight?: number
  height?: number
  confirmations?: number | null
  time?: number
  blocktime?: number
}

/**
 * The subset of a verbose transaction output the explorer needs to resolve an
 * input's previous output (address + value). FairCoin's `getrawtransaction
 * verbose` returns much more on each vout; only these fields are read here.
 */
interface RawVout {
  value?: number
  n?: number
  scriptPubKey?: {
    type?: string
    addresses?: string[]
  }
}

/**
 * The subset of a verbose transaction input the explorer reads/writes. FairCoin's
 * `getrawtransaction verbose` does NOT include the spent output's address or value
 * on the input — only the outpoint (`txid` + `vout`). {@link BlockCache.enrichInputPrevouts}
 * resolves each outpoint to its `prevout` so the frontend can tell a real
 * recipient from change returned to the sender.
 */
interface RawVin {
  txid?: string
  vout?: number
  coinbase?: string
  prevout?: ResolvedPrevout
}

/**
 * The previous output a non-coinbase input spends, resolved from the referenced
 * transaction's vout. Attached to each input as `prevout` so input addresses and
 * the transaction fee can be computed client-side. Absent when the prevout cannot
 * be resolved (e.g. the parent tx is unavailable), so consumers degrade gracefully.
 */
export interface ResolvedPrevout {
  value: number
  addresses?: string[]
  type?: string
}

/**
 * Per-request cap on how many distinct previous transactions are fetched to
 * resolve input prevouts. Resolution reuses the long-lived `getrawtransaction`
 * cache, so steady-state cost is low; this bound only guards the cold-cache cost
 * of a pathological many-input transaction and keeps the endpoint responsive.
 * Inputs beyond the cap are returned without a `prevout` and the frontend
 * degrades gracefully (it falls back to the unenriched display).
 */
const MAX_PREVOUT_LOOKUPS = 12
const MAX_PREVOUT_LOOKUPS_PER_ADDRESS_PAGE = 40

interface PrevoutLookupBudget {
  remaining: number
}

interface TransactionLookupOptions {
  prevoutLookupBudget?: PrevoutLookupBudget
}

/** Verbose block fields used when building recent-block summaries. */
export interface VerboseBlock {
  height: number
  hash: string
  time: number
  nTx?: number
  size: number
  tx?: string[]
  difficulty?: number
  previousblockhash?: string
  nextblockhash?: string
  [key: string]: unknown
}

/** Verbose transaction body returned by `getrawtransaction <txid> true`. */
export interface VerboseTransaction extends RawTransactionConfirmationFields {
  txid?: string
  size?: number
  vin?: RawVin[]
  vout?: RawVout[]
  [key: string]: unknown
}

/** Address validation RPC result before sanitization. */
interface AddressValidationResult {
  isvalid?: boolean
  address?: string
  scriptPubKey?: string
  ismine?: boolean
  iswatchonly?: boolean
  isscript?: boolean
  iswitness?: boolean
  [key: string]: unknown
}

interface NetworkInfoResult {
  connections?: number
  version?: number | string
  subversion?: string
  protocolversion?: number
  [key: string]: unknown
}

interface MiningInfoResult {
  difficulty?: number
  networkhashps?: number | string
  hashrate?: number | string
  [key: string]: unknown
}

interface MempoolInfoResult {
  size?: number
  bytes?: number
  usage?: number
  maxmempool?: number
  mempoolminfee?: number
  [key: string]: unknown
}

/** One row from FairCoin `masternodelist` (default mode). */
export interface MasternodeListEntry {
  rank?: number
  txhash?: string
  outidx?: number
  status?: string
  addr?: string
  version?: number
  lastseen?: number
  activetime?: number
  lastpaid?: number
  [key: string]: unknown
}

// Block-specific caching with different TTLs
export class BlockCache extends BlockchainCache {
  async getBlock(hashOrHeight: string | number, network: NetworkType, verbose: boolean = true) {
    // Determine if it's a hash or height
    const isHeight = typeof hashOrHeight === 'number' || /^\d+$/.test(hashOrHeight.toString())

    if (isHeight) {
      const height = parseInt(hashOrHeight.toString(), 10)
      const hash = await this.get<string>('getblockhash', [height], { network, ttl: 300 }) // 5 minutes for block hashes
      return await this.get<VerboseBlock>('getblock', [hash, verbose], { network, ttl: 3600 }) // 1 hour for block data
    }
    return await this.get<VerboseBlock>('getblock', [hashOrHeight, verbose], { network, ttl: 3600 }) // 1 hour for block data
  }

  /**
   * Fetch a verbose transaction with correct confirmation state.
   *
   * Two correctness rules drive this, both of which the previous blanket
   * 1-hour cache violated:
   *
   *  1. A transaction first seen in the mempool has no `blockhash` and a null
   *     `confirmations`. That snapshot must NOT be pinned for an hour, or the tx
   *     keeps reading as "unconfirmed" long after it is mined. We cache the
   *     mempool snapshot for only {@link UNCONFIRMED_TX_TTL_SECONDS} so it
   *     refreshes within seconds of confirmation; once a `blockhash` is present
   *     the immutable body is cached for {@link CONFIRMED_TX_TTL_SECONDS}.
   *
   *  2. `confirmations` is a live value (`currentHeight - blockheight + 1`) that
   *     must never be served from a long-lived cache. We always recompute it (and
   *     refresh `blockheight`/`time`/`blocktime` from the verbose result) at
   *     request time using the 30s-cached block height, so a long-cached
   *     confirmed body still reports an accurate, monotonically growing count.
   *
   * The cache is read/written directly here (rather than via {@link get}) because
   * the TTL must be chosen AFTER fetching, based on whether the tx is confirmed.
   */
  readonly maxPrevoutLookupsPerAddressPage = MAX_PREVOUT_LOOKUPS_PER_ADDRESS_PAGE

  async getTransaction(
    txid: string,
    network: NetworkType,
    verbose?: true,
    options?: TransactionLookupOptions,
  ): Promise<VerboseTransaction | null>
  async getTransaction(
    txid: string,
    network: NetworkType,
    verbose: false,
    options?: TransactionLookupOptions,
  ): Promise<string>
  async getTransaction(
    txid: string,
    network: NetworkType,
    verbose: boolean = true,
    options: TransactionLookupOptions = {},
  ): Promise<VerboseTransaction | string | null> {
    assertValidNetwork(network)

    // Non-verbose callers just want the raw hex string; it never carries
    // confirmation state, so the plain cache path is correct for them.
    if (!verbose) {
      return await this.get<string>('getrawtransaction', [txid, verbose], {
        network,
        ttl: CONFIRMED_TX_TTL_SECONDS,
      })
    }

    const collection = await this.cacheCollection()
    const cacheKey = this.getCacheKey('getrawtransaction', [txid, verbose], network)

    let tx: VerboseTransaction | null = null

    try {
      const cached = await collection.findOne({ _id: cacheKey })
      if (
        cached &&
        !this.isExpired(cached) &&
        !this.isStaleUnconfirmed(cached)
      ) {
        tx = cached.data as VerboseTransaction
      }
    } catch (error) {
      logger.error(`Error reading cached transaction ${txid}:`, error)
    }

    if (!tx) {
      tx = await this.fetchSingleFlight<VerboseTransaction>(
        cacheKey,
        'getrawtransaction',
        [txid, verbose],
        network,
      )

      // FairCoin's `getrawtransaction verbose` returns `blockhash` but NOT the
      // block height. Resolve the height once (from the long-cached block) and
      // persist it on the cached body so live-confirmation math works without a
      // per-request block lookup. Mempool txs have no blockhash and are skipped.
      if (tx?.blockhash && typeof tx.blockheight !== 'number') {
        const resolved = await this.resolveBlockHeight(tx.blockhash, network)
        if (resolved !== null) {
          tx.blockheight = resolved
        }
      }

      // A confirmed tx (has a blockhash) is immutable except for `confirmations`,
      // so it is safe to cache long; a mempool tx must expire quickly.
      const ttlSeconds = tx?.blockhash ? CONFIRMED_TX_TTL_SECONDS : UNCONFIRMED_TX_TTL_SECONDS
      try {
        const now = Date.now()
        await collection.replaceOne(
          { _id: cacheKey },
          {
            data: tx,
            timestamp: now,
            ttl: ttlSeconds,
            expiresAt: new Date(now + ttlSeconds * 1000),
            network,
          },
          { upsert: true },
        )
      } catch (error) {
        logger.error(`Error caching transaction ${txid}:`, error)
      }
    }

    const withConfirmations = await this.withLiveConfirmations(tx, network)
    return await this.enrichInputPrevouts(withConfirmations, network, options.prevoutLookupBudget)
  }

  /**
   * Resolve each non-coinbase input's previous output (address + value) and attach
   * it as `vin[i].prevout`.
   *
   * FairCoin's `getrawtransaction verbose` returns only the outpoint (`txid` +
   * `vout`) on each input — never the spent output's address or value. Without
   * those, the frontend cannot distinguish a real recipient from change returned
   * to the sender, nor compute the fee. We resolve them here by reading each
   * referenced parent transaction (reusing the long-lived `getrawtransaction`
   * cache) and copying the matching vout's `value`/`addresses`/`type`.
   *
   * Operates on a shallow copy (vin array and touched input objects are cloned)
   * so the cached body is never mutated. Resolution is:
   *  - skipped for coinbase inputs (no prevout exists);
   *  - de-duplicated by parent txid (a tx spending several outputs of one parent
   *    fetches that parent once);
   *  - bounded by {@link MAX_PREVOUT_LOOKUPS} distinct parents per request;
   *  - best-effort: any parent that fails to load leaves its inputs without a
   *    `prevout`, so the endpoint never fails because a prevout was unavailable.
   */
  private async enrichInputPrevouts(
    tx: VerboseTransaction | null,
    network: NetworkType,
    budget?: PrevoutLookupBudget,
  ): Promise<VerboseTransaction | null> {
    if (!tx || !Array.isArray(tx.vin)) {
      return tx
    }

    const vin = tx.vin

    // Collect the distinct parent txids we need (skipping coinbase inputs), in
    // first-seen order, capped so a pathological many-input tx cannot fan out
    // into an unbounded number of cold-cache RPC calls.
    const parentTxids: string[] = []
    const seen = new Set<string>()
    for (const input of vin) {
      if (typeof input.coinbase === 'string') continue
      const parentTxid = input.txid
      if (!parentTxid || parentTxid === ZERO_HASH || seen.has(parentTxid)) continue
      seen.add(parentTxid)
      const aggregateRemaining = budget?.remaining ?? MAX_PREVOUT_LOOKUPS
      if (parentTxids.length >= MAX_PREVOUT_LOOKUPS || parentTxids.length >= aggregateRemaining) break
      parentTxids.push(parentTxid)
    }

    if (parentTxids.length === 0) {
      return tx
    }

    if (budget) {
      budget.remaining = Math.max(0, budget.remaining - parentTxids.length)
    }

    // Fetch every needed parent transaction once, in parallel. A failed lookup
    // resolves to null and simply yields no prevout for the affected inputs.
    const parents = new Map<string, RawVout[] | null>()
    await Promise.all(
      parentTxids.map(async (parentTxid) => {
        try {
          const parent = await this.get<{ vout?: RawVout[] }>(
            'getrawtransaction',
            [parentTxid, true],
            { network, ttl: CONFIRMED_TX_TTL_SECONDS },
          )
          parents.set(parentTxid, Array.isArray(parent?.vout) ? parent.vout : null)
        } catch (error) {
          logger.error(`Error resolving prevout parent ${parentTxid}:`, error)
          parents.set(parentTxid, null)
        }
      }),
    )

    // Clone only the inputs we annotate; leave coinbase/unresolved inputs as-is.
    const enrichedVin = vin.map((input) => {
      if (typeof input.coinbase === 'string') return input
      const parentTxid = input.txid
      if (!parentTxid) return input
      const parentVout = parents.get(parentTxid)
      if (!parentVout) return input

      const spent = parentVout.find((out) => out.n === input.vout)
      if (!spent || typeof spent.value !== 'number') return input

      const prevout: ResolvedPrevout = { value: spent.value }
      const addresses = spent.scriptPubKey?.addresses
      if (Array.isArray(addresses) && addresses.length > 0) {
        prevout.addresses = addresses
      }
      if (typeof spent.scriptPubKey?.type === 'string') {
        prevout.type = spent.scriptPubKey.type
      }

      return { ...input, prevout }
    })

    return { ...tx, vin: enrichedVin }
  }

  /**
   * Read-side self-heal for poisoned tx cache entries.
   *
   * A cached tx whose body has no `blockhash` was stored while the tx was in the
   * mempool. Such an entry is only trustworthy briefly: a genuinely confirmed tx
   * always comes back from RPC with a `blockhash`, so any unconfirmed body older
   * than {@link UNCONFIRMED_TX_TTL_SECONDS} must be re-fetched — regardless of its
   * stored TTL. This immediately heals entries written before the short-TTL fix
   * (which were saved with `ttl: 3600`) and still serves real mempool txs from
   * cache for up to the short window (no infinite refetch).
   *
   * Confirmed entries (with a `blockhash`) are never considered stale here; their
   * volatile `confirmations` is recomputed live in {@link withLiveConfirmations}.
   */
  private isStaleUnconfirmed(cached: {
    data?: unknown
    timestamp?: number
  }): boolean {
    const data = cached.data as { blockhash?: string } | undefined
    if (data?.blockhash) {
      return false
    }
    const age = Date.now() - (cached.timestamp ?? 0)
    return age > UNCONFIRMED_TX_TTL_SECONDS * 1000
  }

  /**
   * Overlay live confirmation state onto a (possibly long-cached) verbose tx.
   * Returns a shallow copy so the cached object is never mutated in place.
   *
   *  - Unconfirmed (no `blockhash`): `confirmations` is 0 and block fields stay null.
   *  - Confirmed: `confirmations = currentHeight - blockheight + 1`, computed from
   *    the 30s-cached block height, clamped to at least 1.
   */
  private async withLiveConfirmations(
    tx: VerboseTransaction | null,
    network: NetworkType,
  ): Promise<VerboseTransaction | null> {
    if (!tx) {
      return tx
    }

    if (!tx.blockhash) {
      return { ...tx, confirmations: 0 }
    }

    // Prefer the height persisted at fetch time; tolerate a `height` alias; as a
    // last resort resolve it from the blockhash (covers bodies cached before the
    // height was persisted). FairCoin's verbose tx itself carries no height.
    let blockheight = typeof tx.blockheight === 'number' ? tx.blockheight : tx.height
    if (typeof blockheight !== 'number') {
      const resolved = await this.resolveBlockHeight(tx.blockhash, network)
      if (resolved !== null) {
        blockheight = resolved
      }
    }

    if (typeof blockheight !== 'number') {
      // Confirmed but height unresolvable: fall back to the daemon's own count
      // rather than inventing one.
      return { ...tx, confirmations: typeof tx.confirmations === 'number' ? tx.confirmations : 1 }
    }

    let currentHeight = 0
    try {
      currentHeight = await this.getBlockCount(network)
    } catch (error) {
      logger.error('Error fetching block height for live confirmations:', error)
      return { ...tx, blockheight, confirmations: typeof tx.confirmations === 'number' ? tx.confirmations : 1 }
    }

    const confirmations = Math.max(currentHeight - blockheight + 1, 1)
    return { ...tx, blockheight, confirmations }
  }

  /**
   * Resolve a block's height from its hash via the long-cached `getblock`.
   * Returns null if the block cannot be fetched. Used to derive a confirmed
   * transaction's height, since FairCoin's verbose `getrawtransaction` omits it.
   */
  private async resolveBlockHeight(blockhash: string, network: NetworkType): Promise<number | null> {
    try {
      const block = await this.getBlock(blockhash, network, true)
      return typeof block?.height === 'number' ? block.height : null
    } catch (error) {
      logger.error(`Error resolving height for block ${blockhash}:`, error)
      return null
    }
  }

  async getBlockCount(network: NetworkType) {
    return await this.get<number>('getblockcount', [], { network, ttl: 30 }) // 30 seconds for block count
  }

  async getNetworkInfo(network: NetworkType) {
    return await this.get<NetworkInfoResult>('getnetworkinfo', [], { network, ttl: 300 }) // 5 minutes for network info
  }

  async getMiningInfo(network: NetworkType) {
    return await this.get<MiningInfoResult>('getmininginfo', [], { network, ttl: 60 }) // 1 minute for mining info
  }

  async validateAddress(address: string, network: NetworkType) {
    const validation = await this.get<AddressValidationResult>('validateaddress', [address], {
      network,
      ttl: 86400,
    }) // 24 hours for address validation
    return sanitizeAddressValidation(validation)
  }

  /**
   * Full masternode list as an array of
   * `{ rank, txhash, outidx, status, addr, version, lastseen, activetime, lastpaid }`.
   *
   * IMPORTANT: FairCoin's `masternodelist` takes an optional search FILTER
   * (partial match on txhash/status/addr) as its first positional arg — NOT a
   * Dash-style mode. Passing `'full'` is interpreted as a filter that matches no
   * node and returns an empty array. We therefore call it with no filter to get
   * every masternode. A caller-supplied `filter` is forwarded only when non-empty.
   *
   * Prefer {@link getMasternodeCount} for stats-only consumers; this list RPC is
   * reserved for callers that need per-node rows (`?include=list`, MCP, etc.).
   */
  async getMasternodeList(network: NetworkType, filter: string = ''): Promise<MasternodeListEntry[]> {
    const params: RpcParam[] = filter ? [filter] : []
    return this.get<MasternodeListEntry[]>('masternodelist', params, { network, ttl: 600 }) // 10 min TTL
  }

  /**
   * Cheap masternode tally via the `masternode count` RPC, which returns
   * `{ total, enabled, ... }` directly from the in-memory masternode manager.
   *
   * This is what /api/stats and the default /api/masternodes path use: it is
   * effectively free and never touches the heavier `masternodelist` array.
   */
  async getMasternodeCount(network: NetworkType): Promise<MasternodeCount | null> {
    try {
      return await this.get<MasternodeCount>('masternode', ['count'], { network, ttl: 60 })
    } catch (error) {
      // `masternode count` is unavailable on this node/network.
      logger.debug(`masternode count unavailable on ${network}:`, error)
      return null
    }
  }

  async getMempoolInfo(network: NetworkType): Promise<MempoolInfoResult> {
    return this.get<MempoolInfoResult>('getmempoolinfo', [], { network, ttl: 60 }) // 1 minute TTL for mempool
  }

  async getStakingInfo(network: NetworkType): Promise<unknown> {
    try {
      return await this.get('getstakinginfo', [], { network, ttl: 300 })
    } catch (error) {
      // getstakinginfo does not exist on FairCoin v3.0.0 (PIVX-based)
      logger.debug(`getstakinginfo unavailable on ${network}:`, error)
      return null
    }
  }

  async getRawMempool(network: NetworkType): Promise<string[]> {
    return this.get<string[]>('getrawmempool', [], { network, ttl: 30 }) // 30 second TTL for mempool transactions
  }

  // Get recent blocks with caching
  async getRecentBlocks(network: NetworkType, limit: number = 20, offset: number = 0): Promise<RecentBlockSummary[]> {
    assertValidNetwork(network)
    const safeOffset = Math.min(MAX_BLOCK_OFFSET, Math.max(0, Math.floor(offset)))
    const safeLimit = Math.max(1, Math.floor(limit))
    const collection = await this.recentBlocksCollection()
    const cacheKey = `${network}:recent:${safeLimit}:${safeOffset}`

    // Check cache first
    const cached = await collection.findOne({ _id: cacheKey })
    if (cached && Date.now() - cached.timestamp < RECENT_BLOCKS_TTL_MS) {
      return cached.blocks
    }

    // Single-flight: dedupe concurrent misses for the same window so N parallel
    // requests don't each trigger up to `limit` RPC `getblock` calls.
    const existing = this.inFlight.get(cacheKey)
    if (existing) {
      return existing as Promise<RecentBlockSummary[]>
    }

    const fetchPromise = (async (): Promise<RecentBlockSummary[]> => {
      try {
        const height = await this.getBlockCount(network)
        const startHeight = Math.max(0, height - safeOffset)
        const heights: number[] = []
        for (let i = startHeight; i >= 0 && heights.length < safeLimit; i--) {
          heights.push(i)
        }

        // Bounded parallel fetch: fill the window without serial RPC round-trips
        // or an unbounded fan-out against the daemon.
        const fetched = await mapWithConcurrency(
          heights,
          RECENT_BLOCKS_CONCURRENCY,
          async (blockHeight) => {
            try {
              const block = await this.getBlock(blockHeight, network, true)
              const summary: RecentBlockSummary = {
                height: block.height,
                hash: block.hash,
                time: block.time,
                nTx: block.nTx || block.tx?.length || 0,
                size: block.size,
                tx: block.tx || [],
              }
              return summary
            } catch (error) {
              logger.error(`Error fetching block ${blockHeight}:`, error)
              return null
            }
          },
        )

        const blocks = fetched.filter((block): block is RecentBlockSummary => block !== null)

        // Cache the result. `expiresAt` powers the Mongo TTL index on recent_blocks.
        const cachedAt = Date.now()
        await collection.replaceOne(
          { _id: cacheKey },
          {
            blocks,
            timestamp: cachedAt,
            expiresAt: new Date(cachedAt + RECENT_BLOCKS_TTL_MS),
            network,
          },
          { upsert: true },
        )

        return blocks
      } finally {
        this.inFlight.delete(cacheKey)
      }
    })()

    this.inFlight.set(cacheKey, fetchPromise)
    return await fetchPromise
  }
}

// Singleton instances
export const blockchainCache = new BlockchainCache()
export const blockCache = new BlockCache()

// Auto cleanup expired entries every hour
if (typeof global !== 'undefined') {
  setInterval(() => {
    blockchainCache.clearExpired().catch((error: unknown) => {
      logger.error('Failed to clear expired cache entries:', error)
    })
  }, 3600000) // 1 hour
}
