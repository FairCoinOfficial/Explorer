import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useNetwork } from '@/contexts/network-context'
import type { NodeHealthSummary } from '@/lib/node-health-banner'

/**
 * Reads `/api/health` — whether the tip the explorer is serving is still the
 * chain's tip.
 *
 * Note the deliberate handling of 503: that status IS the answer when the node
 * has fallen behind, and its body carries the detail. Treating a non-2xx as a
 * failed request (the pattern used elsewhere for optional data) would swallow
 * exactly the case this endpoint exists to report. Only a genuinely unreachable
 * endpoint resolves to `null`.
 */
export function useNodeHealth(): UseQueryResult<NodeHealthSummary | null> {
  const { currentNetwork } = useNetwork()

  return useQuery<NodeHealthSummary | null>({
    queryKey: ['node-health', currentNetwork],
    queryFn: async (): Promise<NodeHealthSummary | null> => {
      try {
        const response = await fetch(`/api/health?network=${currentNetwork}`, {
          headers: { Accept: 'application/json' },
        })
        const body = (await response.json()) as Partial<NodeHealthSummary> | null
        if (!body || typeof body.status !== 'string') {
          return null
        }
        return { status: body.status, lagBlocks: Number(body.lagBlocks ?? 0) }
      } catch {
        // Network error / unparseable body: health is not established.
        return null
      }
    },
    // Fixed cadence: this is an availability probe, not live chain data, and it
    // must keep polling at the same rate when the chain has gone quiet.
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 1,
  })
}
