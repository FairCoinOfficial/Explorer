import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import { createServer } from 'http'
import { parse } from 'url'
import { WebSocketServer } from 'ws'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { blockCache } from './lib/cache'
import { handleRouteError, parseNetwork, parseLimit, parseOffset, parseBlockOffset, ValidationError } from './lib/http'
import { computeCirculatingSupply, currentBlockReward } from './lib/supply'
import { rpcWithNetwork } from '@fairco.in/rpc-client'
import priceRouter from './routes/price'
import statsHistoryRouter from './routes/stats-history'
import addressRouter from './routes/address'
import broadcastRouter from './routes/broadcast'
import feeEstimateRouter from './routes/fee-estimate'
import githubRouter from './routes/github'
import mcpInfoRouter from './routes/mcp-info'
import { createMcpPostHandler, handleMcpMethodNotAllowed, handleMcpOptions } from './mcp/http'
import packageJson from '../package.json' with { type: 'json' }

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = parseInt(process.env.PORT || '8080', 10)

// Behind one reverse proxy (e.g. nginx/DO app platform): trust a single hop so
// `req.ip` and the rate limiter use the real client IP, not a spoofable header.
// The same hop count is used to resolve the WebSocket client IP (see resolveClientIp).
const TRUST_PROXY_HOPS = 1
app.set('trust proxy', TRUST_PROXY_HOPS)

// ---- Security & performance middleware ----

const DEFAULT_PUBLIC_ORIGIN = 'https://explorer.fairco.in'
const CORS_ALLOWLIST = [
  process.env.PUBLIC_BASE_URL || DEFAULT_PUBLIC_ORIGIN,
  'http://localhost:5180',
  'http://localhost:5173',
]

// Global API rate limit and a stricter one for sensitive/expensive endpoints.
// The read-only GET endpoints are cached (low backend cost) and the explorer
// frontend polls several of them every 30s, so an active user — or several
// behind a shared/NAT IP — legitimately makes a few hundred requests per
// window. Keep the global cap generous enough to never throttle real usage
// while still bounding raw floods; node-hitting endpoints get the strict cap.
const GLOBAL_RATE_WINDOW_MS = 15 * 60 * 1000
const GLOBAL_RATE_MAX = 1500
const STRICT_RATE_MAX = 60

const globalLimiter = rateLimit({
  windowMs: GLOBAL_RATE_WINDOW_MS,
  max: GLOBAL_RATE_MAX,
  standardHeaders: true,
  legacyHeaders: false,
})

const strictLimiter = rateLimit({
  windowMs: GLOBAL_RATE_WINDOW_MS,
  max: STRICT_RATE_MAX,
  standardHeaders: true,
  legacyHeaders: false,
})

// helmet's default CSP is strict (`default-src 'self'`, `script-src 'self'`, and
// no `connect-src`). Two adjustments for this SPA, keeping every other default:
//  - connect-src: allow the client-side Base L2 RPC origins (viem, see
//    src/lib/base-client.ts) used for WFAIR chain data. `'self'` already covers
//    same-origin /api requests and the same-origin `/api/ws` WebSocket; the
//    bridge reserves call is same-origin (proxied) so that host is omitted.
//  - script-src: index.html ships two small static inline scripts (theme/FOUC
//    init + stale-service-worker cleanup). Allow them by their sha256 hashes so
//    script-src stays strict with NO 'unsafe-inline'. Update these hashes if the
//    inline <script> blocks in index.html ever change.
const BASE_RPC_ORIGINS = ['https://mainnet.base.org', 'https://base.llamarpc.com']
const INLINE_SCRIPT_HASHES = [
  "'sha256-FjIFuDzKeMu5Q5hBXRiAasoY+iWnGizSt08R6+PPtKE='",
  "'sha256-Y3tjE3tP/HuXab807guUsN6AXkpNv5KDg4H2vDEiQE4='",
]

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        connectSrc: ["'self'", ...BASE_RPC_ORIGINS],
        scriptSrc: ["'self'", ...INLINE_SCRIPT_HASHES],
      },
    },
  }),
)
app.use(compression())

// Resolve dist directory - try multiple possible locations
const DIST_CANDIDATES = [
  path.resolve(__dirname, '..', 'dist'),
  path.resolve(process.cwd(), 'dist'),
  '/workspace/dist',
]
const DIST_DIR = DIST_CANDIDATES.find(d => fs.existsSync(d)) ?? path.resolve(process.cwd(), 'dist')
console.log(`> Static files from: ${DIST_DIR} (exists: ${fs.existsSync(DIST_DIR)})`)

app.use(cors({ origin: CORS_ALLOWLIST }))
app.use(express.json({ limit: '64kb' }))

// Apply the global rate limit to the API surface only (static assets are exempt).
app.use('/api', globalLimiter)

// Stricter limits on the expensive search path, broadcast write path, and
// public MCP endpoint, which can invoke daemon-backed wallet tools.
app.use('/api/search', strictLimiter)
app.use('/api/tx/broadcast', strictLimiter)

// ---- API Routes ----

app.get('/api/blocks', async (req, res) => {
  try {
    const network = parseNetwork(req.query.network)
    const limit = parseLimit(req.query.limit)
    const offset = parseBlockOffset(req.query.offset)
    const [blocks, height] = await Promise.all([
      blockCache.getRecentBlocks(network, limit, offset),
      blockCache.getBlockCount(network),
    ])
    res.json({
      blocks,
      height,
      total: height + 1, // genesis + all blocks
      offset,
      limit,
      network,
    })
  } catch (error) {
    handleRouteError(res, 'Error fetching blocks', error)
  }
})

app.get('/api/blockcount', async (req, res) => {
  try {
    const network = parseNetwork(req.query.network)
    const blockcount = await blockCache.getBlockCount(network)
    res.json({ blockcount, network })
  } catch (error) {
    handleRouteError(res, 'Error getting block count', error)
  }
})

app.get('/api/block/:hashOrHeight', async (req, res) => {
  try {
    const network = parseNetwork(req.query.network)
    const { hashOrHeight } = req.params
    const block = await blockCache.getBlock(hashOrHeight, network, true)
    res.json({ block, network })
  } catch (error) {
    handleRouteError(res, 'Error fetching block', error)
  }
})

app.get('/api/transaction/:txid', async (req, res) => {
  try {
    const network = parseNetwork(req.query.network)
    const { txid } = req.params
    const transaction = await blockCache.getTransaction(txid, network, true)
    res.json({ transaction, network })
  } catch (error) {
    handleRouteError(res, 'Error fetching transaction', error)
  }
})

// Address routes (addressindex RPC + fallback)
app.use('/api/address', addressRouter)

// Price routes (DB-defined prices with history)
app.use('/api/price', priceRouter)

// Stats history (sampled difficulty/connections/height series for home sparklines)
app.use('/api/stats/history', statsHistoryRouter)

// Broadcast route (send raw transactions)
app.use('/api/tx', broadcastRouter)

// Fee estimate route
app.use('/api/fee-estimate', feeEstimateRouter)

// GitHub route (latest release + star count, server-side cached)
app.use('/api/github', githubRouter)

// MCP server metadata (endpoint + transport + tool catalog) for the /tools/mcp page
app.use('/api/mcp/info', mcpInfoRouter)

app.get('/api/mempool', async (req, res) => {
  try {
    const network = parseNetwork(req.query.network)
    const [mempoolInfo, rawMempool] = await Promise.all([
      rpcWithNetwork<Record<string, unknown>>('getmempoolinfo', [], network).catch(() => null),
      rpcWithNetwork<string[]>('getrawmempool', [], network).catch(() => [])
    ])

    const recentTxs = rawMempool.slice(0, 20)
    const detailedTxs = []
    for (const txid of recentTxs) {
      try {
        const entry = await rpcWithNetwork<Record<string, unknown>>('getmempoolentry', [txid], network)
        detailedTxs.push({
          txid, size: Number(entry.size ?? 0), fee: Number(entry.fee ?? 0),
          feeRate: entry.ancestorfees && entry.ancestorsize ? Number(entry.ancestorfees) / Number(entry.ancestorsize) : 0,
          time: Number(entry.time ?? Date.now() / 1000), depends: (entry.depends as string[]) ?? []
        })
      } catch {
        // getmempoolentry can fail for a tx that just left the mempool; record
        // the txid with zeroed metrics rather than fabricated placeholder values.
        detailedTxs.push({ txid, size: 0, fee: 0, feeRate: 0, time: Date.now() / 1000, depends: [] })
      }
    }

    const formattedMempoolInfo = {
      size: rawMempool.length, bytes: Number(mempoolInfo?.bytes ?? rawMempool.length * 250), transactions: detailedTxs
    }
    res.json({ mempoolInfo: formattedMempoolInfo, network })
  } catch (error) {
    handleRouteError(res, 'Error fetching mempool info', error)
  }
})

// FairCoin v3.0.0 block-reward split. Source: FairCoin/src/main.cpp
// `GetMasternodePayment` returns `blockValue / 2`, i.e. masternodes get 50% and
// the staker keeps the other 50%; there is no budget allocation.
const MASTERNODE_REWARD_PERCENT = 50
const STAKING_REWARD_PERCENT = 50
const BUDGET_REWARD_PERCENT = 0

app.get('/api/masternodes', async (req, res) => {
  try {
    const network = parseNetwork(req.query.network)
    const limit = parseLimit(req.query.limit)
    const offset = parseOffset(req.query.offset)
    const COLLATERAL_PER_MASTERNODE = 5000

    const [masternodeList, masternodeCount, blockHeight] = await Promise.all([
      blockCache.getMasternodeList(network).catch(() => [] as unknown[]),
      blockCache.getMasternodeCount(network).catch(() => null),
      blockCache.getBlockCount(network).catch(() => 0),
    ])

    interface MasternodeEntry { txid: string; outidx: number; address: string; protocol: number; status: string; activeTime: number; lastSeen: number; lastPaid: number; rank: number }

    // FairCoin v3.0.5 `masternodelist` (default mode) returns an array of objects:
    // { rank, txhash, outidx, status, addr, version, lastseen, activetime, lastpaid }.
    function parseMasternodeEntry(data: unknown): MasternodeEntry {
      const obj = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>
      return {
        txid: String(obj.txhash ?? ''),
        outidx: Number(obj.outidx ?? 0),
        address: String(obj.addr ?? ''),
        protocol: Number(obj.version ?? 0),
        status: String(obj.status ?? 'UNKNOWN'),
        activeTime: Number(obj.activetime ?? 0),
        lastSeen: Number(obj.lastseen ?? 0),
        lastPaid: Number(obj.lastpaid ?? 0),
        rank: Number(obj.rank ?? 0),
      }
    }

    const masternodes = (Array.isArray(masternodeList) ? masternodeList : []).map(parseMasternodeEntry)
    // Real supply schedule (premine + halvings), not a naive height*reward guess.
    const totalSupply = computeCirculatingSupply(blockHeight)
    const totalCollateral = masternodes.length * COLLATERAL_PER_MASTERNODE
    const collateralPercentage = totalSupply > 0 ? (totalCollateral / totalSupply) * 100 : 0

    const statusCounts = masternodes.reduce((acc, mn) => { acc[mn.status] = (acc[mn.status] || 0) + 1; return acc }, {} as Record<string, number>)
    const enabledCount = masternodeCount?.enabled ?? statusCounts.ENABLED ?? 0
    const totalCount = masternodeCount?.total ?? masternodes.length

    const stats = {
      total: totalCount, enabled: enabledCount,
      preEnabled: statusCounts.PRE_ENABLED || 0, expired: statusCounts.EXPIRED || 0,
      newStartRequired: statusCounts.NEW_START_REQUIRED || 0, watchdogExpired: statusCounts.WATCHDOG_EXPIRED || 0,
      totalCollateral, collateralPercentage,
      averageActiveTime: masternodes.length > 0 ? masternodes.reduce((sum, mn) => sum + mn.activeTime, 0) / masternodes.length : 0,
      networkSecurity: { masternodeRewards: MASTERNODE_REWARD_PERCENT, stakingRewards: STAKING_REWARD_PERCENT, budgetRewards: BUDGET_REWARD_PERCENT }
    }

    // Sort by rank (active masternodes first) so pagination is stable and useful.
    masternodes.sort((a, b) => a.rank - b.rank)
    const total = masternodes.length
    const pageItems = masternodes.slice(offset, offset + limit)

    res.json({
      masternodes: pageItems,
      stats,
      network,
      pagination: { total, limit, offset },
    })
  } catch (error) {
    handleRouteError(res, 'Error fetching masternode data', error)
  }
})

app.get('/api/peers', async (req, res) => {
  try {
    const network = parseNetwork(req.query.network)
    interface PeerInfo { addr: string; version: number; subver: string; pingtime: number; conntime: number; startingheight: number; banscore: number; bytessent: number; bytesrecv: number; inbound: boolean; synced_headers: number; synced_blocks: number }
    const rawPeers = await rpcWithNetwork<PeerInfo[]>('getpeerinfo', [], network)
    const peers = rawPeers.map(p => ({
      addr: p.addr ?? '', version: p.version ?? 0, subver: p.subver ?? '', pingtime: p.pingtime ?? 0,
      conntime: p.conntime ?? 0, startingheight: p.startingheight ?? 0, banscore: p.banscore ?? 0,
      bytessent: p.bytessent ?? 0, bytesrecv: p.bytesrecv ?? 0, inbound: Boolean(p.inbound),
      synced_headers: p.synced_headers ?? 0, synced_blocks: p.synced_blocks ?? 0,
    }))
    res.json({ peers, network })
  } catch (error) {
    handleRouteError(res, 'Error fetching peer info', error)
  }
})

app.get('/api/stats', async (req, res) => {
  try {
    const network = parseNetwork(req.query.network)
    const [blockHeight, blockchainInfo, miningInfo, mempoolInfo, networkInfo, masternodeCountRpc] = await Promise.all([
      blockCache.getBlockCount(network).catch(() => 0),
      blockCache.get<Record<string, unknown>>('getblockchaininfo', [], { network, ttl: 300 }).catch(() => null),
      blockCache.getMiningInfo(network).catch(() => null),
      blockCache.getMempoolInfo(network).catch(() => null),
      blockCache.getNetworkInfo(network).catch(() => null),
      // Use the cheap `masternode count` RPC ({ total, enabled }); never the heavy
      // `masternodelist` full dump, which hangs and would stall this endpoint.
      blockCache.getMasternodeCount(network).catch(() => null)
    ])
    const latestBlock = blockHeight > 0 ? await blockCache.getBlock(blockHeight, network, true).catch(() => null) : null
    // Real supply schedule (premine + halvings), matching src/lib/supply.ts.
    const totalSupply = computeCirculatingSupply(blockHeight)
    // Report enabled (online) masternodes, falling back to total when the daemon
    // omits the enabled tally.
    const masternodeCount = masternodeCountRpc?.enabled ?? masternodeCountRpc?.total ?? 0
    const difficulty = miningInfo?.difficulty || 0
    // PoW phase: blocks 1-10000 on mainnet, 1-200 on testnet; PoS afterwards.
    const lastPowBlock = network === 'testnet' ? 200 : 10000
    const phase = blockHeight > lastPowBlock ? 'PoS' : 'PoW'
    const hashrate = phase === 'PoW' ? ((miningInfo as Record<string, number>)?.networkhashps || (difficulty as number) * Math.pow(2, 32) / 120) : 0

    // networkWeight / stakePercentage: FairCoin v3.0.0's daemon exposes no
    // network stake-weight figure — `getstakinginfo` does not exist on this build
    // (see BlockCache.getStakingInfo) and `getmininginfo` carries no
    // netstakeweight field. Reported as 0 rather than fabricated until a real RPC
    // source is available.
    const stats = {
      blockHeight, difficulty, hashrate, totalSupply, circulatingSupply: totalSupply,
      avgBlockTime: 120, memPoolSize: mempoolInfo?.size || 0,
      totalTransactions: blockHeight * (latestBlock?.nTx || 1), networkWeight: 0,
      avgTransactionsPerBlock: latestBlock?.nTx || 1, masternodeCount,
      stakingRewards: currentBlockReward(blockHeight), stakePercentage: 0,
      connections: networkInfo?.connections || 0, phase,
      lastBlock: { height: latestBlock?.height || blockHeight, hash: latestBlock?.hash || '', time: latestBlock?.time || Date.now() / 1000, size: latestBlock?.size || 0 }
    }
    res.json({ stats, network })
  } catch (error) {
    handleRouteError(res, 'Error fetching stats', error)
  }
})

app.get('/api/network-info', async (req, res) => {
  try {
    const network = parseNetwork(req.query.network)
    const networkInfo = await blockCache.getNetworkInfo(network)
    res.json(networkInfo)
  } catch (error) {
    handleRouteError(res, 'Failed to get network info', error)
  }
})

app.get('/api/mining-info', async (req, res) => {
  try {
    const network = parseNetwork(req.query.network)
    const miningInfo = await blockCache.getMiningInfo(network)
    res.json(miningInfo)
  } catch (error) {
    handleRouteError(res, 'Failed to get mining info', error)
  }
})

app.get('/api/validate-address', async (req, res) => {
  try {
    const address = req.query.address as string
    const network = parseNetwork(req.query.network)
    if (!address) { res.status(400).json({ error: 'Address parameter is required' }); return }
    const validation = await blockCache.validateAddress(address, network)
    res.json(validation)
  } catch (error) {
    handleRouteError(res, 'Failed to validate address', error)
  }
})

app.get('/api/search', async (req, res) => {
  try {
    const q = ((req.query.q as string) || '').trim()
    const network = parseNetwork(req.query.network)
    if (!q) { res.status(400).json({ error: 'No search query provided' }); return }

    let searchResults: Record<string, unknown> | null = null
    let searchType = 'unknown'

    if (/^\d+$/.test(q)) {
      searchType = 'block_height'
      try {
        const block = await blockCache.getBlock(parseInt(q), network, true)
        if (block) searchResults = { height: block.height, hash: block.hash, time: block.time, size: block.size, nTx: block.nTx || block.tx?.length || 0, tx: block.tx || [] }
      } catch { /* not found */ }
    } else if (/^[0-9a-fA-F]{64}$/i.test(q)) {
      try {
        const block = await blockCache.getBlock(q, network, true)
        if (block) { searchType = 'block_hash'; searchResults = { height: block.height, hash: block.hash, time: block.time, size: block.size, nTx: block.nTx || block.tx?.length || 0, tx: block.tx || [] } }
      } catch { /* not found */ }
      if (!searchResults) {
        try {
          const transaction = await blockCache.getTransaction(q, network, true)
          if (transaction) { searchType = 'transaction'; searchResults = { txid: transaction.txid, blockhash: transaction.blockhash, confirmations: transaction.confirmations, time: transaction.time, vin: transaction.vin || [], vout: transaction.vout || [] } }
        } catch { /* not found */ }
      }
    } else if (/^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{25,62}$/.test(q)) {
      searchType = 'address'
      // Validate against the daemon instead of blindly trusting the shape, and
      // enrich with addressindex data when the node exposes it.
      const validation = await blockCache.validateAddress(q, network).catch(() => null)
      const isValid = Boolean(validation?.isvalid)
      if (isValid) {
        const balanceRpc = await rpcWithNetwork<{ balance: number; received: number }>(
          'getaddressbalance',
          [{ addresses: [q] }],
          network,
        ).catch(() => null)
        const SATS = 100_000_000
        searchResults = {
          address: q,
          balance: balanceRpc ? balanceRpc.balance / SATS : 0,
          totalReceived: balanceRpc ? balanceRpc.received / SATS : 0,
          totalSent: balanceRpc ? (balanceRpc.received - balanceRpc.balance) / SATS : 0,
          txCount: 0,
          isValid: true,
          network,
        }
      }
    }

    if (searchResults) {
      res.json({ query: q, network, type: searchType, results: searchResults, timestamp: new Date().toISOString() })
    } else {
      res.json({ query: q, network, type: 'not_found', results: null, message: 'No results found', timestamp: new Date().toISOString() })
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message, timestamp: new Date().toISOString() })
      return
    }
    console.error('Search API error:', error)
    res.status(500).json({ error: 'Search failed', timestamp: new Date().toISOString() })
  }
})

// ---- WFAIR bridge reserves proxy ----
// The bridge's reserves endpoint returns valid JSON but sends no CORS header, so
// the browser cannot fetch it cross-origin. Proxy it server-side (no CORS issue)
// and serve a short-lived cached copy to the same-origin `/api/bridge/reserves`
// the frontend calls. The JSON is passed through verbatim so the client contract
// (use-wfair-reserves.ts) is unchanged; on any upstream failure we return a clean
// `{ status: 'unavailable' }` and never throw.

const BRIDGE_RESERVES_URL = 'https://bridge.fairco.in/api/bridge/reserves'
/** Freshness window for the proxied reserves snapshot. */
const BRIDGE_RESERVES_TTL_MS = 30_000
/** Upstream fetch timeout so a hung bridge never stalls the explorer API. */
const BRIDGE_RESERVES_TIMEOUT_MS = 8_000

/** Shape the bridge returns; mirrored by `ReservesSnapshot` in the frontend hook. */
interface BridgeReservesSnapshot {
  at: string
  fairCustodySats: string
  wfairSupplyWei: string
  deltaSats: string
  pegHealthy: boolean
}

interface BridgeReservesCacheEntry {
  data: BridgeReservesSnapshot
  expires: number
}

let bridgeReservesCache: BridgeReservesCacheEntry | null = null
/** De-duplicates concurrent cache misses into a single upstream fetch. */
let bridgeReservesInFlight: Promise<BridgeReservesSnapshot> | null = null

async function loadBridgeReserves(): Promise<BridgeReservesSnapshot> {
  const response = await fetch(BRIDGE_RESERVES_URL, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(BRIDGE_RESERVES_TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`Bridge reserves upstream error: ${response.status} ${response.statusText}`)
  }
  return (await response.json()) as BridgeReservesSnapshot
}

app.get('/api/bridge/reserves', async (_req, res) => {
  const now = Date.now()
  if (bridgeReservesCache && bridgeReservesCache.expires > now) {
    res.json(bridgeReservesCache.data)
    return
  }

  // Single-flight: concurrent misses share one upstream round-trip.
  if (!bridgeReservesInFlight) {
    bridgeReservesInFlight = loadBridgeReserves()
  }

  try {
    const data = await bridgeReservesInFlight
    bridgeReservesCache = { data, expires: now + BRIDGE_RESERVES_TTL_MS }
    res.json(data)
  } catch (error) {
    console.error('Error fetching bridge reserves:', error)
    res.status(502).json({ status: 'unavailable' })
  } finally {
    bridgeReservesInFlight = null
  }
})

// ---- MCP (Model Context Protocol) server ----
// Remote MCP endpoint for AI assistants (Claude, ChatGPT, Cursor, …), exposing
// the explorer's read-only blockchain data over the Streamable HTTP transport in
// stateless mode (a fresh server + transport per request). Mounted before the
// SPA fallback so the catch-all never swallows `/mcp`. Its own permissive CORS
// (set by the handlers) is required because AI clients connect cross-origin,
// which the SPA's same-origin allowlist above does not cover.
const SERVER_VERSION = packageJson.version
app.options('/mcp', handleMcpOptions)
app.post('/mcp', globalLimiter, strictLimiter, createMcpPostHandler(SERVER_VERSION))
app.get('/mcp', handleMcpMethodNotAllowed)
app.delete('/mcp', handleMcpMethodNotAllowed)

// ---- Static Files + SPA Fallback ----
// Serve static files with correct MIME types and long cache for hashed assets
app.use(express.static(DIST_DIR, {
  maxAge: '1y',
  immutable: true,
  index: false, // Don't auto-serve index.html for directory requests
}))

// SPA fallback: serve index.html for all non-API, non-asset routes
app.use((_req, res) => {
  const indexPath = path.join(DIST_DIR, 'index.html')
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    res.status(404).send('Not found - dist/index.html missing')
  }
})

// ---- WebSocket + HTTP Server ----
const server = createServer(app)

// WebSocket setup
const wss = new WebSocketServer({ noServer: true })

server.on('upgrade', (request, socket, head) => {
  const { pathname } = parse(request.url || '', true)
  if (pathname === '/api/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => { wss.emit('connection', ws, request) })
  } else {
    socket.destroy()
  }
})

type WebSocketHandlerModule = typeof import('./lib/websocket-handler')
let wsHandlerPromise: Promise<WebSocketHandlerModule | null> | null = null

/**
 * Lazily load the WebSocket handler module exactly once. The first caller kicks
 * off the import; every connection (including the first) awaits the same
 * promise, so no client is ever rejected just because the module is still
 * loading. On import failure the promise resolves to null and is reset so a
 * later connection can retry.
 */
function loadWsHandler(): Promise<WebSocketHandlerModule | null> {
  if (!wsHandlerPromise) {
    wsHandlerPromise = import('./lib/websocket-handler').catch(error => {
      console.error('WebSocket handler not available:', (error as Error).message)
      wsHandlerPromise = null
      return null
    })
  }
  return wsHandlerPromise
}

/**
 * Resolve the client IP for the per-IP WebSocket connection cap.
 *
 * A raw client can put any value in `X-Forwarded-For`, so trusting its left-most
 * entry lets attackers bypass the per-IP limit. With one trusted proxy
 * (`trust proxy = 1`), the authoritative client address is the entry our proxy
 * appended — the right-most XFF value — falling back to the real TCP peer
 * address (`socket.remoteAddress`) when there is no proxy header.
 */
function resolveClientIp(request: { headers: NodeJS.Dict<string | string[]>; socket: { remoteAddress?: string } }): string | undefined {
  const socketAddress = request.socket.remoteAddress
  if (!TRUST_PROXY_HOPS) {
    return socketAddress
  }
  const forwarded = request.headers['x-forwarded-for']
  const raw = Array.isArray(forwarded) ? forwarded.join(',') : forwarded
  if (raw) {
    const parts = raw.split(',').map(part => part.trim()).filter(Boolean)
    const trusted = parts[parts.length - 1]
    if (trusted) {
      return trusted
    }
  }
  return socketAddress
}

wss.on('connection', async (ws, request) => {
  const wsHandler = await loadWsHandler()
  if (!wsHandler) { ws.close(); return }
  try {
    const ip = resolveClientIp(request)
    wsHandler.handleConnection(ws, request, ip)
  } catch (error) {
    console.error('Error handling WebSocket connection:', error)
    ws.close()
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`> API server ready on http://0.0.0.0:${PORT}`)
  console.log(`> WebSocket server ready on ws://0.0.0.0:${PORT}/api/ws`)
})

process.on('SIGTERM', () => { console.log('SIGTERM: closing'); process.exit(0) })
process.on('SIGINT', () => { console.log('SIGINT: closing'); process.exit(0) })
