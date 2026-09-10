import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNetwork } from '@/contexts/network-context'
import {
  WebSocketEvent,
  NewBlockEvent,
  BlockCountEvent,
  NetworkStatsEvent,
  MempoolUpdateEvent,
  TransactionConfirmedEvent,
} from '@shared/websocket-types'

/**
 * Real-time cache sync for live explorer views.
 *
 * Listens to the single blockchain WebSocket (via `BlockchainProvider`) and
 * invalidates the matching React Query caches so they refetch the canonical
 * HTTP API shape. Invalidate-on-event is intentional: it is robust, typed, and
 * React Query coalesces overlapping refetches.
 *
 * Live hooks use `useLiveRefetchInterval` so HTTP polling is only a fallback
 * when the socket is down.
 */
export function useRealtimeSync(event: WebSocketEvent | null): void {
  const queryClient = useQueryClient()
  const { currentNetwork } = useNetwork()

  useEffect(() => {
    if (!event) return
    if (event.network !== currentNetwork) return

    switch (event.type) {
      case 'new-block':
      case 'block-count': {
        void queryClient.invalidateQueries({ queryKey: ['recent-blocks'] })
        void queryClient.invalidateQueries({ queryKey: ['recent-transactions'] })
        void queryClient.invalidateQueries({ queryKey: ['stats'] })
        void queryClient.invalidateQueries({ queryKey: ['block'] })
        void queryClient.invalidateQueries({ queryKey: ['transaction'] })
        void queryClient.invalidateQueries({ queryKey: ['address'] })
        void queryClient.invalidateQueries({ queryKey: ['address-txs'] })
        void queryClient.invalidateQueries({ queryKey: ['node-status'] })
        void queryClient.invalidateQueries({ queryKey: ['masternodes'] })
        void queryClient.invalidateQueries({ queryKey: ['masternode-list'] })
        void queryClient.invalidateQueries({ queryKey: ['peers'] })
        break
      }

      case 'network-stats': {
        void queryClient.invalidateQueries({ queryKey: ['stats'] })
        void queryClient.invalidateQueries({ queryKey: ['peers'] })
        void queryClient.invalidateQueries({ queryKey: ['node-status'] })
        break
      }

      case 'mempool-update': {
        void queryClient.invalidateQueries({ queryKey: ['mempool'] })
        void queryClient.invalidateQueries({ queryKey: ['recent-transactions'] })
        void queryClient.invalidateQueries({ queryKey: ['stats'] })
        break
      }

      case 'transaction-confirmed': {
        if (!isTransactionConfirmedEvent(event)) break
        void queryClient.invalidateQueries({
          queryKey: ['transaction', event.data.txid, currentNetwork],
        })
        void queryClient.invalidateQueries({ queryKey: ['address'] })
        void queryClient.invalidateQueries({ queryKey: ['address-txs'] })
        void queryClient.invalidateQueries({ queryKey: ['recent-transactions'] })
        void queryClient.invalidateQueries({ queryKey: ['mempool'] })
        break
      }

      default:
        break
    }
  }, [event, currentNetwork, queryClient])
}

/** Narrowing helpers for typed WebSocket payloads (base `WebSocketEvent` is not a union). */
export function isNewBlockEvent(event: WebSocketEvent): event is NewBlockEvent {
  return event.type === 'new-block'
}

export function isBlockCountEvent(event: WebSocketEvent): event is BlockCountEvent {
  return event.type === 'block-count'
}

export function isNetworkStatsEvent(event: WebSocketEvent): event is NetworkStatsEvent {
  return event.type === 'network-stats'
}

export function isMempoolUpdateEvent(event: WebSocketEvent): event is MempoolUpdateEvent {
  return event.type === 'mempool-update'
}

export function isTransactionConfirmedEvent(
  event: WebSocketEvent,
): event is TransactionConfirmedEvent {
  return event.type === 'transaction-confirmed'
}
