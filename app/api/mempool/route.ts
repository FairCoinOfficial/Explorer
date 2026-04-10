import { NextRequest, NextResponse } from 'next/server'
import { rpcWithNetwork, NetworkType } from '@/lib/rpc'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const network = (searchParams.get('network') || 'mainnet') as NetworkType
    
    // Get mempool information
    const [mempoolInfo, rawMempool] = await Promise.all([
      rpcWithNetwork<Record<string, unknown>>('getmempoolinfo', [], network).catch(() => null),
      rpcWithNetwork<string[]>('getrawmempool', [], network).catch(() => [])
    ])

    // Get detailed info for a few recent transactions
    const recentTxs = rawMempool.slice(0, 20)
    const detailedTxs = []

    for (const txid of recentTxs) {
      try {
        const mempoolEntry = await rpcWithNetwork<Record<string, unknown>>('getmempoolentry', [txid], network)
        detailedTxs.push({
          txid,
          size: Number(mempoolEntry.size ?? 0),
          fee: Number(mempoolEntry.fee ?? 0),
          feeRate: mempoolEntry.ancestorfees && mempoolEntry.ancestorsize
            ? Number(mempoolEntry.ancestorfees) / Number(mempoolEntry.ancestorsize)
            : 0,
          time: Number(mempoolEntry.time ?? Date.now() / 1000),
          depends: (mempoolEntry.depends as string[]) ?? []
        })
      } catch {
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

    // FairCoin v3.0.0 getmempoolinfo only returns {size, bytes}
    // Do not fabricate fields that don't exist in the RPC response
    const formattedMempoolInfo = {
      size: rawMempool.length,
      bytes: Number(mempoolInfo?.bytes ?? rawMempool.length * 250),
      transactions: detailedTxs
    }
    
    return NextResponse.json({ 
      mempoolInfo: formattedMempoolInfo,
      network 
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch mempool information'
    console.error('Error fetching mempool info:', error)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
