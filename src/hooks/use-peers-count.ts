// Derived view over use-peers so both hooks share ONE React Query cache entry
// (queryKey ['peers', network]) instead of fetching the full peer list twice
// every 30s under two different keys.
import { usePeers } from './use-peers'

export interface PeersCount {
  total: number
  inbound: number
  outbound: number
}

export function usePeersCount() {
  const query = usePeers()
  const data: PeersCount | undefined = query.data
    ? { total: query.data.total, inbound: query.data.inbound, outbound: query.data.outbound }
    : undefined
  return { ...query, data }
}
