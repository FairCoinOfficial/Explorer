import { Request, Response } from 'express'
import { NetworkType } from '../lib/rpc'
import { blockCache } from '../lib/cache'

// FairCoin v3.0.0: block reward is 10 FAIR (halving every 525600 blocks, min 1.25 FAIR)
// Premine: 5,000,000 FAIR on block 1
const BLOCK_REWARD = 10
const PREMINE = 5000000
const HALVING_INTERVAL = 525600
const MIN_REWARD = 1.25

export default async function statsRoute(req: Request, res: Response) {
  try {
    const network = (req.query.network as string || 'mainnet') as NetworkType

    const [
      blockHeight,
      blockchainInfo,
      miningInfo,
      mempoolInfo,
      networkInfo,
      masternodeList
    ] = await Promise.all([
      blockCache.getBlockCount(network).catch(() => 0),
      blockCache.get<Record<string, unknown>>('getblockchaininfo', [], { network, ttl: 300 }).catch(() => null),
      blockCache.getMiningInfo(network).catch(() => null),
      blockCache.getMempoolInfo(network).catch(() => null),
      blockCache.getNetworkInfo(network).catch(() => null),
      blockCache.getMasternodeList(network).catch(() => ({}))
    ])

    // Get latest block info from cache
    const latestBlock = blockHeight > 0 ? await blockCache.getBlock(blockHeight, network, true).catch(() => null) : null

    // FairCoin v3.0.0: moneysupply not available in getblockchaininfo
    // Calculate total supply with halvings: block 1 = premine, then 10 FAIR halving every 525600 blocks
    let totalSupply = PREMINE
    if (blockHeight > 1) {
      let remaining = blockHeight - 1
      let reward = BLOCK_REWARD
      while (remaining > 0 && reward >= MIN_REWARD) {
        const blocksInEra = Math.min(remaining, HALVING_INTERVAL)
        totalSupply += blocksInEra * reward
        remaining -= blocksInEra
        reward = Math.max(reward / 2, MIN_REWARD)
      }
      if (remaining > 0) totalSupply += remaining * MIN_REWARD
    }
    const circulatingSupply = totalSupply
    const masternodeCount = typeof masternodeList === 'object' ? Object.keys(masternodeList).length : 0
    const avgBlockTime = 120 // FairCoin target block time (2 minutes)
    
    // Determine current phase (PoW blocks 1-10000 mainnet / 1-200 testnet, then PoS)
    const lastPowBlock = network === 'testnet' ? 200 : 10000
    const phase = blockHeight > lastPowBlock ? 'PoS' : 'PoW'
    
    // Calculate hashrate for the current phase
    const difficulty = (miningInfo?.difficulty as number) || 0
    const hashrate = phase === 'PoW' 
      ? ((miningInfo?.networkhashps as number) || difficulty * Math.pow(2, 32) / avgBlockTime)
      : 0

    // Current block reward considering halvings
    const halvings = blockHeight > 0 ? Math.floor(blockHeight / HALVING_INTERVAL) : 0
    const currentBlockReward = Math.max(BLOCK_REWARD / Math.pow(2, halvings), MIN_REWARD)
    const masternodeReward = currentBlockReward / 2 // MN gets 50% of block reward
    const stakingRewards = currentBlockReward
    const stakePercentage = 0

    const txField = latestBlock?.tx
    const stats = {
      blockHeight,
      difficulty,
      hashrate,
      totalSupply,
      circulatingSupply,
      avgBlockTime,
      memPoolSize: (mempoolInfo?.size as number) || 0,
      totalTransactions: blockHeight * ((latestBlock?.nTx as number) || 1),
      networkWeight: 0,
      avgTransactionsPerBlock: (latestBlock?.nTx as number) || 1,
      masternodeCount,
      stakingRewards,
      stakePercentage,
      connections: (networkInfo?.connections as number) || 0,
      phase,
      lastBlock: {
        height: (latestBlock?.height as number) || blockHeight,
        hash: (latestBlock?.hash as string) || '',
        time: (latestBlock?.time as number) || Date.now() / 1000,
        size: (latestBlock?.size as number) || 0
      }
    }
    
    // Suppress unused variable warning
    void blockchainInfo
    void txField

    res.json({ stats, network })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch network statistics'
    console.error('Error fetching network stats:', error)
    res.status(500).json({ error: message })
  }
}
