import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useNetwork } from '@/contexts/network-context'

/**
 * FairCoin v3.0.0 protocol constants. The masternode collateral and reward split
 * are fixed protocol parameters (see `protocol.h`): a 10 FAIR block reward is shared
 * 50% to the paid masternode and 50% to the staker, with no budget allocation.
 */
export const MASTERNODE_COLLATERAL = 5000
export const REWARD_SPLIT = {
  masternode: 50,
  staker: 50,
} as const

export interface MasternodeStats {
  total: number
  enabled: number
  preEnabled: number
  expired: number
  newStartRequired: number
  watchdogExpired: number
  totalCollateral: number
  collateralPercentage: number
  averageActiveTime: number
}

interface MasternodesResponse {
  stats?: Partial<MasternodeStats>
  network: string
}

const EMPTY_STATS: MasternodeStats = {
  total: 0,
  enabled: 0,
  preEnabled: 0,
  expired: 0,
  newStartRequired: 0,
  watchdogExpired: 0,
  totalCollateral: 0,
  collateralPercentage: 0,
  averageActiveTime: 0,
}

export function useMasternodes(): UseQueryResult<MasternodeStats> {
  const { currentNetwork } = useNetwork()

  return useQuery<MasternodeStats>({
    queryKey: ['masternodes', currentNetwork],
    queryFn: async (): Promise<MasternodeStats> => {
      const response = await fetch(`/api/masternodes?network=${currentNetwork}`, {
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) {
        throw new Error(`Failed to load masternodes (${response.status})`)
      }
      const data = (await response.json()) as MasternodesResponse
      return { ...EMPTY_STATS, ...data.stats }
    },
    refetchInterval: 30_000,
    retry: 1,
  })
}
