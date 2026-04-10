import { NextRequest, NextResponse } from 'next/server'
import { NetworkType } from '@/lib/rpc'
import { blockCache } from '@/lib/cache'

export const dynamic = 'force-dynamic'

// FairCoin v3.0.0 block reward is 5 FAIR per block
const BLOCK_REWARD = 5

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const network = (searchParams.get('network') || 'mainnet') as NetworkType

    // Fetch various network statistics using cache
    const [
      blockHeight,
      blockchainInfo,
      miningInfo,
      mempoolInfo,
      networkInfo,
      masternodeList
    ] = await Promise.all([
      blockCache.getBlockCount(network).catch(() => 0),
      blockCache.get<any>('getblockchaininfo', [], { network, ttl: 300 }).catch(() => null),
      blockCache.getMiningInfo(network).catch(() => null),
      blockCache.getMempoolInfo(network).catch(() => null),
      blockCache.getNetworkInfo(network).catch(() => null),
      blockCache.getMasternodeList(network).catch(() => ({}))
    ])

    // Get latest block info from cache
    const latestBlock = blockHeight > 0 ? await blockCache.getBlock(blockHeight, network, true).catch(() => null) : null

    // FairCoin v3.0.0: moneysupply not available in getblockchaininfo
    // Estimate total supply as blockHeight * blockReward
    const totalSupply = blockHeight > 0 ? blockHeight * BLOCK_REWARD : 0
    const circulatingSupply = totalSupply
    const masternodeCount = typeof masternodeList === 'object' ? Object.keys(masternodeList).length : 0
    const avgBlockTime = 120 // FairCoin target block time (2 minutes)
    
    // Determine current phase (PoW blocks 1-10000, PoS 10001+)
    const phase = blockHeight > 10000 ? 'PoS' : 'PoW'
    
    // Calculate hashrate for the current phase
    const difficulty = miningInfo?.difficulty || 0
    const hashrate = phase === 'PoW' 
      ? (miningInfo?.networkhashps || difficulty * Math.pow(2, 32) / avgBlockTime)
      : 0 // PoS doesn't have traditional hashrate

    // Staking information - getstakinginfo does not exist on v3.0.0
    const stakingRewards = BLOCK_REWARD
    const stakePercentage = 0

    // Calculate some derived statistics
    const stats = {
      blockHeight,
      difficulty,
      hashrate,
      totalSupply,
      circulatingSupply,
      avgBlockTime,
      memPoolSize: mempoolInfo?.size || 0,
      totalTransactions: blockHeight * (latestBlock?.nTx || 1),
      networkWeight: 0,
      avgTransactionsPerBlock: latestBlock?.nTx || 1,
      masternodeCount,
      stakingRewards,
      stakePercentage,
      connections: networkInfo?.connections || 0,
      phase,
      lastBlock: {
        height: latestBlock?.height || blockHeight,
        hash: latestBlock?.hash || '',
        time: latestBlock?.time || Date.now() / 1000,
        size: latestBlock?.size || 0
      }
    }
    
    return NextResponse.json({ 
      stats,
      network 
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch network statistics'
    console.error('Error fetching network stats:', error)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
