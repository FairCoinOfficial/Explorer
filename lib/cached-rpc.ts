import 'server-only';
import { BlockCache } from './cache';
import { NetworkType } from './rpc';

// Create a singleton cache instance
const blockCache = new BlockCache();

// Enhanced functions that use proper caching with RPC fallback

export async function getCachedBlockCount(network: NetworkType = 'mainnet'): Promise<number> {
  try {
    return await blockCache.getBlockCount(network);
  } catch (error) {
    console.error('Error getting cached block count:', error);
    throw error;
  }
}

export async function getCachedBlockHash(height: number, network: NetworkType = 'mainnet'): Promise<string> {
  try {
    // Use the cache's getBlock method which handles hash resolution internally
    const block = await blockCache.getBlock(height, network, false);
    return block.hash;
  } catch (error) {
    console.error(`Error getting cached block hash for height ${height}:`, error);
    throw error;
  }
}

export async function getCachedBlock(hashOrHeight: string | number, network: NetworkType = 'mainnet'): Promise<any> {
  try {
    return await blockCache.getBlock(hashOrHeight, network, true);
  } catch (error) {
    console.error(`Error getting cached block ${hashOrHeight}:`, error);
    throw error;
  }
}

export async function getCachedTransaction(txid: string, network: NetworkType = 'mainnet'): Promise<any> {
  try {
    return await blockCache.getTransaction(txid, network, true);
  } catch (error) {
    console.error(`Error getting cached transaction ${txid}:`, error);
    throw error;
  }
}

export async function getCachedNetworkInfo(network: NetworkType = 'mainnet'): Promise<any> {
  try {
    return await blockCache.getNetworkInfo(network);
  } catch (error) {
    console.error('Error getting cached network info:', error);
    throw error;
  }
}

export async function getCachedMiningInfo(network: NetworkType = 'mainnet'): Promise<any> {
  try {
    return await blockCache.getMiningInfo(network);
  } catch (error) {
    console.error('Error getting cached mining info:', error);
    throw error;
  }
}
