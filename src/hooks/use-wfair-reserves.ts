import { useQuery } from '@tanstack/react-query'
import { WFAIR_CONFIG } from '@/lib/wfair'

export interface ReservesSnapshot {
  at: string
  fairCustodySats: string
  wfairSupplyWei: string
  deltaSats: string
  pegHealthy: boolean
}

export type ReservesResult =
  | { status: 'ok'; data: ReservesSnapshot }
  | { status: 'unavailable' }

export function useWfairReserves() {
  return useQuery<ReservesResult>({
    queryKey: ['wfair', 'reserves', WFAIR_CONFIG.bridgeApiUrl],
    queryFn: async () => {
      try {
        const response = await fetch(WFAIR_CONFIG.bridgeApiUrl, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        })
        if (!response.ok) {
          return { status: 'unavailable' }
        }
        const data = (await response.json()) as ReservesSnapshot
        return { status: 'ok', data }
      } catch (error) {
        console.error('[wfair-reserves] bridge API unreachable:', error)
        return { status: 'unavailable' }
      }
    },
    refetchInterval: 30_000,
    retry: false,
  })
}
