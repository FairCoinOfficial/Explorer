import { NextRequest, NextResponse } from 'next/server'
import { NetworkType } from '@/lib/rpc'
import { blockCache } from '@/lib/cache'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const network = (searchParams.get('network') || 'mainnet') as NetworkType
    const limit = parseInt(searchParams.get('limit') || '20')
    
    // Get recent blocks from cache
    const blocks = await blockCache.getRecentBlocks(network, limit)
    const height = await blockCache.getBlockCount(network)
    
    return NextResponse.json({ 
      blocks,
      height,
      total: blocks.length,
      network 
    })
  } catch (error) {
    console.error('Error fetching blocks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch blocks' },
      { status: 500 }
    )
  }
}
