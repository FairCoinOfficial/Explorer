import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNetwork } from '@/contexts/network-context'
import { createThrottledInvalidator, type ThrottledInvalidator } from '@/lib/throttled-invalidator'
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
 *
 * Invalidations are throttled per key (see `createThrottledInvalidator`): a burst
 * of server events must never become a burst of HTTP requests from every tab.
 */
export function useRealtimeSync(event: WebSocketEvent | null): void {
  const queryClient = useQueryClient()
  const { currentNetwork } = useNetwork()
  const invalidatorRef = useRef<ThrottledInvalidator | null>(null)

  useEffect(() => {
    const invalidator = createThrottledInvalidator((queryKey) => {
      void queryClient.invalidateQueries({ queryKey })
    })
    invalidatorRef.current = invalidator
    return () => {
      invalidator.dispose()
      invalidatorRef.current = null
    }
  }, [queryClient])

  useEffect(() => {
    const invalidate = (queryKey: readonly unknown[]) => invalidatorRef.current?.invalidate(queryKey)
    if (!event) return
    if (event.network !== currentNetwork) return

    switch (event.type) {
      case 'new-block':
      case 'block-count': {
        invalidate(['recent-blocks'])
        invalidate(['recent-transactions'])
        invalidate(['stats'])
        invalidate(['block'])
        invalidate(['transaction'])
        invalidate(['address'])
        invalidate(['address-txs'])
        invalidate(['node-status'])
        invalidate(['masternodes'])
        invalidate(['masternode-list'])
        invalidate(['peers'])
        break
      }

      case 'network-stats': {
        invalidate(['stats'])
        invalidate(['peers'])
        invalidate(['node-status'])
        break
      }

      case 'mempool-update': {
        invalidate(['mempool'])
        invalidate(['recent-transactions'])
        invalidate(['stats'])
        break
      }

      case 'transaction-confirmed': {
        if (!isTransactionConfirmedEvent(event)) break
        invalidate(['transaction', event.data.txid, currentNetwork])
        invalidate(['address'])
        invalidate(['address-txs'])
        invalidate(['recent-transactions'])
        invalidate(['mempool'])
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
