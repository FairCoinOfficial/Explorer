import { useQuery, keepPreviousData, type UseQueryResult } from '@tanstack/react-query'
import { useNetwork } from '@/contexts/network-context'
import { useLiveRefetchInterval } from '@/contexts/blockchain-context'

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
  const refetchInterval = useLiveRefetchInterval()

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
    refetchInterval,
    retry: 1,
  })
}

export interface MasternodeEntry {
  txid: string
  outidx: number
  address: string
  protocol: number
  status: string
  activeTime: number
  lastSeen: number
  lastPaid: number
  rank: number
}

export interface MasternodeListPage {
  masternodes: MasternodeEntry[]
  stats: MasternodeStats
  total: number
  limit: number
  offset: number
}

interface MasternodeListResponse {
  masternodes: MasternodeEntry[]
  stats?: Partial<MasternodeStats>
  network: string
  pagination: { total: number; limit: number; offset: number }
}

const DEFAULT_LIST_LIMIT = 25

/**
 * Paginated masternode rows from `GET /api/masternodes?include=list`.
 * Stats-only callers should keep using {@link useMasternodes}.
 */
export function useMasternodeList(
  limit: number = DEFAULT_LIST_LIMIT,
  offset: number = 0,
): UseQueryResult<MasternodeListPage> {
  const { currentNetwork } = useNetwork()
  const refetchInterval = useLiveRefetchInterval()

  return useQuery<MasternodeListPage>({
    queryKey: ['masternode-list', currentNetwork, limit, offset],
    queryFn: async (): Promise<MasternodeListPage> => {
      const params = new URLSearchParams({
        network: currentNetwork,
        include: 'list',
        limit: String(limit),
        offset: String(offset),
      })
      const response = await fetch(`/api/masternodes?${params}`, {
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) {
        throw new Error(`Failed to load masternode list (${response.status})`)
      }
      const data = (await response.json()) as MasternodeListResponse
      return {
        masternodes: data.masternodes ?? [],
        stats: { ...EMPTY_STATS, ...data.stats },
        total: data.pagination?.total ?? 0,
        limit: data.pagination?.limit ?? limit,
        offset: data.pagination?.offset ?? offset,
      }
    },
    placeholderData: keepPreviousData,
    refetchInterval,
    retry: 1,
  })
}
