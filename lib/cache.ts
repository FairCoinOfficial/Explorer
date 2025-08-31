import { MongoClient, Db } from 'mongodb'
import { rpcWithNetwork, NetworkType } from './rpc'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/faircoin-explorer'

interface CacheOptions {
  ttl?: number // Time to live in seconds
  network: NetworkType
}

interface CachedDocument {
  _id: string
  data: any
  timestamp: number
  ttl: number
  network: NetworkType
}

interface CachedData {
  data: any
  timestamp: number
  ttl: number
  network: NetworkType
}

export class BlockchainCache {
  private db: Db | null = null
  private client: MongoClient | null = null

  protected async getDb(): Promise<Db> {
    if (!this.db) {
      this.client = new MongoClient(MONGODB_URI)
      await this.client.connect()
      const dbName = new URL(MONGODB_URI).pathname.slice(1) || 'faircoin-explorer'
      this.db = this.client.db(dbName)
      console.log(`Connected to MongoDB database: ${dbName}`)
    }
    return this.db
  }

  private getCacheKey(method: string, params: any[], network: NetworkType) {
    return `${network}:${method}:${JSON.stringify(params)}`
  }

  private isExpired(cachedData: CachedData): boolean {
    const now = Date.now()
    return now - cachedData.timestamp > cachedData.ttl * 1000
  }

  async get<T>(method: string, params: any[] = [], options: CacheOptions): Promise<T> {
    const db = await this.getDb()
    const collection = db.collection('cache')
    const cacheKey = this.getCacheKey(method, params, options.network)

    try {
      // Check cache first
      const cached = await collection.findOne({ _id: cacheKey } as any)
      
      if (cached && !this.isExpired(cached as any)) {
        return cached.data
      }
      
      // Fetch from RPC
      const data = await rpcWithNetwork<T>(method, params, options.network)
      
      // Store in cache
      await collection.replaceOne(
        { _id: cacheKey } as any,
        {
          _id: cacheKey,
          data,
          timestamp: Date.now(),
          ttl: options.ttl || 3600,
          network: options.network
        } as any,
        { upsert: true }
      )

      return data
    } catch (error) {
      console.error(`Error in cache.get for ${method}:`, error)
      // Fallback to RPC if cache fails
      return await rpcWithNetwork<T>(method, params, options.network)
    }
  }

  async invalidate(method: string, params: any[] = [], network: NetworkType) {
    const db = await this.getDb()
    const collection = db.collection('cache')
    const cacheKey = this.getCacheKey(method, params, network)
    
    await collection.deleteOne({ _id: cacheKey } as any)
  }

  async invalidatePattern(pattern: string, network: NetworkType) {
    const db = await this.getDb()
    const collection = db.collection('cache')
    
    await collection.deleteMany({ 
      _id: { $regex: `^${network}:${pattern}` }
    } as any)
  }

  async clearExpired() {
    const db = await this.getDb()
    const collection = db.collection('cache')
    const now = Date.now()
    
    const result = await collection.deleteMany({
      $expr: {
        $gt: [now, { $add: ['$timestamp', { $multiply: ['$ttl', 1000] }] }]
      }
    } as any)
    
    // Only log if there were expired entries to clean up
    if (result.deletedCount > 0) {
      console.log(`Cleared ${result.deletedCount} expired cache entries`)
    }
  }
}

// Block-specific caching with different TTLs
export class BlockCache extends BlockchainCache {
  async getBlock(hashOrHeight: string | number, network: NetworkType, verbose: boolean = true) {
    // Determine if it's a hash or height
    const isHeight = typeof hashOrHeight === 'number' || /^\d+$/.test(hashOrHeight.toString())
    
    if (isHeight) {
      const height = parseInt(hashOrHeight.toString())
      const hash = await this.get<string>('getblockhash', [height], { network, ttl: 300 }) // 5 minutes for block hashes
      return await this.get<any>('getblock', [hash, verbose], { network, ttl: 3600 }) // 1 hour for block data
    } else {
      return await this.get<any>('getblock', [hashOrHeight, verbose], { network, ttl: 3600 }) // 1 hour for block data
    }
  }

  async getTransaction(txid: string, network: NetworkType, verbose: boolean = true) {
    return await this.get<any>('getrawtransaction', [txid, verbose], { network, ttl: 3600 }) // 1 hour for transactions
  }

  async getBlockCount(network: NetworkType) {
    return await this.get<number>('getblockcount', [], { network, ttl: 30 }) // 30 seconds for block count
  }

  async getNetworkInfo(network: NetworkType) {
    return await this.get<any>('getnetworkinfo', [], { network, ttl: 300 }) // 5 minutes for network info
  }

  async getMiningInfo(network: NetworkType) {
    return await this.get<any>('getmininginfo', [], { network, ttl: 60 }) // 1 minute for mining info
  }

  async validateAddress(address: string, network: NetworkType) {
    return await this.get<any>('validateaddress', [address], { network, ttl: 86400 }) // 24 hours for address validation
  }

  async getMasternodeList(network: NetworkType, mode: string = 'full'): Promise<any> {
    return this.get('masternodelist', [mode], { network, ttl: 3600 }) // 1 hour TTL for masternode list
  }

  async getMempoolInfo(network: NetworkType): Promise<any> {
    return this.get('getmempoolinfo', [], { network, ttl: 60 }) // 1 minute TTL for mempool
  }

  async getStakingInfo(network: NetworkType): Promise<any> {
    return this.get('getstakinginfo', [], { network, ttl: 300 }) // 5 minute TTL for staking info
  }

  async getRawMempool(network: NetworkType): Promise<any> {
    return this.get('getrawmempool', [], { network, ttl: 30 }) // 30 second TTL for mempool transactions
  }

  // Get recent blocks with caching
  async getRecentBlocks(network: NetworkType, limit: number = 20): Promise<any[]> {
    const db = await this.getDb()
    const collection = db.collection('recent_blocks')
    const cacheKey = `${network}:recent:${limit}`

    // Check cache first
    const cached = await collection.findOne({ _id: cacheKey } as any)
    if (cached && Date.now() - cached.timestamp < 30000) { // 30 seconds TTL
      return cached.blocks
    }

    // Fetch fresh data
    const height = await this.getBlockCount(network)
    const blocks = []
    const startHeight = Math.max(0, height - limit + 1)

    for (let i = height; i >= startHeight && blocks.length < limit; i--) {
      try {
        const block = await this.getBlock(i, network, true)
        blocks.push({
          height: block.height,
          hash: block.hash,
          time: block.time,
          nTx: block.nTx || block.tx?.length || 0,
          size: block.size,
          tx: block.tx || []
        })
      } catch (error) {
        console.error(`Error fetching block ${i}:`, error)
      }
    }

    // Cache the result
    await collection.replaceOne(
      { _id: cacheKey } as any,
      {
        _id: cacheKey,
        blocks,
        timestamp: Date.now(),
        network
      } as any,
      { upsert: true }
    )

    return blocks
  }
}

// Singleton instances
export const blockchainCache = new BlockchainCache()
export const blockCache = new BlockCache()

// Auto cleanup expired entries every hour
if (typeof global !== 'undefined') {
  setInterval(() => {
    blockchainCache.clearExpired().catch(console.error)
  }, 3600000) // 1 hour
}
