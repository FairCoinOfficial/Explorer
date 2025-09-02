import { NextRequest, NextResponse } from 'next/server';
import { blockCache } from '@/lib/cache';
import { NetworkType } from '@/lib/rpc';

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const q = (req.nextUrl.searchParams.get('q') || '').trim();
    const network = (req.nextUrl.searchParams.get('network') || 'mainnet') as NetworkType;
    
    if (!q) {
      return NextResponse.json({ error: 'No search query provided' }, { status: 400 });
    }

    // Determine search type and fetch results
    let searchResults = null;
    let searchType = 'unknown';

    // Block height (numeric)
    if (/^\d+$/.test(q)) {
      searchType = 'block_height';
      try {
        const block = await blockCache.getBlock(parseInt(q), network, true);
        if (block) {
          searchResults = {
            height: block.height,
            hash: block.hash,
            time: block.time,
            size: block.size,
            nTx: block.nTx || block.tx?.length || 0,
            tx: block.tx || [],
            previousblockhash: block.previousblockhash,
            nextblockhash: block.nextblockhash,
            merkleroot: block.merkleroot,
            version: block.version,
            bits: block.bits,
            nonce: block.nonce,
            difficulty: block.difficulty,
            chainwork: block.chainwork
          };
        }
      } catch (error) {
        console.error('Error fetching block by height:', error);
      }
    }
    
    // 64-character hex (could be block hash or txid)
    else if (/^[0-9a-fA-F]{64}$/i.test(q)) {
      // Try block first
      try {
        const block = await blockCache.getBlock(q, network, true);
        if (block) {
          searchType = 'block_hash';
          searchResults = {
            height: block.height,
            hash: block.hash,
            time: block.time,
            size: block.size,
            nTx: block.nTx || block.tx?.length || 0,
            tx: block.tx || [],
            previousblockhash: block.previousblockhash,
            nextblockhash: block.nextblockhash,
            merkleroot: block.merkleroot,
            version: block.version,
            bits: block.bits,
            nonce: block.nonce,
            difficulty: block.difficulty,
            chainwork: block.chainwork
          };
        }
      } catch (error) {
        console.error('Error fetching block by hash:', error);
      }

      // If block not found, try transaction
      if (!searchResults) {
        try {
          const transaction = await blockCache.getTransaction(q, network, true);
          if (transaction) {
            searchType = 'transaction';
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
            };
          }
        } catch (error) {
          console.error('Error fetching transaction:', error);
        }
      }
    }
    
    // FairCoin address pattern
    else if (/^[fFmn2][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{24,61}$/i.test(q)) {
      searchType = 'address';
      try {
        // For addresses, we need to implement proper address tracking
        // This would require scanning the blockchain for all transactions involving this address
        // For now, we'll return a structure that indicates the address is valid
        const addressInfo = {
          address: q,
          balance: 0, // Would need UTXO scanning to calculate real balance
          totalReceived: 0, // Would need transaction history scanning
          totalSent: 0, // Would need transaction history scanning
          txCount: 0, // Would need transaction history scanning
          transactions: [], // Would need transaction history scanning
          isValid: true,
          network: network
        };
        
        // Try to get some basic validation info
        try {
          // This would be a real RPC call to validate the address
          // For now, we'll assume it's valid based on the regex pattern
          searchResults = addressInfo;
        } catch (error) {
          console.error('Error validating address:', error);
          searchResults = addressInfo;
        }
      } catch (error) {
        console.error('Error processing address:', error);
      }
    }
    
    // Partial hash (less than 64 characters)
    else if (/^[0-9a-fA-F]{8,63}$/i.test(q)) {
      searchType = 'partial_hash';
      // For partial hashes, we'll return a suggestion to complete the hash
      searchResults = {
        suggestion: 'Complete the hash to get accurate results',
        partial: q,
        type: 'partial_hash',
        length: q.length,
        requiredLength: 64
      };
    }
    
    // If we have results, return them
    if (searchResults) {
      return NextResponse.json({
        query: q,
        network: network,
        type: searchType,
        results: searchResults,
        timestamp: new Date().toISOString()
      });
    }

    // No results found
    return NextResponse.json({
      query: q,
      network: network,
      type: 'not_found',
      results: null,
      message: 'No results found for this query',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ 
      error: 'Search failed', 
      message: 'An error occurred while processing your search',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
