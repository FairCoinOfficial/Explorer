// Thin alias over use-stats so all consumers share ONE React Query cache entry
// (queryKey ['stats', network]) instead of double-polling /api/stats every 30s
// under two different keys.
import type { UseQueryResult } from '@tanstack/react-query'
import { useStats, type NetworkStatsData, type StatsLastBlock } from './use-stats'

export type NetworkStatsLastBlock = StatsLastBlock
export type NetworkStats = NetworkStatsData

export function useNetworkStats(): UseQueryResult<NetworkStats> {
  return useStats()
}
