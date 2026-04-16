import { Request, Response } from 'express'
import type { NetworkType } from '@fairco.in/rpc-client'
import { blockCache } from '../lib/cache'

export default async function blockcountRoute(req: Request, res: Response) {
  try {
    const network = (req.query.network as string || 'mainnet') as NetworkType
    const blockcount = await blockCache.getBlockCount(network)
    res.json({ blockcount, network })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get block count'
    console.error('Error getting block count:', error)
    res.status(500).json({ error: message })
  }
}
