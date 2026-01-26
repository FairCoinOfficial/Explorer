"use client"

// Blockchain Context Provider for Real-Time Data

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { useNetwork } from './network-context'
import { useBlockchainWebSocket } from '@/lib/hooks/use-blockchain-websocket'
import {
  WebSocketEvent,
  BlockData,
  NetworkStatsEvent,
  NewBlockEvent,
  BlockCountEvent,
  MempoolUpdateEvent,
  EventHandler
} from '@/lib/websocket-types'

interface BlockchainContextType {
  // Connection state
  isConnected: boolean
  isLoading: boolean

  // Blockchain data
  blockHeight: number
  latestBlock: BlockData | null
  mempoolSize: number
  mempoolBytes: number

  // Network stats
  networkStats: {
    connections: number
    difficulty: number
    hashrate: string
    version: string
  } | null

  // Event subscription
  subscribe: (event: string, handler: EventHandler) => void
  unsubscribe: (event: string, handler: EventHandler) => void

  // Manual refresh
  reconnect: () => void
}

const BlockchainContext = createContext<BlockchainContextType | undefined>(undefined)

interface BlockchainProviderProps {
  children: ReactNode
}

export function BlockchainProvider({ children }: BlockchainProviderProps) {
  const { currentNetwork } = useNetwork()
  const [isLoading, setIsLoading] = useState(true)

  // State for blockchain data
  const [blockHeight, setBlockHeight] = useState(0)
  const [latestBlock, setLatestBlock] = useState<BlockData | null>(null)
  const [mempoolSize, setMempoolSize] = useState(0)
  const [mempoolBytes, setMempoolBytes] = useState(0)
  const [networkStats, setNetworkStats] = useState<{
    connections: number
    difficulty: number
    hashrate: string
    version: string
  } | null>(null)

  // Event handlers map
  const [eventHandlers] = useState<Map<string, Set<EventHandler>>>(new Map())

  // WebSocket hook
  const {
    isConnected,
    lastMessage,
    reconnect
  } = useBlockchainWebSocket({
    network: currentNetwork,
    autoConnect: true,
    reconnectOnNetworkChange: true
  })

  /**
   * Subscribe to an event
   */
  const subscribe = useCallback((event: string, handler: EventHandler) => {
    if (!eventHandlers.has(event)) {
      eventHandlers.set(event, new Set())
    }
    eventHandlers.get(event)?.add(handler)
  }, [eventHandlers])

  /**
   * Unsubscribe from an event
   */
  const unsubscribe = useCallback((event: string, handler: EventHandler) => {
    eventHandlers.get(event)?.delete(handler)
  }, [eventHandlers])

  /**
   * Emit event to handlers
   */
  const emit = useCallback((event: WebSocketEvent) => {
    const handlers = eventHandlers.get(event.type)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event)
        } catch (error) {
          console.error(`[BlockchainContext] Error in event handler for ${event.type}:`, error)
        }
      })
    }
  }, [eventHandlers])

  /**
   * Handle WebSocket messages
   */
  useEffect(() => {
    if (!lastMessage) return

    // Only process messages for current network
    if (lastMessage.network !== currentNetwork) return

    // Update state based on message type
    switch (lastMessage.type) {
      case 'new-block':
        const newBlockEvent = lastMessage as NewBlockEvent
        setLatestBlock(newBlockEvent.data)
        setBlockHeight(newBlockEvent.data.height)
        emit(lastMessage)
        break

      case 'block-count':
        const blockCountEvent = lastMessage as BlockCountEvent
        setBlockHeight(blockCountEvent.data.height)
        emit(lastMessage)
        break

      case 'mempool-update':
        const mempoolEvent = lastMessage as MempoolUpdateEvent
        setMempoolSize(mempoolEvent.data.size)
        setMempoolBytes(mempoolEvent.data.bytes)
        emit(lastMessage)
        break

      case 'network-stats':
        const statsEvent = lastMessage as NetworkStatsEvent
        setNetworkStats({
          connections: statsEvent.data.connections,
          difficulty: statsEvent.data.difficulty,
          hashrate: statsEvent.data.hashrate,
          version: statsEvent.data.version
        })
        emit(lastMessage)
        break

      case 'transaction-confirmed':
        emit(lastMessage)
        break

      case 'error':
        console.error('[BlockchainContext] WebSocket error:', lastMessage.data)
        break

      default:
        // Emit all other events to handlers
        emit(lastMessage)
    }
  }, [lastMessage, currentNetwork, emit])

  /**
   * Update loading state
   */
  useEffect(() => {
    if (isConnected && blockHeight > 0) {
      setIsLoading(false)
    }
  }, [isConnected, blockHeight])

  /**
   * Reset state when network changes
   */
  useEffect(() => {
    setIsLoading(true)
    setBlockHeight(0)
    setLatestBlock(null)
    setMempoolSize(0)
    setMempoolBytes(0)
    setNetworkStats(null)
  }, [currentNetwork])

  const value: BlockchainContextType = {
    isConnected,
    isLoading,
    blockHeight,
    latestBlock,
    mempoolSize,
    mempoolBytes,
    networkStats,
    subscribe,
    unsubscribe,
    reconnect
  }

  return (
    <BlockchainContext.Provider value={value}>
      {children}
    </BlockchainContext.Provider>
  )
}

/**
 * Hook to use blockchain context
 */
export function useBlockchain() {
  const context = useContext(BlockchainContext)
  if (context === undefined) {
    throw new Error('useBlockchain must be used within a BlockchainProvider')
  }
  return context
}
