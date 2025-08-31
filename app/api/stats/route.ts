import { NextRequest, NextResponse } from 'next/server'
import { rpcWithNetwork, NetworkType } from '@/lib/rpc'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const network = (searchParams.get('network') || 'mainnet') as NetworkType
    
    // Fetch various network statistics
    const [
      blockHeight,
      blockchainInfo,
      miningInfo,
      mempoolInfo,
      networkInfo,
      masternodeList,
      stakingInfo
    ] = await Promise.all([
      rpcWithNetwork<number>('getblockcount', [], network),
      rpcWithNetwork<any>('getblockchaininfo', [], network).catch(() => null),
      rpcWithNetwork<any>('getmininginfo', [], network).catch(() => null),
      rpcWithNetwork<any>('getmempoolinfo', [], network).catch(() => null),
      rpcWithNetwork<any>('getnetworkinfo', [], network).catch(() => null),
      rpcWithNetwork<any>('masternodelist', [], network).catch(() => ({})),
      rpcWithNetwork<any>('getstakinginfo', [], network).catch(() => ({}))
    ])

    // Get latest block info
    const latestBlockHash = await rpcWithNetwork<string>('getblockhash', [blockHeight], network)
    const latestBlock = await rpcWithNetwork<any>('getblock', [latestBlockHash, true], network)

    // FairCoin-specific calculations
    const totalSupply = blockchainInfo?.moneysupply || 0
    const circulatingSupply = totalSupply * 0.9 // 90% premine is circulating
    const masternodeCount = Object.keys(masternodeList).length
    const avgBlockTime = 120 // FairCoin target block time (2 minutes)
    
    // Determine current phase (PoW blocks 1-25000, PoS 25001+)
    const phase = blockHeight > 25000 ? 'PoS' : 'PoW'
    
    // Calculate hashrate for the current phase
    const difficulty = miningInfo?.difficulty || 0
    const hashrate = phase === 'PoW' 
      ? (miningInfo?.networkhashps || difficulty * Math.pow(2, 32) / avgBlockTime)
      : 0 // PoS doesn't have traditional hashrate

    // Staking information (for PoS phase)
    const stakingRewards = stakingInfo?.expectedtime 
      ? (365 * 24 * 3600) / stakingInfo.expectedtime * 100 
      : 5.0 // Default estimate
    const stakePercentage = stakingInfo?.netstakeweight && totalSupply > 0
      ? (stakingInfo.netstakeweight / totalSupply) * 100 
      : 0

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
      networkWeight: stakingInfo?.netstakeweight || 0,
      avgTransactionsPerBlock: latestBlock?.nTx || 1,
      masternodeCount,
      stakingRewards,
      stakePercentage,
      connections: networkInfo?.connections || 0,
      phase,
      lastBlock: {
        height: latestBlock?.height || blockHeight,
        hash: latestBlock?.hash || latestBlockHash,
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
