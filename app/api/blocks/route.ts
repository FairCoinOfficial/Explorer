import { NextRequest, NextResponse } from 'next/server'
import { rpcWithNetwork, NetworkType } from '@/lib/rpc'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const network = (searchParams.get('network') || 'mainnet') as NetworkType
    const limit = parseInt(searchParams.get('limit') || '20')
    
    // Get current block count
    const height = await rpcWithNetwork<number>('getblockcount', [], network)
    
    // Get recent blocks
    const blocks = []
    const startHeight = Math.max(0, height - limit + 1)
    
    for (let i = height; i >= startHeight && blocks.length < limit; i--) {
      try {
        const blockHash = await rpcWithNetwork<string>('getblockhash', [i], network)
        const block = await rpcWithNetwork<any>('getblock', [blockHash, true], network)
        blocks.push({
          height: block.height,
          hash: block.hash,
          time: block.time,
          nTx: block.nTx || block.tx?.length || 0,
          size: block.size,
          tx: block.tx || []
        })
      } catch (error) {
        console.error(`Error fetching block ${i}:`, error)
        // Continue with next block
      }
    }
    
    return NextResponse.json({ 
      blocks,
      height,
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
