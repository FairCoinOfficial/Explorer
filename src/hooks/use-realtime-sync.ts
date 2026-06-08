import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNetwork } from '@/contexts/network-context'
import {
  WebSocketEvent,
  NewBlockEvent,
  BlockCountEvent,
  NetworkStatsEvent,
} from '@/lib/websocket-types'

/**
 * Real-time cache sync for the home dashboard.
 *
 * The home reads live blockchain data through React Query hooks that poll every
 * 30s as a baseline. This hook upgrades that to true real-time by listening to
 * the already-open blockchain WebSocket (see `useBlockchainWebSocket`, mounted
 * once by `BlockchainProvider`) and, on the relevant push events, invalidating
 * the matching React Query caches so they refetch immediately instead of waiting
 * for the next poll.
 *
 * Design notes:
 * - It consumes the SINGLE existing socket via the `lastMessage` value the
 *   provider already exposes — it never opens a second connection.
 * - Invalidate-on-event is intentional: it is robust (always fetches the
 *   canonical server state) and React Query coalesces overlapping refetches, so
 *   bursts of events do not cause fetch storms.
 * - The 30s `refetchInterval` on the underlying hooks stays in place as a
 *   fallback, so the home keeps updating even if the socket drops (e.g. in local
 *   dev where the Vite proxy does not forward `/api/ws`).
 *
 * The effect here is a legitimate external-subscription effect: it reacts to the
 * newest WebSocket message. It performs no work and throws nothing when the
 * socket is absent (`event` is simply `null`).
 */
export function useRealtimeSync(event: WebSocketEvent | null): void {
  const queryClient = useQueryClient()
  const { currentNetwork } = useNetwork()

  useEffect(() => {
    if (!event) return

    // Ignore events for a network the user is not currently viewing so we don't
    // refetch the wrong network's data.
    if (event.network !== currentNetwork) return

    switch (event.type) {
      // A new block (or a bare height bump) changes the tip: the recent-blocks
      // feed, the derived latest-tx feed (it reads the same query), the
      // height-driven header pill and the stat-strip height all need to update.
      // Invalidating these two keys refetches everything the home derives from
      // them. The query keys carry the network, so invalidating the prefix
      // refreshes the active network's cache.
      case 'new-block':
      case 'block-count': {
        void queryClient.invalidateQueries({ queryKey: ['recent-blocks'] })
        void queryClient.invalidateQueries({ queryKey: ['network-stats'] })
        // Append the freshly-sampled tip to the stat-strip sparkline series.
        void queryClient.invalidateQueries({ queryKey: ['stats-history'] })
        break
      }

      // Difficulty / connections / hashrate moved — refresh the stats the
      // header pill, stat-strip, supply bar and network card read.
      case 'network-stats': {
        void queryClient.invalidateQueries({ queryKey: ['network-stats'] })
        break
      }

      default:
        // Other event types (mempool-update, transaction-confirmed, ping/pong,
        // subscribe/unsubscribe, error) do not feed the home dashboard caches,
        // so there is nothing to invalidate here.
        break
    }
  }, [event, currentNetwork, queryClient])
}

/**
 * Narrowing helpers for callers that need the typed payload of an event (e.g. to
 * prepend a block for zero-flicker). Exposed alongside the hook so consumers can
 * discriminate `WebSocketEvent` without unsafe casts.
 */
export function isNewBlockEvent(event: WebSocketEvent): event is NewBlockEvent {
  return event.type === 'new-block'
}

export function isBlockCountEvent(event: WebSocketEvent): event is BlockCountEvent {
  return event.type === 'block-count'
}

export function isNetworkStatsEvent(event: WebSocketEvent): event is NetworkStatsEvent {
  return event.type === 'network-stats'
}
