import { useQuery } from '@tanstack/react-query'

/**
 * Same-origin reserves endpoint. The explorer API proxies the bridge's
 * `https://bridge.fairco.in/api/bridge/reserves` (which sends no CORS header)
 * and serves it here, so the browser fetch stays same-origin and CSP-compliant.
 */
const RESERVES_ENDPOINT = '/api/bridge/reserves'

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
    queryKey: ['wfair', 'reserves', RESERVES_ENDPOINT],
    queryFn: async () => {
      try {
        const response = await fetch(RESERVES_ENDPOINT, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        })
        if (!response.ok) {
          return { status: 'unavailable' }
        }
        const data = (await response.json()) as ReservesSnapshot
        return { status: 'ok', data }
      } catch (error) {
        console.error('[wfair-reserves] reserves API unreachable:', error)
        return { status: 'unavailable' }
      }
    },
    refetchInterval: 30_000,
    retry: false,
  })
}
