import { useMemo } from 'react'
import { useQuery, keepPreviousData, type UseQueryResult } from '@tanstack/react-query'
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
  offset?: number
  limit?: number
  network: string
}

export interface RecentBlocksData {
  blocks: RecentBlock[]
  height: number
  /** Tip height + 1 (i.e. total number of blocks including genesis). */
  total: number
  offset: number
  limit: number
}

export interface AggregatedTransaction {
  txid: string
  blockHeight: number
  blockTime: number
}

const DEFAULT_LIMIT = 20

/**
 * Fetch a window of blocks from the tip backwards. The `offset` is the number
 * of blocks skipped from the tip (so offset=0 returns the most recent blocks,
 * offset=100 returns blocks tip-100 down to tip-100-limit+1, etc).
 */
export function useRecentBlocks(
  limit: number = DEFAULT_LIMIT,
  offset: number = 0,
): UseQueryResult<RecentBlocksData> {
  const { currentNetwork } = useNetwork()

  return useQuery<RecentBlocksData>({
    queryKey: ['recent-blocks', currentNetwork, limit, offset],
    queryFn: async (): Promise<RecentBlocksData> => {
      const response = await fetch(
        `/api/blocks?network=${currentNetwork}&limit=${limit}&offset=${offset}`,
        { headers: { Accept: 'application/json' } },
      )
      if (!response.ok) {
        throw new Error(`Failed to load blocks (${response.status})`)
      }
      const data = (await response.json()) as BlocksResponse
      return {
        blocks: data.blocks ?? [],
        height: data.height ?? 0,
        total: data.total ?? (data.height ?? 0) + 1,
        offset: data.offset ?? offset,
        limit: data.limit ?? limit,
      }
    },
    placeholderData: keepPreviousData,
    // Only auto-refresh the tip window; deeper pages are stable history.
    refetchInterval: offset === 0 ? 30_000 : false,
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
