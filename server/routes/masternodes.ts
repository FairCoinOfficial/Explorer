import { Request, Response } from 'express'
import { type NetworkType } from '@fairco.in/rpc-client'
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
 * Parse a masternode list entry.
 * FairCoin's `masternodelist` (no filter) returns an array of objects:
 * `{ rank, txhash, outidx, status, addr, version, lastseen, activetime, lastpaid }`.
 */
function parseMasternodeEntry(data: unknown): MasternodeEntry {
  const obj = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>
  return {
    txid: String(obj.txhash ?? ''),
    address: String(obj.addr ?? ''),
    protocol: Number(obj.version ?? 0),
    status: String(obj.status ?? 'UNKNOWN'),
    activeTime: Number(obj.activetime ?? 0),
    lastSeen: Number(obj.lastseen ?? 0),
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
      // No filter → full array of masternodes (passing 'full' would be treated as
      // a search filter that matches nothing). See BlockCache.getMasternodeList.
      blockCache.getMasternodeList(network).catch(() => [] as unknown[]),
      blockCache.getMasternodeCount(network).catch(() => null),
      blockCache.getBlockCount(network).catch(() => 0),
    ])

    const masternodes: MasternodeEntry[] = (Array.isArray(masternodeList) ? masternodeList : []).map(
      (data: unknown) => parseMasternodeEntry(data)
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
