import { NextRequest, NextResponse } from 'next/server'
import { NetworkType } from '@/lib/rpc'
import { blockCache } from '@/lib/cache'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const network = (searchParams.get('network') || 'mainnet') as NetworkType
    
    // Get masternode list and related information using cache
    const [
      masternodeList,
      blockchainInfo
    ] = await Promise.all([
      blockCache.getMasternodeList(network, 'full').catch(() => ({})),
      blockCache.get<any>('getblockchaininfo', [], { network, ttl: 300 }).catch(() => ({ moneysupply: 53193831 }))
    ])

    // Process masternode data
    const masternodes = Object.entries(masternodeList).map(([txid, data]: [string, any]) => {
      const parts = data.split(' ')
      return {
        txid,
        address: parts[0] || '',
        protocol: parseInt(parts[1]) || 0,
        status: parts[2] || 'UNKNOWN',
        activeTime: parseInt(parts[3]) || 0,
        lastSeen: parseInt(parts[4]) || 0,
        pubkey: parts[5] || ''
      }
    })

    // Calculate statistics
    const totalSupply = blockchainInfo.moneysupply || 53193831
    const collateralPerMasternode = 25000 // FairCoin masternode collateral
    const totalCollateral = masternodes.length * collateralPerMasternode
    const collateralPercentage = totalSupply > 0 ? (totalCollateral / totalSupply) * 100 : 0

    // Group masternodes by status
    const statusCounts = masternodes.reduce((acc, mn) => {
      acc[mn.status] = (acc[mn.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const stats = {
      total: masternodes.length,
      enabled: statusCounts.ENABLED || 0,
      preEnabled: statusCounts.PRE_ENABLED || 0,
      expired: statusCounts.EXPIRED || 0,
      newStartRequired: statusCounts.NEW_START_REQUIRED || 0,
      watchdogExpired: statusCounts.WATCHDOG_EXPIRED || 0,
      totalCollateral,
      collateralPercentage,
      averageActiveTime: masternodes.length > 0 
        ? masternodes.reduce((sum, mn) => sum + mn.activeTime, 0) / masternodes.length 
        : 0,
      networkSecurity: {
        masternodeRewards: 45, // Percentage of block rewards going to masternodes
        stakingRewards: 45,    // Percentage going to staking
        budgetRewards: 10      // Percentage for budget/governance
      }
    }

    return NextResponse.json({ 
      masternodes: masternodes.slice(0, 100), // Limit to first 100 for performance
      stats,
      network,
      pagination: {
        total: masternodes.length,
        limit: 100,
        offset: 0
      }
    })
  } catch (error: any) {
    console.error('Error fetching masternode data:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch masternode data' },
      { status: 500 }
    )
  }
}
