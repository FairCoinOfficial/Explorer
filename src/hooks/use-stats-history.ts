import { useQuery } from '@tanstack/react-query'

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
export function useStatsHistory() {
  return useQuery<StatHistoryPoint[]>({
    queryKey: ['stats-history'],
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
