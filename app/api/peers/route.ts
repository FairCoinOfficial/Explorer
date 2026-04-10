import { NextRequest, NextResponse } from 'next/server'
import { rpcWithNetwork, NetworkType } from '@/lib/rpc'

export const dynamic = 'force-dynamic'

interface PeerInfo {
  addr: string
  version: number
  subver: string
  pingtime: number
  conntime: number
  startingheight: number
  banscore: number
  bytessent: number
  bytesrecv: number
  inbound: boolean
  synced_headers: number
  synced_blocks: number
}

let cachedPeers: { data: PeerInfo[]; timestamp: number; network: string } | null = null
const CACHE_TTL_MS = 30_000

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const network = (searchParams.get('network') || 'mainnet') as NetworkType

    const now = Date.now()
    if (cachedPeers && cachedPeers.network === network && now - cachedPeers.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ peers: cachedPeers.data, network })
    }

    const rawPeers = await rpcWithNetwork<PeerInfo[]>('getpeerinfo', [], network)

    const peers: PeerInfo[] = rawPeers.map((p) => ({
      addr: p.addr ?? '',
      version: p.version ?? 0,
      subver: p.subver ?? '',
      pingtime: p.pingtime ?? 0,
      conntime: p.conntime ?? 0,
      startingheight: p.startingheight ?? 0,
      banscore: p.banscore ?? 0,
      bytessent: p.bytessent ?? 0,
      bytesrecv: p.bytesrecv ?? 0,
      inbound: Boolean(p.inbound),
      synced_headers: p.synced_headers ?? 0,
      synced_blocks: p.synced_blocks ?? 0,
    }))

    cachedPeers = { data: peers, timestamp: now, network }

    return NextResponse.json({ peers, network })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch peer information'
    console.error('Error fetching peer info:', error)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
