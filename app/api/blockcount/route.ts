import { NextRequest, NextResponse } from 'next/server'
import { NetworkType } from '@/lib/rpc'
import { blockCache } from '@/lib/cache'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const network = (searchParams.get('network') || 'mainnet') as NetworkType
  
  try {
    const blockcount = await blockCache.getBlockCount(network)
    return NextResponse.json({ blockcount, network })
  } catch (error: any) {
    console.error('Error getting block count:', error)
    return NextResponse.json(
      { error: error.message }, 
      { status: 500 }
    )
  }
}
