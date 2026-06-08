import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useNetwork } from '@/contexts/network-context'

interface BlockCountResponse {
  blockcount: number
  network: string
}

interface NetworkInfoResponse {
  version?: number
  subversion?: string
  protocolversion?: number
  connections?: number
  relayfee?: number
}

interface MiningInfoResponse {
  blocks?: number
  difficulty?: number
  networkhashps?: number
  pooledtx?: number
  chain?: string
}

export interface NodeStatus {
  blockHeight: number
  connections: number
  difficulty: number
  /** Network hashrate in raw hashes per second. */
  hashrate: number
  subversion: string
  protocolVersion: number
  chain: string
  pooledTx: number
  relayFee: number
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) {
    return null
  }
  return (await response.json()) as T
}

export function useNodeStatus(): UseQueryResult<NodeStatus> {
  const { currentNetwork } = useNetwork()

  return useQuery<NodeStatus>({
    queryKey: ['node-status', currentNetwork],
    queryFn: async (): Promise<NodeStatus> => {
      const [blockCount, networkInfo, miningInfo] = await Promise.all([
        fetchJson<BlockCountResponse>(`/api/blockcount?network=${currentNetwork}`),
        fetchJson<NetworkInfoResponse>(`/api/network-info?network=${currentNetwork}`),
        fetchJson<MiningInfoResponse>(`/api/mining-info?network=${currentNetwork}`),
      ])

      if (!blockCount) {
        throw new Error('Failed to load node status')
      }

      return {
        blockHeight: blockCount.blockcount ?? miningInfo?.blocks ?? 0,
        connections: networkInfo?.connections ?? 0,
        difficulty: miningInfo?.difficulty ?? 0,
        hashrate: miningInfo?.networkhashps ?? 0,
        subversion: networkInfo?.subversion ?? '',
        protocolVersion: networkInfo?.protocolversion ?? 0,
        chain: miningInfo?.chain ?? currentNetwork,
        pooledTx: miningInfo?.pooledtx ?? 0,
        relayFee: networkInfo?.relayfee ?? 0,
      }
    },
    refetchInterval: 30_000,
    retry: 1,
  })
}
