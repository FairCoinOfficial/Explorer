import { type ReactNode } from 'react'
import { useNetwork } from './network-context'
import { useBlockchainWebSocket } from '@/hooks/use-blockchain-websocket'
import { useRealtimeSync } from '@/hooks/use-realtime-sync'

interface BlockchainProviderProps {
  children: ReactNode
}

/**
 * Mounts the single blockchain WebSocket and wires real-time React Query
 * invalidation. No consumer-facing context API — live data flows through
 * React Query hooks (`useStats`, `useRecentBlocks`, etc.).
 */
export function BlockchainProvider({ children }: BlockchainProviderProps) {
  const { currentNetwork } = useNetwork()

  const { lastMessage } = useBlockchainWebSocket({
    network: currentNetwork,
    autoConnect: true,
    reconnectOnNetworkChange: true,
  })

  useRealtimeSync(lastMessage)

  return children
}
