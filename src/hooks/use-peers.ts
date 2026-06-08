import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useNetwork } from '@/contexts/network-context'

export interface Peer {
  addr: string
  version: number
  subver: string
  /** Round-trip ping in seconds. */
  pingtime: number
  /** Unix timestamp (seconds) the connection was established. */
  conntime: number
  startingheight: number
  banscore: number
  bytessent: number
  bytesrecv: number
  inbound: boolean
  synced_headers: number
  synced_blocks: number
}

interface PeersResponse {
  peers: Peer[]
  network: string
}

export interface PeersData {
  peers: Peer[]
  total: number
  inbound: number
  outbound: number
}

export function usePeers(): UseQueryResult<PeersData> {
  const { currentNetwork } = useNetwork()

  return useQuery<PeersData>({
    queryKey: ['peers', currentNetwork],
    queryFn: async (): Promise<PeersData> => {
      const response = await fetch(`/api/peers?network=${currentNetwork}`, {
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) {
        throw new Error(`Failed to load peers (${response.status})`)
      }
      const data = (await response.json()) as PeersResponse
      const peers = data.peers ?? []
      const inbound = peers.filter((peer) => peer.inbound).length
      return {
        peers,
        total: peers.length,
        inbound,
        outbound: peers.length - inbound,
      }
    },
    refetchInterval: 30_000,
    retry: 1,
  })
}
