import { useQuery } from '@tanstack/react-query'
import { useNetwork } from '@/contexts/network-context'

interface PeerEntry {
  inbound: boolean
}

interface PeersResponse {
  peers: PeerEntry[]
  network: string
}

export interface PeersCount {
  total: number
  inbound: number
  outbound: number
}

export function usePeersCount() {
  const { currentNetwork } = useNetwork()

  return useQuery<PeersCount>({
    queryKey: ['peers-count', currentNetwork],
    queryFn: async (): Promise<PeersCount> => {
      const response = await fetch(`/api/peers?network=${currentNetwork}`, {
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) {
        throw new Error(`Failed to load peers (${response.status})`)
      }
      const data = (await response.json()) as PeersResponse
      const peers = data.peers ?? []
      const inbound = peers.filter((peer) => peer.inbound).length
      return { total: peers.length, inbound, outbound: peers.length - inbound }
    },
    refetchInterval: 30_000,
    retry: 1,
  })
}
