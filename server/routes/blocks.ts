import { Request, Response } from 'express'
import type { NetworkType } from '@fairco.in/rpc-client'
import { blockCache } from '../lib/cache'

export default async function blocksRoute(req: Request, res: Response) {
  try {
    const network = (req.query.network as string || 'mainnet') as NetworkType
    const limit = parseInt(req.query.limit as string || '20')
    
    const blocks = await blockCache.getRecentBlocks(network, limit)
    const height = await blockCache.getBlockCount(network)
    
    res.json({ 
      blocks,
      height,
      total: blocks.length,
      network 
    })
  } catch (error) {
    console.error('Error fetching blocks:', error)
    res.status(500).json({ error: 'Failed to fetch blocks' })
  }
}
