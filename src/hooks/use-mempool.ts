import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useNetwork } from '@/contexts/network-context'

export interface MempoolTransaction {
  txid: string
  size: number
  /** Fee in FAIR. */
  fee: number
  /** Fee rate (sat/vB). */
  feeRate: number
  /** Unix timestamp in seconds. */
  time: number
  depends: string[]
}

export interface MempoolInfo {
  size: number
  bytes: number
  transactions: MempoolTransaction[]
}

interface MempoolResponse {
  mempoolInfo: MempoolInfo
  network: string
}

export function useMempool(): UseQueryResult<MempoolInfo> {
  const { currentNetwork } = useNetwork()

  return useQuery<MempoolInfo>({
    queryKey: ['mempool', currentNetwork],
    queryFn: async (): Promise<MempoolInfo> => {
      const response = await fetch(`/api/mempool?network=${currentNetwork}`, {
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) {
        throw new Error(`Failed to load mempool (${response.status})`)
      }
      const data = (await response.json()) as MempoolResponse
      const info = data.mempoolInfo
      return {
        size: info?.size ?? 0,
        bytes: info?.bytes ?? 0,
        transactions: info?.transactions ?? [],
      }
    },
    refetchInterval: 30_000,
    retry: 1,
  })
}
