import { NextRequest, NextResponse } from 'next/server'
import { rpcWithNetwork, NetworkType } from '@/lib/rpc'

export async function GET(
  request: NextRequest,
  { params }: { params: { txid: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const network = (searchParams.get('network') || 'mainnet') as NetworkType
    const { txid } = params
    
    // Get transaction details
    const transaction = await rpcWithNetwork<any>('getrawtransaction', [txid, 1], network)
    
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
