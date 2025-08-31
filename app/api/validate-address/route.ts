import { NextRequest, NextResponse } from 'next/server'
import { NetworkType } from '@/lib/rpc'
import { blockCache } from '@/lib/cache'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const address = searchParams.get('address')
        const network = searchParams.get('network') || 'mainnet'

        if (!address) {
            return NextResponse.json(
                { error: 'Address parameter is required' },
                { status: 400 }
            )
        }

        const validation = await blockCache.validateAddress(address, network as NetworkType)
        
        return NextResponse.json(validation)
    } catch (error) {
        console.error('Failed to validate address:', error)
        return NextResponse.json(
            { error: 'Failed to validate address' }, 
            { status: 500 }
        )
    }
}
