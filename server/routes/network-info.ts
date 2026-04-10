import { Request, Response } from 'express'
import { NetworkType } from '../lib/rpc'
import { blockCache } from '../lib/cache'

export default async function networkInfoRoute(req: Request, res: Response) {
  try {
    const network = (req.query.network as string || 'mainnet') as NetworkType
    const networkInfo = await blockCache.getNetworkInfo(network)
    res.json(networkInfo)
  } catch (error) {
    console.error('Failed to get network info:', error)
    res.status(500).json({ error: 'Failed to fetch network information' })
  }
}
