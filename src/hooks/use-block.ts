import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useNetwork } from '@/contexts/network-context'
import { readErrorMessage } from '@/lib/read-error-message'

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
        throw new Error(await readErrorMessage(response, 'block'))
      }
      const data = (await response.json()) as BlockResponse
      return data.block
    },
    refetchInterval: 30_000,
    retry: 1,
  })
}
