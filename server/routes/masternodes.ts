import { Request, Response } from 'express'
import { rpcWithNetwork, NetworkType } from '../lib/rpc'
import { blockCache } from '../lib/cache'

// FairCoin v3.0.0 masternode collateral (MASTER_NODE_AMOUNT in protocol.h)
const COLLATERAL_PER_MASTERNODE = 5000

// FairCoin v3.0.0 block reward is 10 FAIR, MN gets 50% = 5 FAIR
const BLOCK_REWARD = 10

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

export default async function masternodesRoute(req: Request, res: Response) {
  try {
    const network = (req.query.network as string || 'mainnet') as NetworkType
    
    const [
      masternodeList,
      masternodeCount,
      blockHeight,
    ] = await Promise.all([
      blockCache.getMasternodeList(network, 'full').catch(() => ({})),
      rpcWithNetwork<Record<string, number>>('masternode', ['count'], network).catch(() => null),
      blockCache.getBlockCount(network).catch(() => 0),
    ])

    const masternodes: MasternodeEntry[] = Object.entries(masternodeList).map(
      ([txid, data]: [string, unknown]) => parseMasternodeEntry(txid, data)
    )

    const totalSupply = blockHeight > 0 ? blockHeight * BLOCK_REWARD : 33000000
    const totalCollateral = masternodes.length * COLLATERAL_PER_MASTERNODE
    const collateralPercentage = totalSupply > 0 ? (totalCollateral / totalSupply) * 100 : 0

    const statusCounts = masternodes.reduce((acc, mn) => {
      acc[mn.status] = (acc[mn.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

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
        masternodeRewards: 60,
        stakingRewards: 36,
        budgetRewards: 4
      }
    }

    res.json({ 
      masternodes: masternodes.slice(0, 100),
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
    res.status(500).json({ error: message })
  }
}
