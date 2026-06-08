import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useNetwork } from '@/contexts/network-context'

export interface Block {
  hash: string
  height: number
  version: number
  merkleroot: string
  time: number
  nonce: number
  bits: string
  difficulty: number
  chainwork: string
  nTx?: number
  size: number
  weight?: number
  tx: string[]
  previousblockhash?: string
  nextblockhash?: string
  confirmations: number
}

interface BlockResponse {
  block: Block
  network: string
}

export function useBlock(hashOrHeight: string): UseQueryResult<Block> {
  const { currentNetwork } = useNetwork()

  return useQuery<Block>({
    queryKey: ['block', hashOrHeight, currentNetwork],
    queryFn: async (): Promise<Block> => {
      const response = await fetch(`/api/block/${hashOrHeight}?network=${currentNetwork}`, {
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) {
        throw new Error(await readErrorMessage(response))
      }
      const data = (await response.json()) as BlockResponse
      return data.block
    },
    refetchInterval: 30_000,
    retry: 1,
  })
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string }
    if (body.error) return body.error
  } catch {
    // Fall through to the generic status-based message below.
  }
  return `Failed to load block (${response.status})`
}
