import { useMemo } from 'react'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useNetwork } from '@/contexts/network-context'

export interface RecentBlock {
  height: number
  hash: string
  time: number
  nTx: number
  size: number
  tx: string[]
}

interface BlocksResponse {
  blocks: RecentBlock[]
  height: number
  total: number
  network: string
}

export interface RecentBlocksData {
  blocks: RecentBlock[]
  height: number
}

export interface AggregatedTransaction {
  txid: string
  blockHeight: number
  blockTime: number
}

const DEFAULT_LIMIT = 20

export function useRecentBlocks(limit: number = DEFAULT_LIMIT): UseQueryResult<RecentBlocksData> {
  const { currentNetwork } = useNetwork()

  return useQuery<RecentBlocksData>({
    queryKey: ['recent-blocks', currentNetwork, limit],
    queryFn: async (): Promise<RecentBlocksData> => {
      const response = await fetch(`/api/blocks?network=${currentNetwork}&limit=${limit}`, {
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) {
        throw new Error(`Failed to load blocks (${response.status})`)
      }
      const data = (await response.json()) as BlocksResponse
      return { blocks: data.blocks ?? [], height: data.height ?? 0 }
    },
    refetchInterval: 30_000,
    retry: 1,
  })
}

/**
 * Flatten txids across the most recent blocks into a single feed, newest first,
 * preserving each transaction's real block height and time.
 */
export function aggregateTransactions(
  blocks: RecentBlock[] | undefined,
  max: number,
): AggregatedTransaction[] {
  if (!blocks) return []
  const out: AggregatedTransaction[] = []
  for (const block of blocks) {
    for (const txid of block.tx) {
      out.push({ txid, blockHeight: block.height, blockTime: block.time })
      if (out.length >= max) return out
    }
  }
  return out
}

/** Derived feed of the latest transactions aggregated across recent blocks. */
export function useLatestTransactions(
  blocks: RecentBlock[] | undefined,
  max: number = 20,
): AggregatedTransaction[] {
  return useMemo(() => aggregateTransactions(blocks, max), [blocks, max])
}
