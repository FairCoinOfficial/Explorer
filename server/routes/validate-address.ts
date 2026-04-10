import { Request, Response } from 'express'
import { NetworkType } from '../lib/rpc'
import { blockCache } from '../lib/cache'

export default async function validateAddressRoute(req: Request, res: Response) {
  try {
    const address = req.query.address as string
    const network = (req.query.network as string || 'mainnet') as NetworkType

    if (!address) {
      res.status(400).json({ error: 'Address parameter is required' })
      return
    }

    const validation = await blockCache.validateAddress(address, network)
    res.json(validation)
  } catch (error) {
    console.error('Failed to validate address:', error)
    res.status(500).json({ error: 'Failed to validate address' })
  }
}
