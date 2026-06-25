import { useQuery } from '@tanstack/react-query'
import type { NetworkType } from '@/contexts/network-context'

/**
 * A single sampled snapshot of the network's time-varying stats, written by the
 * server-side sampler in `server/routes/stats-history.ts`. Backs the subtle
 * background micro-sparklines on the home stat-strip (Difficulty, Supply,
 * Connections — supply is derived client-side from `height`).
 */
export interface StatHistoryPoint {
  height: number
  difficulty: number
  connections: number
  timestamp: string
}

interface StatHistoryResponse {
  history: StatHistoryPoint[]
}

/**
 * Stats history for the home stat-strip sparklines. The server accumulates the
 * series over time, so it is empty until the first sample lands; this hook stays
 * in place and the tiles fill in their background sparklines automatically once
 * points exist.
 */
interface UseStatsHistoryOptions {
  /**
   * The stats-history endpoint is intentionally sampled for mainnet only.
   * Network-aware pages pass their selected network so testnet views do not
   * accidentally render cached mainnet history alongside live testnet values.
   */
  network?: NetworkType
}

export function useStatsHistory(options: UseStatsHistoryOptions = {}) {
  const network = options.network ?? 'mainnet'

  return useQuery<StatHistoryPoint[]>({
    queryKey: ['stats-history', network],
    enabled: network === 'mainnet',
    queryFn: async (): Promise<StatHistoryPoint[]> => {
      const response = await fetch('/api/stats/history', {
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) {
        throw new Error(`Failed to load stats history (${response.status})`)
      }
      const data = (await response.json()) as StatHistoryResponse
      return data.history ?? []
    },
    refetchInterval: 5 * 60_000,
    retry: 1,
  })
}
