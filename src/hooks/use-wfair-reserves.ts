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

const INTEGER_STRING_PATTERN = /^-?\d+$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isIntegerString(value: unknown): value is string {
  return typeof value === 'string' && INTEGER_STRING_PATTERN.test(value)
}

function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function parseReservesSnapshot(value: unknown): ReservesSnapshot | null {
  if (!isRecord(value)) {
    return null
  }

  const { at, fairCustodySats, wfairSupplyWei, deltaSats, pegHealthy } = value
  if (
    !isValidDateString(at) ||
    !isIntegerString(fairCustodySats) ||
    !isIntegerString(wfairSupplyWei) ||
    !isIntegerString(deltaSats) ||
    typeof pegHealthy !== 'boolean'
  ) {
    return null
  }

  try {
    BigInt(fairCustodySats)
    BigInt(wfairSupplyWei)
    BigInt(deltaSats)
  } catch {
    return null
  }

  return { at, fairCustodySats, wfairSupplyWei, deltaSats, pegHealthy }
}

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
        const data = parseReservesSnapshot(await response.json())
        if (!data) {
          console.warn('[wfair-reserves] reserves API returned invalid data')
          return { status: 'unavailable' }
        }
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
