import { Request, Response } from 'express'
import { NetworkType } from '../lib/rpc'
import { blockCache } from '../lib/cache'

export default async function transactionRoute(req: Request, res: Response) {
  try {
    const network = (req.query.network as string || 'mainnet') as NetworkType
    const { txid } = req.params
    
    const transaction = await blockCache.getTransaction(txid, network, true)
    
    res.json({ transaction, network })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch transaction'
    console.error('Error fetching transaction:', error)
    res.status(500).json({ error: message })
  }
}
