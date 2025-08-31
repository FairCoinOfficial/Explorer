import { NextRequest, NextResponse } from 'next/server'
import { rpcWithNetwork, NetworkType } from '@/lib/rpc'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const network = (searchParams.get('network') || 'mainnet') as NetworkType
    
    // Get mempool information
    const [mempoolInfo, rawMempool] = await Promise.all([
      rpcWithNetwork<any>('getmempoolinfo', [], network).catch(() => null),
      rpcWithNetwork<string[]>('getrawmempool', [], network).catch(() => [])
    ])

    // Get detailed info for a few recent transactions
    const recentTxs = rawMempool.slice(0, 20)
    const detailedTxs = []

    for (const txid of recentTxs) {
      try {
        const mempoolEntry = await rpcWithNetwork<any>('getmempoolentry', [txid], network)
        detailedTxs.push({
          txid,
          size: mempoolEntry.size || 0,
          fee: mempoolEntry.fee || 0,
          feeRate: mempoolEntry.ancestorfees ? (mempoolEntry.ancestorfees / mempoolEntry.ancestorsize) : 0,
          time: mempoolEntry.time || Date.now() / 1000,
          depends: mempoolEntry.depends || []
        })
      } catch (error) {
        // If getmempoolentry fails, create a basic entry
        detailedTxs.push({
          txid,
          size: 250, // Average transaction size estimate
          fee: 0.0001, // Basic fee estimate
          feeRate: 1.0, // Basic fee rate estimate
          time: Date.now() / 1000,
          depends: []
        })
      }
    }

    const formattedMempoolInfo = {
      size: rawMempool.length,
      bytes: mempoolInfo?.bytes || rawMempool.length * 250, // Estimate if not available
      usage: mempoolInfo?.usage || 0,
      maxmempool: mempoolInfo?.maxmempool || 67108864, // 64MB default
      mempoolminfee: mempoolInfo?.mempoolminfee || 0.00001,
      transactions: detailedTxs
    }
    
    return NextResponse.json({ 
      mempoolInfo: formattedMempoolInfo,
      network 
    })
  } catch (error: any) {
    console.error('Error fetching mempool info:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch mempool information' },
      { status: 500 }
    )
  }
}
