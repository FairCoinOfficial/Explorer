import { Request, Response } from 'express'
import { blockCache } from '../lib/cache'
import type { NetworkType } from '@fairco.in/rpc-client'

export default async function searchRoute(req: Request, res: Response) {
  try {
    const q = ((req.query.q as string) || '').trim()
    const network = (req.query.network as string || 'mainnet') as NetworkType
    
    if (!q) {
      res.status(400).json({ error: 'No search query provided' })
      return
    }

    let searchResults: Record<string, unknown> | null = null
    let searchType = 'unknown'

    // Block height (numeric)
    if (/^\d+$/.test(q)) {
      searchType = 'block_height'
      try {
        const block = await blockCache.getBlock(parseInt(q), network, true)
        if (block) {
          const txField = block.tx
          searchResults = {
            height: block.height,
            hash: block.hash,
            time: block.time,
            size: block.size,
            nTx: block.nTx || (Array.isArray(txField) ? txField.length : 0),
            tx: block.tx || [],
            previousblockhash: block.previousblockhash,
            nextblockhash: block.nextblockhash,
            merkleroot: block.merkleroot,
            version: block.version,
            bits: block.bits,
            nonce: block.nonce,
            difficulty: block.difficulty,
            chainwork: block.chainwork
          }
        }
      } catch (error) {
        console.error('Error fetching block by height:', error)
      }
    }
    
    // 64-character hex (could be block hash or txid)
    else if (/^[0-9a-fA-F]{64}$/i.test(q)) {
      // Try block first
      try {
        const block = await blockCache.getBlock(q, network, true)
        if (block) {
          searchType = 'block_hash'
          const txField = block.tx
          searchResults = {
            height: block.height,
            hash: block.hash,
            time: block.time,
            size: block.size,
            nTx: block.nTx || (Array.isArray(txField) ? txField.length : 0),
            tx: block.tx || [],
            previousblockhash: block.previousblockhash,
            nextblockhash: block.nextblockhash,
            merkleroot: block.merkleroot,
            version: block.version,
            bits: block.bits,
            nonce: block.nonce,
            difficulty: block.difficulty,
            chainwork: block.chainwork
          }
        }
      } catch (error) {
        console.error('Error fetching block by hash:', error)
      }

      if (!searchResults) {
        try {
          const transaction = await blockCache.getTransaction(q, network, true)
          if (transaction) {
            searchType = 'transaction'
            searchResults = {
              txid: transaction.txid,
              version: transaction.version,
              size: transaction.size,
              vsize: transaction.vsize,
              weight: transaction.weight,
              locktime: transaction.locktime,
              vin: transaction.vin || [],
              vout: transaction.vout || [],
              blockhash: transaction.blockhash,
              confirmations: transaction.confirmations,
              time: transaction.time,
              blocktime: transaction.blocktime,
              hex: transaction.hex
            }
          }
        } catch (error) {
          console.error('Error fetching transaction:', error)
        }
      }
    }
    
    // FairCoin address pattern
    else if (/^[fFmn2][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{24,61}$/i.test(q)) {
      searchType = 'address'
      try {
        const addressInfo: Record<string, unknown> = {
          address: q,
          balance: 0,
          totalReceived: 0,
          totalSent: 0,
          txCount: 0,
          transactions: [],
          isValid: true,
          network: network
        }
        
        try {
          searchResults = addressInfo
        } catch (error) {
          console.error('Error validating address:', error)
          searchResults = addressInfo
        }
      } catch (error) {
        console.error('Error processing address:', error)
      }
    }
    
    // Partial hash (less than 64 characters)
    else if (/^[0-9a-fA-F]{8,63}$/i.test(q)) {
      searchType = 'partial_hash'
      searchResults = {
        suggestion: 'Complete the hash to get accurate results',
        partial: q,
        type: 'partial_hash',
        length: q.length,
        requiredLength: 64
      }
    }
    
    if (searchResults) {
      res.json({
        query: q,
        network: network,
        type: searchType,
        results: searchResults,
        timestamp: new Date().toISOString()
      })
      return
    }

    res.json({
      query: q,
      network: network,
      type: 'not_found',
      results: null,
      message: 'No results found for this query',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Search API error:', error)
    res.status(500).json({ 
      error: 'Search failed', 
      message: 'An error occurred while processing your search',
      timestamp: new Date().toISOString()
    })
  }
}
