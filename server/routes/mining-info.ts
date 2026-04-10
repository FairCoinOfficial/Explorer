import { Request, Response } from 'express'
import { NetworkType } from '../lib/rpc'
import { blockCache } from '../lib/cache'

export default async function miningInfoRoute(req: Request, res: Response) {
  try {
    const network = (req.query.network as string || 'mainnet') as NetworkType
    const miningInfo = await blockCache.getMiningInfo(network)
    res.json(miningInfo)
  } catch (error) {
    console.error('Failed to get mining info:', error)
    res.status(500).json({ error: 'Failed to fetch mining information' })
  }
}
