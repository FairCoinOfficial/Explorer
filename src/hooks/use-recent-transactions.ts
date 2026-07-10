import { useQuery, keepPreviousData, type UseQueryResult } from '@tanstack/react-query'
import { useNetwork } from '@/contexts/network-context'
import { useLiveRefetchInterval } from '@/contexts/blockchain-context'

export interface RecentTransaction {
  txid: string
  blockHeight: number | null
  time: number
  unconfirmed: boolean
  size?: number
  fee?: number
}

export interface RecentTransactionsData {
  transactions: RecentTransaction[]
  total: number
  offset: number
  limit: number
  height: number
  hasMore: boolean
}

interface RecentTransactionsResponse {
  transactions: RecentTransaction[]
  total: number
  offset: number
  limit: number
  height: number
  hasMore: boolean
  network: string
}

const DEFAULT_LIMIT = 25

/**
 * Paginated recent-transaction feed from `/api/transactions` (mempool tip +
 * recent blocks). Auto-refreshes on the first page so the live feed stays fresh.
 */
export function useRecentTransactions(
  limit: number = DEFAULT_LIMIT,
  offset: number = 0,
  includeMempool = true,
): UseQueryResult<RecentTransactionsData> {
  const { currentNetwork } = useNetwork()
  const liveInterval = useLiveRefetchInterval()

  return useQuery<RecentTransactionsData>({
    queryKey: ['recent-transactions', currentNetwork, limit, offset, includeMempool],
    queryFn: async (): Promise<RecentTransactionsData> => {
      const params = new URLSearchParams({
        network: currentNetwork,
        limit: String(limit),
        offset: String(offset),
        includeMempool: includeMempool ? '1' : '0',
      })
      const response = await fetch(`/api/transactions?${params}`, {
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) {
        throw new Error(`Failed to load transactions (${response.status})`)
      }
      const data = (await response.json()) as RecentTransactionsResponse
      return {
        transactions: data.transactions ?? [],
        total: data.total ?? 0,
        offset: data.offset ?? offset,
        limit: data.limit ?? limit,
        height: data.height ?? 0,
        hasMore: Boolean(data.hasMore),
      }
    },
    placeholderData: keepPreviousData,
    refetchInterval: offset === 0 ? liveInterval : false,
    retry: 1,
  })
}
