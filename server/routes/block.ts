import { Request, Response } from 'express'
import type { NetworkType } from '@fairco.in/rpc-client'
import { blockCache } from '../lib/cache'

export default async function blockRoute(req: Request, res: Response) {
  try {
    const network = (req.query.network as string || 'mainnet') as NetworkType
    const { hashOrHeight } = req.params
    
    const block = await blockCache.getBlock(hashOrHeight, network, true)
    
    res.json({ block, network })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch block'
    console.error('Error fetching block:', error)
    res.status(500).json({ error: message })
  }
}
