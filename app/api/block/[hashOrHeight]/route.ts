import { NextRequest, NextResponse } from 'next/server'
import { NetworkType } from '@/lib/rpc'
import { blockCache } from '@/lib/cache'

export async function GET(
  request: NextRequest,
  { params }: { params: { hashOrHeight: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const network = (searchParams.get('network') || 'mainnet') as NetworkType
    const { hashOrHeight } = params
    
    // Use cached block retrieval
    const block = await blockCache.getBlock(hashOrHeight, network, true)
    
    return NextResponse.json({ 
      block,
      network 
    })
  } catch (error: any) {
    console.error('Error fetching block:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch block' },
      { status: 500 }
    )
  }
}
