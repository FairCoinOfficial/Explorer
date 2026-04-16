import { Request, Response } from 'express'
import { rpcWithNetwork, type NetworkType } from '@fairco.in/rpc-client'

export default async function mempoolRoute(req: Request, res: Response) {
  try {
    const network = (req.query.network as string || 'mainnet') as NetworkType
    
    const [mempoolInfo, rawMempool] = await Promise.all([
      rpcWithNetwork<Record<string, unknown>>('getmempoolinfo', [], network).catch(() => null),
      rpcWithNetwork<string[]>('getrawmempool', [], network).catch(() => [])
    ])

    const recentTxs = rawMempool.slice(0, 20)
    const detailedTxs = []

    for (const txid of recentTxs) {
      try {
        const mempoolEntry = await rpcWithNetwork<Record<string, unknown>>('getmempoolentry', [txid], network)
        detailedTxs.push({
          txid,
          size: Number(mempoolEntry.size ?? 0),
          fee: Number(mempoolEntry.fee ?? 0),
          feeRate: mempoolEntry.ancestorfees && mempoolEntry.ancestorsize
            ? Number(mempoolEntry.ancestorfees) / Number(mempoolEntry.ancestorsize)
            : 0,
          time: Number(mempoolEntry.time ?? Date.now() / 1000),
          depends: (mempoolEntry.depends as string[]) ?? []
        })
      } catch {
        // If getmempoolentry fails, create a basic entry
        detailedTxs.push({
          txid,
          size: 250,
          fee: 0.0001,
          feeRate: 1.0,
          time: Date.now() / 1000,
          depends: [] as string[]
        })
      }
    }

    const formattedMempoolInfo = {
      size: rawMempool.length,
      bytes: Number(mempoolInfo?.bytes ?? rawMempool.length * 250),
      transactions: detailedTxs
    }
    
    res.json({ mempoolInfo: formattedMempoolInfo, network })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch mempool information'
    console.error('Error fetching mempool info:', error)
    res.status(500).json({ error: message })
  }
}
