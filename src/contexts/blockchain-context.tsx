import { createContext, useContext, type ReactNode } from 'react'
import type { ConnectionState, WebSocketEvent } from '@shared/websocket-types'
import { useNetwork } from './network-context'
import { useBlockchainWebSocket } from '@/hooks/use-blockchain-websocket'
import { useRealtimeSync } from '@/hooks/use-realtime-sync'
import { useStats } from '@/hooks/use-stats'

interface BlockchainContextValue {
  isConnected: boolean
  connectionState: ConnectionState
  lastMessage: WebSocketEvent | null
}

const BlockchainContext = createContext<BlockchainContextValue | undefined>(undefined)

interface BlockchainProviderProps {
  children: ReactNode
}

/**
 * Mounts the single blockchain WebSocket and wires real-time React Query
 * invalidation. Exposes connection state for live indicators and for
 * suppressing HTTP polling while the socket is healthy.
 */
export function BlockchainProvider({ children }: BlockchainProviderProps) {
  const { currentNetwork } = useNetwork()

  const { lastMessage, isConnected, connectionState } = useBlockchainWebSocket({
    network: currentNetwork,
    autoConnect: true,
    reconnectOnNetworkChange: true,
  })

  useRealtimeSync(lastMessage)

  return (
    <BlockchainContext.Provider value={{ isConnected, connectionState, lastMessage }}>
      {children}
    </BlockchainContext.Provider>
  )
}

export function useBlockchain(): BlockchainContextValue {
  const context = useContext(BlockchainContext)
  if (context === undefined) {
    throw new Error('useBlockchain must be used within a BlockchainProvider')
  }
  return context
}

/**
 * React Query `refetchInterval`: poll only when the WebSocket is down.
 * While connected, push invalidation keeps caches fresh.
 */
export function useLiveRefetchInterval(fallbackMs = 30_000): number | false {
  const { isConnected } = useBlockchain()
  return isConnected ? false : fallbackMs
}

export type LiveMode = 'live' | 'polling' | 'offline'

/**
 * Honest UI mode from real socket + HTTP health:
 * - live: WebSocket connected
 * - polling: WebSocket down, stats HTTP ok
 * - offline: stats HTTP failed
 */
export function useLiveMode(): LiveMode {
  const { isConnected } = useBlockchain()
  const { isError, isSuccess } = useStats()

  if (isConnected) return 'live'
  if (isSuccess && !isError) return 'polling'
  return 'offline'
}
