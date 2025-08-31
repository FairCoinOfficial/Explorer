import 'server-only';
import { getBlockCount, getBlockHash, getBlock, getRawTransactionVerbose } from './rpc';
import { getBlockFromCache, getTransactionFromCache, getBlocksFromCache } from './db/sync';

// Enhanced functions that use MongoDB cache with RPC fallback

export async function getCachedBlockCount(): Promise<number> {
  try {
    // First try to get from RPC to ensure we have the latest
    return await getBlockCount();
  } catch (error) {
    console.error('Error getting block count:', error);
    throw error;
  }
}

export async function getCachedBlockHash(height: number): Promise<string> {
  try {
    return await getBlockHash(height);
  } catch (error) {
    console.error(`Error getting block hash for height ${height}:`, error);
    throw error;
  }
}

export async function getCachedBlock(hashOrHeight: string): Promise<any> {
  try {
    // Try to get from cache first
    let cachedBlock = null;
    let height: number;

    if (/^\d+$/.test(hashOrHeight)) {
      // It's a height
      height = parseInt(hashOrHeight, 10);
      cachedBlock = await getBlockFromCache(height);
    } else {
      // It's a hash - we need to get the block data first to find the height
      try {
        const blockData = await getBlock(hashOrHeight);
        height = blockData.height;
        cachedBlock = await getBlockFromCache(height);
      } catch (error) {
        // If we can't get block data, fall back to RPC
        console.log(`Block ${hashOrHeight} not found in cache, fetching from RPC`);
        return await getBlock(hashOrHeight);
      }
    }

    if (cachedBlock) {
      return cachedBlock;
    }

    // Not in cache, get from RPC
    console.log(`Block ${hashOrHeight} not in cache, fetching from RPC`);
    const hash = /^\d+$/.test(hashOrHeight) ? await getBlockHash(parseInt(hashOrHeight)) : hashOrHeight;
    const block = await getBlock(hash);

    // Cache will be populated by sync process
    return block;
  } catch (error) {
    console.error(`Error getting cached block ${hashOrHeight}:`, error);
    throw error;
  }
}

export async function getCachedTransaction(txid: string): Promise<any> {
  try {
    // Try to get from cache first
    const cachedTx = await getTransactionFromCache(txid);

    if (cachedTx) {
      return cachedTx;
    }

    // Not in cache, get from RPC
    console.log(`Transaction ${txid} not in cache, fetching from RPC`);
    const tx = await getRawTransactionVerbose(txid);

    // Cache will be populated by sync process
    return tx;
  } catch (error) {
    console.error(`Error getting cached transaction ${txid}:`, error);
    throw error;
  }
}

export async function getCachedBlocks(limit: number = 10, offset: number = 0): Promise<any[]> {
  try {
    // Try to get from cache first
    const cachedBlocks = await getBlocksFromCache(limit, offset);

    if (cachedBlocks && cachedBlocks.length > 0) {
      return cachedBlocks;
    }

    // Not in cache, get from RPC (optimized to avoid unnecessary calls)
    console.log('Blocks not in cache, fetching from RPC');
    const blockCount = await getBlockCount();

    // Ensure we don't request more blocks than exist
    const actualLimit = Math.min(limit, blockCount - offset);
    if (actualLimit <= 0) {
      return [];
    }

    const blocks = [];

    // Batch fetch block hashes for better performance
    const blockPromises = [];
    for (let i = 0; i < actualLimit; i++) {
      const height = blockCount - offset - i;
      if (height >= 0) {
        blockPromises.push(getBlockHash(height));
      }
    }

    const hashes = await Promise.all(blockPromises);

    // Fetch block data in parallel
    const blockDataPromises = hashes.map(hash => getBlock(hash));
    const blockData = await Promise.all(blockDataPromises);

    // Add height information
    for (let i = 0; i < blockData.length; i++) {
      blocks.push({
        ...blockData[i],
        height: blockCount - offset - i
      });
    }

    return blocks;
  } catch (error) {
    console.error('Error getting cached blocks:', error);
    throw error;
  }
}
