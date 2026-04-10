import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { parse } from 'url'
import { WebSocketServer } from 'ws'
import path from 'path'
import { blockCache } from './lib/cache'
import { rpcWithNetwork, type NetworkType } from './lib/rpc'

const app = express()
const PORT = parseInt(process.env.PORT || '4000', 10)
const DIST_DIR = path.join(import.meta.dirname, '..', 'dist')

app.use(cors())
app.use(express.json())

// ---- API Routes ----

app.get('/api/blocks', async (req, res) => {
  try {
    const network = (req.query.network as string || 'mainnet') as NetworkType
    const limit = parseInt(req.query.limit as string || '20')
    const blocks = await blockCache.getRecentBlocks(network, limit)
    const height = await blockCache.getBlockCount(network)
    res.json({ blocks, height, total: blocks.length, network })
  } catch (error) {
    console.error('Error fetching blocks:', error)
    res.status(500).json({ error: 'Failed to fetch blocks' })
  }
})

app.get('/api/blockcount', async (req, res) => {
  try {
    const network = (req.query.network as string || 'mainnet') as NetworkType
    const blockcount = await blockCache.getBlockCount(network)
    res.json({ blockcount, network })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    console.error('Error getting block count:', error)
    res.status(500).json({ error: message })
  }
})

app.get('/api/block/:hashOrHeight', async (req, res) => {
  try {
    const network = (req.query.network as string || 'mainnet') as NetworkType
    const { hashOrHeight } = req.params
    const block = await blockCache.getBlock(hashOrHeight, network, true)
    res.json({ block, network })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch block'
    console.error('Error fetching block:', error)
    res.status(500).json({ error: message })
  }
})

app.get('/api/transaction/:txid', async (req, res) => {
  try {
    const network = (req.query.network as string || 'mainnet') as NetworkType
    const { txid } = req.params
    const transaction = await blockCache.getTransaction(txid, network, true)
    res.json({ transaction, network })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch transaction'
    console.error('Error fetching transaction:', error)
    res.status(500).json({ error: message })
  }
})

app.get('/api/address/:address', async (req, res) => {
  try {
    const network = (req.query.network as string || 'mainnet') as NetworkType
    const { address } = req.params
    const addressInfo = {
      address, balance: 0, totalReceived: 0, totalSent: 0, txCount: 0, transactions: []
    }
    res.json({ addressInfo, network })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch address info'
    console.error('Error fetching address info:', error)
    res.status(500).json({ error: message })
  }
})

app.get('/api/mempool', async (req, res) => {
  try {
    const network = (req.query.network as string || 'mainnet') as NetworkType
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
        detailedTxs.push({ txid, size: 250, fee: 0.0001, feeRate: 1.0, time: Date.now() / 1000, depends: [] })
      }
    }

    const formattedMempoolInfo = {
      size: rawMempool.length, bytes: Number(mempoolInfo?.bytes ?? rawMempool.length * 250), transactions: detailedTxs
    }
    res.json({ mempoolInfo: formattedMempoolInfo, network })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch mempool'
    console.error('Error fetching mempool info:', error)
    res.status(500).json({ error: message })
  }
})

app.get('/api/masternodes', async (req, res) => {
  try {
    const network = (req.query.network as string || 'mainnet') as NetworkType
    const COLLATERAL_PER_MASTERNODE = 10000
    const BLOCK_REWARD = 5

    const [masternodeList, masternodeCount, blockHeight] = await Promise.all([
      blockCache.getMasternodeList(network, 'full').catch(() => ({})),
      rpcWithNetwork<Record<string, number>>('masternode', ['count'], network).catch(() => null),
      blockCache.getBlockCount(network).catch(() => 0),
    ])

    interface MasternodeEntry { txid: string; address: string; protocol: number; status: string; activeTime: number; lastSeen: number; pubkey: string }

    function parseMasternodeEntry(txid: string, data: unknown): MasternodeEntry {
      if (typeof data === 'string') {
        const parts = data.trim().split(/\s+/)
        return { txid, address: parts[0] || '', protocol: parseInt(parts[1]) || 0, status: parts[2] || 'UNKNOWN', activeTime: parseInt(parts[3]) || 0, lastSeen: parseInt(parts[4]) || 0, pubkey: parts[5] || '' }
      }
      if (typeof data === 'object' && data !== null) {
        const obj = data as Record<string, unknown>
        return { txid, address: String(obj.addr ?? obj.address ?? ''), protocol: Number(obj.version ?? obj.protocol ?? 0), status: String(obj.status ?? 'UNKNOWN'), activeTime: Number(obj.activetime ?? obj.activeTime ?? obj.activeseconds ?? 0), lastSeen: Number(obj.lastseen ?? obj.lastSeen ?? obj.lastpaid ?? 0), pubkey: String(obj.pubkey ?? '') }
      }
      return { txid, address: '', protocol: 0, status: 'UNKNOWN', activeTime: 0, lastSeen: 0, pubkey: '' }
    }

    const masternodes = Object.entries(masternodeList).map(([txid, data]) => parseMasternodeEntry(txid, data))
    const totalSupply = blockHeight > 0 ? blockHeight * BLOCK_REWARD : 33000000
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
      networkSecurity: { masternodeRewards: 60, stakingRewards: 36, budgetRewards: 4 }
    }

    res.json({ masternodes: masternodes.slice(0, 100), stats, network, pagination: { total: masternodes.length, limit: 100, offset: 0 } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch masternode data'
    console.error('Error fetching masternode data:', error)
    res.status(500).json({ error: message })
  }
})

app.get('/api/peers', async (req, res) => {
  try {
    const network = (req.query.network as string || 'mainnet') as NetworkType
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
    const message = error instanceof Error ? error.message : 'Failed to fetch peer info'
    console.error('Error fetching peer info:', error)
    res.status(500).json({ error: message })
  }
})

app.get('/api/stats', async (req, res) => {
  try {
    const network = (req.query.network as string || 'mainnet') as NetworkType
    const BLOCK_REWARD = 5
    const [blockHeight, blockchainInfo, miningInfo, mempoolInfo, networkInfo, masternodeList] = await Promise.all([
      blockCache.getBlockCount(network).catch(() => 0),
      blockCache.get<Record<string, unknown>>('getblockchaininfo', [], { network, ttl: 300 }).catch(() => null),
      blockCache.getMiningInfo(network).catch(() => null),
      blockCache.getMempoolInfo(network).catch(() => null),
      blockCache.getNetworkInfo(network).catch(() => null),
      blockCache.getMasternodeList(network).catch(() => ({}))
    ])
    const latestBlock = blockHeight > 0 ? await blockCache.getBlock(blockHeight, network, true).catch(() => null) : null
    const totalSupply = blockHeight > 0 ? blockHeight * BLOCK_REWARD : 0
    const masternodeCount = typeof masternodeList === 'object' ? Object.keys(masternodeList).length : 0
    const difficulty = miningInfo?.difficulty || 0
    const phase = blockHeight > 10000 ? 'PoS' : 'PoW'
    const hashrate = phase === 'PoW' ? (miningInfo?.networkhashps || difficulty * Math.pow(2, 32) / 120) : 0

    const stats = {
      blockHeight, difficulty, hashrate, totalSupply, circulatingSupply: totalSupply,
      avgBlockTime: 120, memPoolSize: mempoolInfo?.size || 0,
      totalTransactions: blockHeight * (latestBlock?.nTx || 1), networkWeight: 0,
      avgTransactionsPerBlock: latestBlock?.nTx || 1, masternodeCount,
      stakingRewards: BLOCK_REWARD, stakePercentage: 0,
      connections: networkInfo?.connections || 0, phase,
      lastBlock: { height: latestBlock?.height || blockHeight, hash: latestBlock?.hash || '', time: latestBlock?.time || Date.now() / 1000, size: latestBlock?.size || 0 }
    }
    res.json({ stats, network })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch stats'
    console.error('Error fetching stats:', error)
    res.status(500).json({ error: message })
  }
})

app.get('/api/network-info', async (req, res) => {
  try {
    const network = (req.query.network as string || 'mainnet') as NetworkType
    const networkInfo = await blockCache.getNetworkInfo(network)
    res.json(networkInfo)
  } catch (error) {
    console.error('Failed to get network info:', error)
    res.status(500).json({ error: 'Failed to fetch network information' })
  }
})

app.get('/api/mining-info', async (req, res) => {
  try {
    const network = (req.query.network as string || 'mainnet') as NetworkType
    const miningInfo = await blockCache.getMiningInfo(network)
    res.json(miningInfo)
  } catch (error) {
    console.error('Failed to get mining info:', error)
    res.status(500).json({ error: 'Failed to fetch mining information' })
  }
})

app.get('/api/validate-address', async (req, res) => {
  try {
    const address = req.query.address as string
    const network = (req.query.network as string || 'mainnet') as NetworkType
    if (!address) { res.status(400).json({ error: 'Address parameter is required' }); return }
    const validation = await blockCache.validateAddress(address, network)
    res.json(validation)
  } catch (error) {
    console.error('Failed to validate address:', error)
    res.status(500).json({ error: 'Failed to validate address' })
  }
})

app.get('/api/search', async (req, res) => {
  try {
    const q = ((req.query.q as string) || '').trim()
    const network = (req.query.network as string || 'mainnet') as NetworkType
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
    } else if (/^[fFmn2][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{24,61}$/i.test(q)) {
      searchType = 'address'
      searchResults = { address: q, balance: 0, totalReceived: 0, totalSent: 0, txCount: 0, transactions: [], isValid: true, network }
    }

    if (searchResults) {
      res.json({ query: q, network, type: searchType, results: searchResults, timestamp: new Date().toISOString() })
    } else {
      res.json({ query: q, network, type: 'not_found', results: null, message: 'No results found', timestamp: new Date().toISOString() })
    }
  } catch (error) {
    console.error('Search API error:', error)
    res.status(500).json({ error: 'Search failed', timestamp: new Date().toISOString() })
  }
})

// ---- Static Files + SPA Fallback ----
app.use(express.static(DIST_DIR))
app.get('*', (_req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'))
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

let wsHandler: { handleConnection: (ws: unknown, request: unknown, ip?: string) => void } | null = null

wss.on('connection', (ws, request) => {
  if (!wsHandler) {
    try {
      wsHandler = require('./lib/websocket-handler')
    } catch (error) {
      console.error('WebSocket handler not available:', (error as Error).message)
    }
  }
  if (!wsHandler) { ws.close(); return }
  try {
    const ip = (request.headers['x-forwarded-for'] as string) || request.socket?.remoteAddress
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
