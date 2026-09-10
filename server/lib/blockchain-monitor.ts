// Blockchain Monitor Service for FairCoin Explorer
// Polls RPC endpoints and broadcasts changes via WebSocket

import { rpcWithNetwork } from '@fairco.in/rpc-client'
import { WebSocketManager } from './websocket-manager'
import {
  NetworkType,
  NetworkState,
  BlockchainMonitorConfig,
  NewBlockEvent,
  BlockCountEvent,
  MempoolUpdateEvent,
  MempoolTransaction,
  NetworkStatsEvent,
  TransactionConfirmedEvent,
} from '../../shared/websocket-types'
import { blockCache } from './cache'
import { logger } from './logger'
import { matchBlock, type ParsedBlockTx } from './notifications/matcher'
import type { PushDispatcher } from './push/types'

/** Default block/mempool poll interval (ms). Overridable via BLOCKCHAIN_POLL_INTERVAL. */
const DEFAULT_POLL_INTERVAL_MS = 4000

/** Cap on `transaction-confirmed` events emitted per new block. */
const TRANSACTION_CONFIRMED_CAP = 50

/** Cap on transactions scanned per block/mempool batch for notification matching. */
const NOTIFICATION_TX_SCAN_CAP = 500

/** Top-N mempool txs included in `mempool-update` (aligned with GET /api/mempool). */
const MEMPOOL_TX_SUMMARY_LIMIT = 20

interface MempoolInfoRpc {
  size?: number
  bytes?: number
  usage?: number
  maxmempool?: number
  mempoolminfee?: number
}

interface MempoolEntryRpc {
  size?: number
  fee?: number
  ancestorfees?: number
  ancestorsize?: number
  time?: number
  depends?: unknown
}

function mempoolTransactionFromEntry(txid: string, entry: MempoolEntryRpc | null): MempoolTransaction {
  if (!entry) {
    // Entry can disappear between getrawmempool and getmempoolentry.
    return {
      txid,
      size: 0,
      fee: 0,
      feeRate: 0,
      time: Date.now() / 1000,
      depends: [],
    }
  }

  const ancestorfees = Number(entry.ancestorfees ?? 0)
  const ancestorsize = Number(entry.ancestorsize ?? 0)

  return {
    txid,
    size: Number(entry.size ?? 0),
    fee: Number(entry.fee ?? 0),
    feeRate: ancestorfees && ancestorsize ? ancestorfees / ancestorsize : 0,
    time: Number(entry.time ?? Date.now() / 1000),
    depends: Array.isArray(entry.depends) ? entry.depends.map(String) : [],
  }
}

export class BlockchainMonitor {
  private wsManager: WebSocketManager
  private networkStates: Map<NetworkType, NetworkState>
  private pollInterval: NodeJS.Timeout | null = null
  private statsInterval: NodeJS.Timeout | null = null
  private config: BlockchainMonitorConfig
  private isRunning: boolean = false
  /** Last broadcast `network-stats` identity fields (not on NetworkState). */
  private lastBroadcastVersion = new Map<NetworkType, string>()
  private lastBroadcastSubversion = new Map<NetworkType, string | undefined>()
  private lastBroadcastProtocol = new Map<NetworkType, number | undefined>()
  /**
   * Silent-push dispatcher for background payment notifications. Null (and the
   * whole notification path inert) until wired at startup with FCM/APNS creds —
   * Phase-1-safe: no creds → no dispatcher → no matching, no RPC overhead.
   */
  private notificationDispatcher: PushDispatcher | null = null
  /** Mempool txids already notified as first-seen (per network), so a lingering tx notifies once. */
  private notifiedMempoolTxids = new Map<NetworkType, Set<string>>()

  constructor(wsManager: WebSocketManager, config?: Partial<BlockchainMonitorConfig>) {
    this.wsManager = wsManager

    this.config = {
      pollInterval:
        config?.pollInterval ??
        parseInt(process.env.BLOCKCHAIN_POLL_INTERVAL || String(DEFAULT_POLL_INTERVAL_MS), 10),
      networks: config?.networks ?? ['mainnet', 'testnet'],
      enabled: config?.enabled ?? (process.env.WEBSOCKET_ENABLED !== 'false'),
    }

    this.networkStates = new Map()

    this.config.networks.forEach(network => {
      this.networkStates.set(network, {
        network,
        blockHeight: 0,
        blockHash: '',
        mempoolSize: 0,
        mempoolBytes: 0,
        connections: 0,
        difficulty: 0,
        hashrate: '0',
        lastUpdate: new Date(),
      })
    })

    logger.debug('[BlockchainMonitor] Initialized with config:', this.config)
  }

  /**
   * Wire (or clear) the silent-push dispatcher. Called at startup only when
   * FCM/APNS credentials are configured; while null the notification path is a
   * complete no-op.
   */
  setNotificationDispatcher(dispatch: PushDispatcher | null): void {
    this.notificationDispatcher = dispatch
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.debug('[BlockchainMonitor] Already running')
      return
    }

    if (!this.config.enabled) {
      logger.debug('[BlockchainMonitor] WebSocket disabled, not starting')
      return
    }

    logger.debug('[BlockchainMonitor] Starting monitor...')
    this.isRunning = true

    for (const network of this.config.networks) {
      await this.initializeNetworkState(network)
    }

    this.pollInterval = setInterval(() => {
      void this.pollAllNetworks()
    }, this.config.pollInterval)

    this.statsInterval = setInterval(() => {
      void this.pollNetworkStats()
    }, 30000)

    await this.pollAllNetworks()
    await this.pollNetworkStats()

    logger.info(
      `[BlockchainMonitor] Monitor started (pollInterval=${this.config.pollInterval}ms)`,
    )
  }

  stop(): void {
    if (!this.isRunning) {
      return
    }

    logger.debug('[BlockchainMonitor] Stopping monitor...')
    this.isRunning = false

    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }

    if (this.statsInterval) {
      clearInterval(this.statsInterval)
      this.statsInterval = null
    }

    logger.info('[BlockchainMonitor] Monitor stopped')
  }

  private async initializeNetworkState(network: NetworkType): Promise<void> {
    try {
      logger.debug(`[BlockchainMonitor] Initializing ${network} state...`)

      const blockCount = await rpcWithNetwork<number>('getblockcount', [], network)
      const block = await blockCache.getBlock(blockCount, network, true)
      const mempoolInfo = await rpcWithNetwork<MempoolInfoRpc>('getmempoolinfo', [], network)

      const state = this.networkStates.get(network)
      if (state) {
        state.blockHeight = blockCount
        state.blockHash = block.hash
        state.mempoolSize = mempoolInfo.size ?? 0
        state.mempoolBytes = mempoolInfo.bytes ?? 0
        state.lastUpdate = new Date()
      }

      logger.debug(`[BlockchainMonitor] ${network} initialized: Block ${blockCount}`)
    } catch (error) {
      logger.error(`[BlockchainMonitor] Error initializing ${network}:`, error)
    }
  }

  private async pollAllNetworks(): Promise<void> {
    for (const network of this.config.networks) {
      await this.pollNetwork(network)
    }
  }

  private async pollNetwork(network: NetworkType): Promise<void> {
    try {
      const state = this.networkStates.get(network)
      if (!state) {
        return
      }

      // Live RPC for change detection — do not use the HTTP response cache here.
      const newBlockCount = await rpcWithNetwork<number>('getblockcount', [], network)

      if (newBlockCount > state.blockHeight) {
        logger.debug(
          `[BlockchainMonitor] ${network}: New blocks detected (${state.blockHeight} -> ${newBlockCount})`,
        )

        for (let height = state.blockHeight + 1; height <= newBlockCount; height++) {
          await this.handleNewBlock(network, height)
        }

        const previousHeight = state.blockHeight
        state.blockHeight = newBlockCount

        const blockCountEvent: BlockCountEvent = {
          type: 'block-count',
          network,
          timestamp: Date.now(),
          data: {
            height: newBlockCount,
            previousHeight,
          },
        }
        this.wsManager.broadcast(blockCountEvent, network)
      }

      await this.pollMempool(network)

      state.lastUpdate = new Date()
    } catch (error) {
      logger.error(`[BlockchainMonitor] Error polling ${network}:`, error)
    }
  }

  private async handleNewBlock(network: NetworkType, height: number): Promise<void> {
    try {
      const block = await blockCache.getBlock(height, network, true)

      const state = this.networkStates.get(network)
      if (state) {
        state.blockHash = block.hash
      }

      const txids = Array.isArray(block.tx)
        ? block.tx.filter((entry): entry is string => typeof entry === 'string')
        : []

      logger.debug(
        `[BlockchainMonitor] ${network}: Broadcasting new block ${height} (${block.hash})`,
      )

      const newBlockEvent: NewBlockEvent = {
        type: 'new-block',
        network,
        timestamp: Date.now(),
        data: {
          hash: block.hash,
          height: block.height,
          time: block.time,
          nTx: block.nTx || txids.length,
          size: block.size,
          difficulty: block.difficulty ?? 0,
          tx: txids,
          previousblockhash: block.previousblockhash,
          nextblockhash: block.nextblockhash,
        },
      }
      this.wsManager.broadcast(newBlockEvent, network)

      for (const txid of txids.slice(0, TRANSACTION_CONFIRMED_CAP)) {
        const confirmedEvent: TransactionConfirmedEvent = {
          type: 'transaction-confirmed',
          network,
          timestamp: Date.now(),
          data: {
            txid,
            blockHeight: block.height,
            blockHash: block.hash,
            confirmations: 1,
          },
        }
        this.wsManager.broadcast(confirmedEvent, network)
      }

      // Background payment notifications: match this mined block's txs against
      // watched addresses and dispatch silent pushes. Isolated below so an RPC or
      // DB hiccup never disrupts block broadcasting.
      if (this.notificationDispatcher) {
        await this.notifyBlockMatches(network, txids)
      }
    } catch (error) {
      logger.error(
        `[BlockchainMonitor] Error handling new block ${height} on ${network}:`,
        error,
      )
    }
  }

  /**
   * Reduce transactions to the address facts the matcher needs. Fetches each
   * verbose tx (output addresses + resolved input prevout addresses), bounded by
   * {@link NOTIFICATION_TX_SCAN_CAP}. Best-effort: a tx that fails to load is
   * skipped rather than aborting the batch.
   */
  private async buildParsedTxs(network: NetworkType, txids: string[]): Promise<ParsedBlockTx[]> {
    const capped = txids.slice(0, NOTIFICATION_TX_SCAN_CAP)
    if (txids.length > NOTIFICATION_TX_SCAN_CAP) {
      logger.warn(
        `[BlockchainMonitor] ${network}: ${txids.length} txs exceed notification scan cap ${NOTIFICATION_TX_SCAN_CAP}; tail unscanned`,
      )
    }

    const parsed: ParsedBlockTx[] = []
    for (const txid of capped) {
      try {
        const tx = await blockCache.getTransaction(txid, network, true)
        if (!tx) {
          continue
        }
        const outputAddresses: string[] = []
        for (const out of tx.vout ?? []) {
          for (const address of out.scriptPubKey?.addresses ?? []) {
            outputAddresses.push(address)
          }
        }
        const inputAddresses: string[] = []
        for (const input of tx.vin ?? []) {
          for (const address of input.prevout?.addresses ?? []) {
            inputAddresses.push(address)
          }
        }
        parsed.push({ txid, outputAddresses, inputAddresses })
      } catch (error) {
        logger.debug(`[BlockchainMonitor] notification tx fetch failed for ${txid}:`, error)
      }
    }
    return parsed
  }

  /** Match a mined block (depth 1) against watched addresses and dispatch pushes. */
  private async notifyBlockMatches(network: NetworkType, txids: string[]): Promise<void> {
    const dispatch = this.notificationDispatcher
    if (!dispatch) {
      return
    }
    try {
      const parsed = await this.buildParsedTxs(network, txids)
      if (parsed.length === 0) {
        return
      }
      await matchBlock({ network, depth: 1, txs: parsed }, { dispatch })
    } catch (error) {
      logger.error(`[BlockchainMonitor] notification match failed on ${network}:`, error)
    }
  }

  /**
   * Match newly-seen mempool transactions (depth 0) for first-seen
   * `incoming_pending` alerts. Dedupes against txids already notified while they
   * linger in the mempool, and prunes that set as txids leave.
   */
  private async notifyMempoolMatches(network: NetworkType, rawMempool: string[]): Promise<void> {
    const dispatch = this.notificationDispatcher
    if (!dispatch) {
      return
    }
    try {
      const notified = this.notifiedMempoolTxids.get(network) ?? new Set<string>()
      const fresh = rawMempool.filter((txid) => !notified.has(txid))
      if (fresh.length > 0) {
        const parsed = await this.buildParsedTxs(network, fresh)
        if (parsed.length > 0) {
          await matchBlock({ network, depth: 0, txs: parsed }, { dispatch })
        }
        for (const txid of fresh) {
          notified.add(txid)
        }
      }
      // Prune txids that have left the mempool so the set stays bounded.
      const inMempool = new Set(rawMempool)
      for (const txid of notified) {
        if (!inMempool.has(txid)) {
          notified.delete(txid)
        }
      }
      this.notifiedMempoolTxids.set(network, notified)
    } catch (error) {
      logger.error(`[BlockchainMonitor] mempool notification match failed on ${network}:`, error)
    }
  }

  /**
   * Top-N mempool summary — same fields and limit as GET /api/mempool.
   */
  private async fetchMempoolTransactionSummary(
    network: NetworkType,
  ): Promise<MempoolTransaction[]> {
    let rawMempool: string[]
    try {
      rawMempool = await rpcWithNetwork<string[]>('getrawmempool', [], network)
    } catch (error) {
      logger.error(`[BlockchainMonitor] getrawmempool failed for ${network}:`, error)
      return []
    }

    const detailedTxs: MempoolTransaction[] = []
    for (const txid of rawMempool.slice(0, MEMPOOL_TX_SUMMARY_LIMIT)) {
      try {
        const entry = await rpcWithNetwork<MempoolEntryRpc>('getmempoolentry', [txid], network)
        detailedTxs.push(mempoolTransactionFromEntry(txid, entry))
      } catch (error) {
        logger.debug(
          `[BlockchainMonitor] getmempoolentry failed for ${txid} on ${network}:`,
          error,
        )
        detailedTxs.push(mempoolTransactionFromEntry(txid, null))
      }
    }

    return detailedTxs
  }

  private async pollMempool(network: NetworkType): Promise<void> {
    try {
      const state = this.networkStates.get(network)
      if (!state) {
        return
      }

      const mempoolInfo = await rpcWithNetwork<MempoolInfoRpc>('getmempoolinfo', [], network)
      const size = mempoolInfo.size ?? 0
      const bytes = mempoolInfo.bytes ?? 0
      const usage = mempoolInfo.usage ?? 0
      const maxmempool = mempoolInfo.maxmempool ?? 0
      const mempoolminfee = mempoolInfo.mempoolminfee ?? 0

      if (size !== state.mempoolSize || bytes !== state.mempoolBytes) {
        logger.debug(
          `[BlockchainMonitor] ${network}: Mempool changed (${state.mempoolSize} -> ${size} tx)`,
        )

        state.mempoolSize = size
        state.mempoolBytes = bytes

        const transactions = await this.fetchMempoolTransactionSummary(network)

        const mempoolEvent: MempoolUpdateEvent = {
          type: 'mempool-update',
          network,
          timestamp: Date.now(),
          data: {
            size,
            bytes,
            usage,
            maxmempool,
            mempoolminfee,
            transactions,
          },
        }
        this.wsManager.broadcast(mempoolEvent, network)

        // First-seen payment notifications from the mempool (depth 0).
        if (this.notificationDispatcher) {
          const rawMempool = await rpcWithNetwork<string[]>('getrawmempool', [], network).catch(
            () => [] as string[],
          )
          await this.notifyMempoolMatches(network, rawMempool)
        }
      }
    } catch (error) {
      logger.error(`[BlockchainMonitor] Error polling mempool for ${network}:`, error)
    }
  }

  private async pollNetworkStats(): Promise<void> {
    for (const network of this.config.networks) {
      await this.pollNetworkStatsForNetwork(network)
    }
  }

  private async pollNetworkStatsForNetwork(network: NetworkType): Promise<void> {
    try {
      const state = this.networkStates.get(network)
      if (!state) {
        return
      }

      const [networkInfo, miningInfo] = await Promise.all([
        blockCache.getNetworkInfo(network).catch((error: unknown) => {
          logger.debug(`[BlockchainMonitor] getNetworkInfo failed for ${network}:`, error)
          return null
        }),
        blockCache.getMiningInfo(network).catch((error: unknown) => {
          logger.debug(`[BlockchainMonitor] getMiningInfo failed for ${network}:`, error)
          return null
        }),
      ])

      if (!networkInfo && !miningInfo) {
        return
      }

      const connections = networkInfo?.connections ?? state.connections
      const difficulty = miningInfo?.difficulty ?? state.difficulty
      const rawHashrate = miningInfo?.networkhashps ?? miningInfo?.hashrate ?? state.hashrate
      const hashrate = typeof rawHashrate === 'string' ? rawHashrate : String(rawHashrate ?? '0')
      const version =
        networkInfo?.version !== undefined && networkInfo?.version !== null
          ? String(networkInfo.version)
          : 'Unknown'
      const subversion = networkInfo?.subversion
      const protocolversion = networkInfo?.protocolversion

      const unchanged =
        connections === state.connections &&
        difficulty === state.difficulty &&
        hashrate === state.hashrate &&
        version === this.lastBroadcastVersion.get(network) &&
        subversion === this.lastBroadcastSubversion.get(network) &&
        protocolversion === this.lastBroadcastProtocol.get(network)

      state.connections = connections
      state.difficulty = difficulty
      state.hashrate = hashrate

      if (unchanged) {
        logger.debug(`[BlockchainMonitor] ${network}: network stats unchanged, skip broadcast`)
        return
      }

      this.lastBroadcastVersion.set(network, version)
      this.lastBroadcastSubversion.set(network, subversion)
      this.lastBroadcastProtocol.set(network, protocolversion)

      const statsEvent: NetworkStatsEvent = {
        type: 'network-stats',
        network,
        timestamp: Date.now(),
        data: {
          connections,
          difficulty,
          hashrate,
          version,
          subversion,
          protocolversion,
        },
      }
      this.wsManager.broadcast(statsEvent, network)

      logger.debug(`[BlockchainMonitor] ${network}: Broadcasted network stats update`)
    } catch (error) {
      logger.error(`[BlockchainMonitor] Error polling network stats for ${network}:`, error)
    }
  }

  getNetworkState(network: NetworkType): NetworkState | undefined {
    return this.networkStates.get(network)
  }

  getAllNetworkStates(): Map<NetworkType, NetworkState> {
    return new Map(this.networkStates)
  }

  isMonitorRunning(): boolean {
    return this.isRunning
  }
}

let monitorInstance: BlockchainMonitor | null = null

export function getBlockchainMonitor(
  wsManager: WebSocketManager,
  config?: Partial<BlockchainMonitorConfig>,
): BlockchainMonitor {
  if (!monitorInstance) {
    monitorInstance = new BlockchainMonitor(wsManager, config)
  }
  return monitorInstance
}

export function shutdownBlockchainMonitor(): void {
  if (monitorInstance) {
    monitorInstance.stop()
    monitorInstance = null
  }
}
