import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useNetwork } from '@/contexts/network-context'

export interface StatsLastBlock {
  height: number
  hash: string
  time: number
  size: number
}

export interface NetworkStatsData {
  blockHeight: number
  difficulty: number
  hashrate: number
  totalSupply: number
  circulatingSupply: number
  avgBlockTime: number
  memPoolSize: number
  totalTransactions: number
  networkWeight: number
  avgTransactionsPerBlock: number
  masternodeCount: number
  stakingRewards: number
  stakePercentage: number
  connections: number
  phase: 'PoW' | 'PoS'
  lastBlock: StatsLastBlock
}

interface StatsResponse {
  stats: NetworkStatsData
  network: string
}

export function useStats(): UseQueryResult<NetworkStatsData> {
  const { currentNetwork } = useNetwork()

  return useQuery<NetworkStatsData>({
    queryKey: ['stats', currentNetwork],
    queryFn: async (): Promise<NetworkStatsData> => {
      const response = await fetch(`/api/stats?network=${currentNetwork}`, {
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) {
        throw new Error(`Failed to load network statistics (${response.status})`)
      }
      const data = (await response.json()) as StatsResponse
      return data.stats
    },
    refetchInterval: 30_000,
    retry: 1,
  })
}
