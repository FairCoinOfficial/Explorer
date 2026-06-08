import { useQuery } from '@tanstack/react-query'

/**
 * FAIR price, sourced from WFAIR (wrapped-FAIR, 1:1) on Base L2 via the
 * server-side `/api/price` endpoint. `price` is `null` until a priced Uniswap
 * pool exists — that is an honest, expected state, not an error.
 */
export interface CoinPriceData {
  price: number | null
  change24h: number | null
  volume24h: number | null
  liquidityUsd: number | null
  marketCapUsd: number | null
  source: string | null
  updatedAt: string | null
}

interface PriceResponse {
  price: number | null
  change24h?: number | null
  volume24h?: number | null
  liquidityUsd?: number | null
  marketCapUsd?: number | null
  source?: string | null
  updatedAt?: string | null
}

export interface PriceHistoryPoint {
  price_usd: number
  timestamp: string
}

interface PriceHistoryResponse {
  history: PriceHistoryPoint[]
  source?: string
}

export function useCoinPrice() {
  return useQuery<CoinPriceData>({
    queryKey: ['coin-price'],
    queryFn: async (): Promise<CoinPriceData> => {
      const response = await fetch('/api/price', { headers: { Accept: 'application/json' } })
      if (!response.ok) {
        throw new Error(`Failed to load price (${response.status})`)
      }
      const data = (await response.json()) as PriceResponse
      return {
        price: data.price,
        change24h: data.change24h ?? null,
        volume24h: data.volume24h ?? null,
        liquidityUsd: data.liquidityUsd ?? null,
        marketCapUsd: data.marketCapUsd ?? null,
        source: data.source ?? null,
        updatedAt: data.updatedAt ?? null,
      }
    },
    refetchInterval: 3 * 60_000,
    retry: 1,
  })
}

/**
 * Price history for the sparkline. WFAIR has no priced pool yet, so the server
 * returns an empty series; this hook stays in place so the chart fills in
 * automatically once pool OHLCV becomes available.
 */
export function usePriceHistory(period: '24h' | '7d' | '30d' | '1y' | 'all' = '7d') {
  return useQuery<PriceHistoryPoint[]>({
    queryKey: ['coin-price-history', period],
    queryFn: async (): Promise<PriceHistoryPoint[]> => {
      const response = await fetch(`/api/price/history?period=${period}`, {
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) {
        throw new Error(`Failed to load price history (${response.status})`)
      }
      const data = (await response.json()) as PriceHistoryResponse
      return data.history ?? []
    },
    refetchInterval: 5 * 60_000,
    retry: 1,
  })
}
