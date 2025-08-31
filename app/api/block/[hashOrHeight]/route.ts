import { NextRequest, NextResponse } from 'next/server'
import { rpcWithNetwork, NetworkType } from '@/lib/rpc'

export async function GET(
  request: NextRequest,
  { params }: { params: { hashOrHeight: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const network = (searchParams.get('network') || 'mainnet') as NetworkType
    const { hashOrHeight } = params
    
    let blockHash = hashOrHeight
    
    // If it's a number, get the block hash first
    if (/^\d+$/.test(hashOrHeight)) {
      const height = parseInt(hashOrHeight, 10)
      blockHash = await rpcWithNetwork<string>('getblockhash', [height], network)
    }
    
    // Get block details
    const block = await rpcWithNetwork<any>('getblock', [blockHash, true], network)
    
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
