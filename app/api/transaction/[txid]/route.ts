import { NextRequest, NextResponse } from 'next/server'
import { NetworkType } from '@/lib/rpc'
import { blockCache } from '@/lib/cache'

export async function GET(
  request: NextRequest,
  { params }: { params: { txid: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const network = (searchParams.get('network') || 'mainnet') as NetworkType
    const { txid } = params
    
    // Use cached transaction retrieval
    const transaction = await blockCache.getTransaction(txid, network, true)
    
    return NextResponse.json({ 
      transaction,
      network 
    })
  } catch (error: any) {
    console.error('Error fetching transaction:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch transaction' },
      { status: 500 }
    )
  }
}
