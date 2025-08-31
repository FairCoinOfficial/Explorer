import { NextRequest, NextResponse } from 'next/server'
import { NetworkType } from '@/lib/rpc'
import { blockCache } from '@/lib/cache'

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const network = searchParams.get('network') || 'mainnet'

        const miningInfo = await blockCache.getMiningInfo(network as NetworkType)
        
        return NextResponse.json(miningInfo)
    } catch (error) {
        console.error('Failed to get mining info:', error)
        return NextResponse.json(
            { error: 'Failed to fetch mining information' }, 
            { status: 500 }
        )
    }
}
