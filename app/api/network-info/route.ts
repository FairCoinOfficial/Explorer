import { NextRequest, NextResponse } from 'next/server'
import { rpcWithNetwork, NetworkType } from '@/lib/rpc'

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const network = searchParams.get('network') || 'mainnet'

        const networkInfo = await rpcWithNetwork('getnetworkinfo', [], network as NetworkType)
        
        return NextResponse.json(networkInfo)
    } catch (error) {
        console.error('Failed to get network info:', error)
        return NextResponse.json(
            { error: 'Failed to fetch network information' }, 
            { status: 500 }
        )
    }
}
