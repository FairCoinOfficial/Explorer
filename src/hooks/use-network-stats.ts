import { useQuery } from '@tanstack/react-query'
import { useNetwork } from '@/contexts/network-context'

export interface NetworkStatsLastBlock {
  height: number
  hash: string
  time: number
  size: number
}

export interface NetworkStats {
  blockHeight: number
  difficulty: number
  hashrate: number
  totalSupply: number
  circulatingSupply: number
  avgBlockTime: number
  memPoolSize: number
  totalTransactions: number
  masternodeCount: number
  stakingRewards: number
  connections: number
  phase: 'PoW' | 'PoS'
  lastBlock: NetworkStatsLastBlock
}

interface StatsResponse {
  stats: NetworkStats
  network: string
}

export function useNetworkStats() {
  const { currentNetwork } = useNetwork()

  return useQuery<NetworkStats>({
    queryKey: ['network-stats', currentNetwork],
    queryFn: async (): Promise<NetworkStats> => {
      const response = await fetch(`/api/stats?network=${currentNetwork}`, {
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) {
        throw new Error(`Failed to load network stats (${response.status})`)
      }
      const data = (await response.json()) as StatsResponse
      return data.stats
    },
    refetchInterval: 30_000,
    retry: 1,
  })
}
