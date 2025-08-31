import { NextRequest, NextResponse } from 'next/server'
import { NetworkType } from '@/lib/rpc'
import { blockCache } from '@/lib/cache'

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
      blockCache.getBlockCount(network),
      blockCache.get<any>('getblockchaininfo', [], { network, ttl: 300 }).catch(() => null),
      blockCache.getMiningInfo(network).catch(() => null),
      blockCache.getMempoolInfo(network).catch(() => null),
      blockCache.getNetworkInfo(network).catch(() => null),
      blockCache.getMasternodeList(network).catch(() => ({}))
    ])

    // Get latest block info from cache
    const latestBlock = await blockCache.getBlock(blockHeight, network, true)

    // FairCoin-specific calculations
    const totalSupply = blockchainInfo?.moneysupply || 53193831 // Max supply if not available
    const circulatingSupply = totalSupply * 0.9 // 90% premine is circulating
    const masternodeCount = typeof masternodeList === 'object' ? Object.keys(masternodeList).length : 0
    const avgBlockTime = 120 // FairCoin target block time (2 minutes)
    
    // Determine current phase (PoW blocks 1-25000, PoS 25001+)
    const phase = blockHeight > 25000 ? 'PoS' : 'PoW'
    
    // Calculate hashrate for the current phase
    const difficulty = miningInfo?.difficulty || 0
    const hashrate = phase === 'PoW' 
      ? (miningInfo?.networkhashps || difficulty * Math.pow(2, 32) / avgBlockTime)
      : 0 // PoS doesn't have traditional hashrate

    // Staking information (for PoS phase)
    const stakingRewards = 5.0 // FairCoin PoS rewards estimate
    const stakePercentage = 0 // Will need getstakinginfo RPC command

    // Calculate some derived statistics
    const stats = {
      blockHeight,
      difficulty,
      hashrate,
      totalSupply,
      circulatingSupply,
      avgBlockTime,
      memPoolSize: mempoolInfo?.size || 0,
      totalTransactions: blockHeight * (latestBlock?.nTx || 1), // Better estimate based on actual transactions
      networkWeight: 0, // Will need getstakinginfo
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
  } catch (error: any) {
    console.error('Error fetching network stats:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch network statistics' },
      { status: 500 }
    )
  }
}
