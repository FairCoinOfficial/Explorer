// Blockchain Monitor Service for FairCoin Explorer
// Polls RPC endpoints and broadcasts changes via WebSocket

import { WebSocketManager } from './websocket-manager'
import {
  NetworkType,
  NetworkState,
  BlockchainMonitorConfig,
  NewBlockEvent,
  BlockCountEvent,
  MempoolUpdateEvent,
  NetworkStatsEvent
} from './websocket-types'
import { blockCache } from './cache'
import { logger } from './logger'

export class BlockchainMonitor {
  private wsManager: WebSocketManager
  private networkStates: Map<NetworkType, NetworkState>
  private pollInterval: NodeJS.Timeout | null = null
  private statsInterval: NodeJS.Timeout | null = null
  private config: BlockchainMonitorConfig
  private isRunning: boolean = false

  constructor(wsManager: WebSocketManager, config?: Partial<BlockchainMonitorConfig>) {
    this.wsManager = wsManager

    this.config = {
      pollInterval: config?.pollInterval ?? parseInt(process.env.BLOCKCHAIN_POLL_INTERVAL || '10000'),
      networks: config?.networks ?? ['mainnet', 'testnet'],
      enabled: config?.enabled ?? (process.env.WEBSOCKET_ENABLED !== 'false')
    }

    this.networkStates = new Map()

    // Initialize network states
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
        lastUpdate: new Date()
      })
    })

    logger.debug('[BlockchainMonitor] Initialized with config:', this.config)
  }

  /**
   * Start monitoring blockchain for all configured networks
   */
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

    // Initialize states for all networks
    for (const network of this.config.networks) {
      await this.initializeNetworkState(network)
    }

    // Start polling interval for blocks and mempool
    this.pollInterval = setInterval(() => {
      this.pollAllNetworks()
    }, this.config.pollInterval)

    // Start stats interval (less frequent - every 30s)
    this.statsInterval = setInterval(() => {
      this.pollNetworkStats()
    }, 30000)

    // Do initial poll
    await this.pollAllNetworks()
    await this.pollNetworkStats()

    logger.info('[BlockchainMonitor] Monitor started successfully')
  }

  /**
   * Stop monitoring
   */
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

  /**
   * Initialize network state
   */
  private async initializeNetworkState(network: NetworkType): Promise<void> {
    try {
      logger.debug(`[BlockchainMonitor] Initializing ${network} state...`)

      const blockCount = await blockCache.getBlockCount(network)
      const block = await blockCache.getBlock(blockCount, network, true)
      const mempoolInfo = await blockCache.getMempoolInfo(network)

      const state = this.networkStates.get(network)
      if (state) {
        state.blockHeight = blockCount
        state.blockHash = block.hash
        state.mempoolSize = mempoolInfo?.size || 0
        state.mempoolBytes = mempoolInfo?.bytes || 0
        state.lastUpdate = new Date()
      }

      logger.debug(`[BlockchainMonitor] ${network} initialized: Block ${blockCount}`)
    } catch (error) {
      console.error(`[BlockchainMonitor] Error initializing ${network}:`, error)
    }
  }

  /**
   * Poll all configured networks
   */
  private async pollAllNetworks(): Promise<void> {
    for (const network of this.config.networks) {
      await this.pollNetwork(network)
    }
  }

  /**
   * Poll single network for block and mempool changes
   */
  private async pollNetwork(network: NetworkType): Promise<void> {
    try {
      const state = this.networkStates.get(network)
      if (!state) {
        return
      }

      // Check block count
      const newBlockCount = await blockCache.getBlockCount(network)

      if (newBlockCount > state.blockHeight) {
        logger.debug(`[BlockchainMonitor] ${network}: New blocks detected (${state.blockHeight} -> ${newBlockCount})`)

        // Fetch new blocks
        for (let height = state.blockHeight + 1; height <= newBlockCount; height++) {
          await this.handleNewBlock(network, height)
        }

        // Update state
        const previousHeight = state.blockHeight
        state.blockHeight = newBlockCount

        // Broadcast block count update
        const blockCountEvent: BlockCountEvent = {
          type: 'block-count',
          network,
          timestamp: Date.now(),
          data: {
            height: newBlockCount,
            previousHeight
          }
        }
        this.wsManager.broadcast(blockCountEvent, network)
      }

      // Check mempool
      await this.pollMempool(network)

      state.lastUpdate = new Date()
    } catch (error) {
      console.error(`[BlockchainMonitor] Error polling ${network}:`, error)
    }
  }

  /**
   * Handle new block
   */
  private async handleNewBlock(network: NetworkType, height: number): Promise<void> {
    try {
      const block = await blockCache.getBlock(height, network, true)

      const state = this.networkStates.get(network)
      if (state) {
        state.blockHash = block.hash
      }

      logger.debug(`[BlockchainMonitor] ${network}: Broadcasting new block ${height} (${block.hash})`)

      // Broadcast new block event
      const newBlockEvent: NewBlockEvent = {
        type: 'new-block',
        network,
        timestamp: Date.now(),
        data: {
          hash: block.hash,
          height: block.height,
          time: block.time,
          nTx: block.nTx || block.tx?.length || 0,
          size: block.size,
          difficulty: block.difficulty,
          tx: block.tx || [],
          previousblockhash: block.previousblockhash,
          nextblockhash: block.nextblockhash
        }
      }
      this.wsManager.broadcast(newBlockEvent, network)
    } catch (error) {
      console.error(`[BlockchainMonitor] Error handling new block ${height} on ${network}:`, error)
    }
  }

  /**
   * Poll mempool for changes
   */
  private async pollMempool(network: NetworkType): Promise<void> {
    try {
      const state = this.networkStates.get(network)
      if (!state) {
        return
      }

      const mempoolInfo = await blockCache.getMempoolInfo(network)

      // Check if mempool changed
      if (
        mempoolInfo &&
        (mempoolInfo.size !== state.mempoolSize || mempoolInfo.bytes !== state.mempoolBytes)
      ) {
        logger.debug(`[BlockchainMonitor] ${network}: Mempool changed (${state.mempoolSize} -> ${mempoolInfo.size} tx)`)

        state.mempoolSize = mempoolInfo.size
        state.mempoolBytes = mempoolInfo.bytes

        // Broadcast mempool update event
        const mempoolEvent: MempoolUpdateEvent = {
          type: 'mempool-update',
          network,
          timestamp: Date.now(),
          data: {
            size: mempoolInfo.size,
            bytes: mempoolInfo.bytes,
            usage: mempoolInfo.usage,
            maxmempool: mempoolInfo.maxmempool,
            mempoolminfee: mempoolInfo.mempoolminfee,
            transactions: []
          }
        }
        this.wsManager.broadcast(mempoolEvent, network)
      }
    } catch (error) {
      console.error(`[BlockchainMonitor] Error polling mempool for ${network}:`, error)
    }
  }

  /**
   * Poll network stats for all networks
   */
  private async pollNetworkStats(): Promise<void> {
    for (const network of this.config.networks) {
      await this.pollNetworkStatsForNetwork(network)
    }
  }

  /**
   * Poll network stats for single network
   */
  private async pollNetworkStatsForNetwork(network: NetworkType): Promise<void> {
    try {
      const state = this.networkStates.get(network)
      if (!state) {
        return
      }

      // Get network info and mining info
      const [networkInfo, miningInfo] = await Promise.all([
        blockCache.getNetworkInfo(network).catch(() => null),
        blockCache.getMiningInfo(network).catch(() => null)
      ])

      if (networkInfo || miningInfo) {
        // Update state
        if (networkInfo) {
          state.connections = networkInfo.connections || 0
        }
        if (miningInfo) {
          state.difficulty = miningInfo.difficulty || 0
          state.hashrate = miningInfo.networkhashps || miningInfo.hashrate || '0'
        }

        // Broadcast network stats event
        const statsEvent: NetworkStatsEvent = {
          type: 'network-stats',
          network,
          timestamp: Date.now(),
          data: {
            connections: state.connections,
            difficulty: state.difficulty,
            hashrate: state.hashrate,
            version: networkInfo?.version || 'Unknown',
            subversion: networkInfo?.subversion,
            protocolversion: networkInfo?.protocolversion
          }
        }
        this.wsManager.broadcast(statsEvent, network)

        logger.debug(`[BlockchainMonitor] ${network}: Broadcasted network stats update`)
      }
    } catch (error) {
      console.error(`[BlockchainMonitor] Error polling network stats for ${network}:`, error)
    }
  }

  /**
   * Get current state for a network
   */
  getNetworkState(network: NetworkType): NetworkState | undefined {
    return this.networkStates.get(network)
  }

  /**
   * Get all network states
   */
  getAllNetworkStates(): Map<NetworkType, NetworkState> {
    return new Map(this.networkStates)
  }

  /**
   * Check if monitor is running
   */
  isMonitorRunning(): boolean {
    return this.isRunning
  }
}

// Singleton instance
let monitorInstance: BlockchainMonitor | null = null

export function getBlockchainMonitor(
  wsManager: WebSocketManager,
  config?: Partial<BlockchainMonitorConfig>
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
