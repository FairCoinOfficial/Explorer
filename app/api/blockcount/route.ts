import { NextRequest, NextResponse } from 'next/server'
import { rpcWithNetwork, NetworkType } from '@/lib/rpc'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const network = (searchParams.get('network') || 'mainnet') as NetworkType
  
  try {
    const blockCount = await rpcWithNetwork<number>('getblockcount', [], network)
    return NextResponse.json({ blockCount, network })
  } catch (error: any) {
    console.error('Error getting block count:', error)
    return NextResponse.json(
      { error: error.message }, 
      { status: 500 }
    )
  }
}
