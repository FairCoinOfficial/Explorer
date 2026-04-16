import { useQuery } from '@tanstack/react-query'
import { getBasePublicClient } from '@/lib/base-client'
import { WFAIR_ABI, WFAIR_CONFIG } from '@/lib/wfair'

export interface WfairTokenMetadata {
  name: string
  symbol: string
  decimals: number
}

export interface WfairLiveData {
  totalSupply: bigint
  paused: boolean
}

export function useWfairTokenMetadata() {
  return useQuery<WfairTokenMetadata>({
    queryKey: ['wfair', 'metadata', WFAIR_CONFIG.address],
    queryFn: async () => {
      const client = getBasePublicClient()
      const [name, symbol, decimals] = await Promise.all([
        client.readContract({
          address: WFAIR_CONFIG.address,
          abi: WFAIR_ABI,
          functionName: 'name',
        }),
        client.readContract({
          address: WFAIR_CONFIG.address,
          abi: WFAIR_ABI,
          functionName: 'symbol',
        }),
        client.readContract({
          address: WFAIR_CONFIG.address,
          abi: WFAIR_ABI,
          functionName: 'decimals',
        }),
      ])
      return { name, symbol, decimals }
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 2,
  })
}

export function useWfairLiveData() {
  return useQuery<WfairLiveData>({
    queryKey: ['wfair', 'live', WFAIR_CONFIG.address],
    queryFn: async () => {
      const client = getBasePublicClient()
      const [totalSupply, paused] = await Promise.all([
        client.readContract({
          address: WFAIR_CONFIG.address,
          abi: WFAIR_ABI,
          functionName: 'totalSupply',
        }),
        client.readContract({
          address: WFAIR_CONFIG.address,
          abi: WFAIR_ABI,
          functionName: 'paused',
        }),
      ])
      return { totalSupply, paused }
    },
    refetchInterval: 30_000,
    retry: 2,
  })
}
