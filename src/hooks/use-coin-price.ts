import { useQuery } from '@tanstack/react-query'

export interface CoinPrice {
  usd: number
  eur: number
  btc: number
}

export interface PriceChange24h {
  usd: number
  eur: number
  btc: number
}

export interface CoinPriceData {
  price: CoinPrice | null
  source: string | null
  timestamp: string | null
  change24h: PriceChange24h | null
}

interface PriceResponse {
  price: CoinPrice | null
  source?: string
  timestamp?: string
  change_24h?: PriceChange24h | null
  message?: string
}

export interface PriceHistoryPoint {
  price_usd: number
  price_eur: number
  price_btc: number
  timestamp: string
}

interface PriceHistoryResponse {
  history: PriceHistoryPoint[]
  period: string
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
        source: data.source ?? null,
        timestamp: data.timestamp ?? null,
        change24h: data.change_24h ?? null,
      }
    },
    refetchInterval: 60_000,
    retry: 1,
  })
}

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
