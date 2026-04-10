import { NextRequest, NextResponse } from 'next/server'
import { rpcWithNetwork, NetworkType } from '@/lib/rpc'
import { blockCache } from '@/lib/cache'

export const dynamic = 'force-dynamic'

// FairCoin v3.0.0 masternode collateral
const COLLATERAL_PER_MASTERNODE = 10000

// FairCoin v3.0.0 block reward is 5 FAIR per block
const BLOCK_REWARD = 5

interface MasternodeEntry {
  txid: string
  address: string
  protocol: number
  status: string
  activeTime: number
  lastSeen: number
  pubkey: string
}

/**
 * Parse masternode list entries.
 * DASH-format returns space-delimited strings per entry.
 * PIVX-format (FairCoin v3.0.0) may return JSON objects per entry.
 * This handles both gracefully.
 */
function parseMasternodeEntry(txid: string, data: unknown): MasternodeEntry {
  if (typeof data === 'string') {
    // DASH string format: "address protocol status activeTime lastSeen pubkey"
    const parts = data.trim().split(/\s+/)
    return {
      txid,
      address: parts[0] || '',
      protocol: parseInt(parts[1]) || 0,
      status: parts[2] || 'UNKNOWN',
      activeTime: parseInt(parts[3]) || 0,
      lastSeen: parseInt(parts[4]) || 0,
      pubkey: parts[5] || '',
    }
  }

  if (typeof data === 'object' && data !== null) {
    // PIVX/FairCoin v3 JSON object format
    const obj = data as Record<string, unknown>
    return {
      txid,
      address: String(obj.addr ?? obj.address ?? ''),
      protocol: Number(obj.version ?? obj.protocol ?? 0),
      status: String(obj.status ?? 'UNKNOWN'),
      activeTime: Number(obj.activetime ?? obj.activeTime ?? obj.activeseconds ?? 0),
      lastSeen: Number(obj.lastseen ?? obj.lastSeen ?? obj.lastpaid ?? 0),
      pubkey: String(obj.pubkey ?? ''),
    }
  }

  return {
    txid,
    address: '',
    protocol: 0,
    status: 'UNKNOWN',
    activeTime: 0,
    lastSeen: 0,
    pubkey: '',
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const network = (searchParams.get('network') || 'mainnet') as NetworkType
    
    // Get masternode list, count, and block height
    const [
      masternodeList,
      masternodeCount,
      blockHeight,
    ] = await Promise.all([
      blockCache.getMasternodeList(network, 'full').catch(() => ({})),
      rpcWithNetwork<Record<string, number>>('masternode', ['count'], network).catch(() => null),
      blockCache.getBlockCount(network).catch(() => 0),
    ])

    // Process masternode data - handle both DASH string format and PIVX JSON format
    const masternodes: MasternodeEntry[] = Object.entries(masternodeList).map(
      ([txid, data]: [string, unknown]) => parseMasternodeEntry(txid, data)
    )

    // Calculate statistics
    // Estimate total supply from block height since getblockchaininfo doesn't include moneysupply
    const totalSupply = blockHeight > 0 ? blockHeight * BLOCK_REWARD : 33000000
    const totalCollateral = masternodes.length * COLLATERAL_PER_MASTERNODE
    const collateralPercentage = totalSupply > 0 ? (totalCollateral / totalSupply) * 100 : 0

    // Group masternodes by status
    const statusCounts = masternodes.reduce((acc, mn) => {
      acc[mn.status] = (acc[mn.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Use masternode count RPC if available for more accurate numbers
    const enabledCount = masternodeCount?.enabled ?? statusCounts.ENABLED ?? 0
    const totalCount = masternodeCount?.total ?? masternodes.length

    const stats = {
      total: totalCount,
      enabled: enabledCount,
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
        masternodeRewards: 60, // PIVX-based: 60% to masternodes
        stakingRewards: 36,    // 36% to stakers
        budgetRewards: 4       // 4% for budget/governance
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch masternode data'
    console.error('Error fetching masternode data:', error)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
