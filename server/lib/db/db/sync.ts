import connectToDatabase from './connect';
import Block from './models/Block';
import Transaction from './models/Transaction';
import { getBlockCount, getBlockHash, getBlock, getRawTransactionVerbose } from '../rpc';

export async function syncBlock(height: number): Promise<void> {
  try {
    await connectToDatabase();

    // Check if block already exists (optimized query)
    const existingBlock = await Block.findOne({ height }).select('_id').lean();
    if (existingBlock) {
      return;
    }

    // Get block hash
    const hash = await getBlockHash(height);

    // Get block data
    const blockData = await getBlock(hash);

    // Save block to MongoDB
    const block = new Block({
      ...blockData,
      height
    });

    await block.save();

    // Sync transactions in this block (batch process)
    if (blockData.tx && blockData.tx.length > 0) {
      await syncTransactionsBatch(blockData.tx, hash, height);
    }

  } catch (error) {
    console.error(`Error syncing block ${height}:`, error);
    throw error;
  }
}

export async function syncTransactionsBatch(txids: string[], blockhash: string, blockheight: number): Promise<void> {
  try {
    await connectToDatabase();

    // Check which transactions already exist (batch query)
    const existingTxs = await Transaction.find({ txid: { $in: txids } }).select('txid').lean();
    const existingTxids = new Set(existingTxs.map(tx => tx.txid));

    // Filter out transactions that already exist
    const newTxids = txids.filter(txid => !existingTxids.has(txid));

    if (newTxids.length === 0) {
      return;
    }

    // Batch fetch transaction data
    const transactionPromises = newTxids.map(txid => getRawTransactionVerbose(txid));
    const transactionData = await Promise.allSettled(transactionPromises);

    // Batch save transactions
    const transactionsToSave = [];
    for (let i = 0; i < transactionData.length; i++) {
      const result = transactionData[i];
      if (result.status === 'fulfilled') {
        transactionsToSave.push({
          ...result.value,
          blockhash,
          blockheight
        });
      } else {
        console.error(`Error fetching transaction ${newTxids[i]}:`, result.reason);
      }
    }

    if (transactionsToSave.length > 0) {
      await Transaction.insertMany(transactionsToSave, { ordered: false });
    }

  } catch (error) {
    console.error(`Error syncing transactions for block ${blockheight}:`, error);
    throw error;
  }
}

export async function syncTransaction(txid: string, blockhash?: string, blockheight?: number): Promise<void> {
  try {
    await connectToDatabase();

    // Check if transaction already exists
    const existingTx = await Transaction.findOne({ txid });
    if (existingTx) {
      console.log(`Transaction ${txid} already exists, skipping`);
      return;
    }

    // Get transaction data
    const txData = await getRawTransactionVerbose(txid);

    // Save transaction to MongoDB
    const transaction = new Transaction({
      ...txData,
      blockhash,
      blockheight
    });

    await transaction.save();
    console.log(`Synced transaction ${txid}`);

  } catch (error) {
    console.error(`Error syncing transaction ${txid}:`, error);
    throw error;
  }
}

export async function syncLatestBlocks(limit: number = 100): Promise<void> {
  try {
    await connectToDatabase();

    const latestBlockCount = await getBlockCount();
    console.log(`Latest block count: ${latestBlockCount}`);

    // Get the highest block we have
    const latestBlock = await Block.findOne().sort({ height: -1 });
    const startHeight = latestBlock ? latestBlock.height + 1 : Math.max(0, latestBlockCount - limit);

    console.log(`Starting sync from block ${startHeight} to ${latestBlockCount}`);

    for (let height = startHeight; height <= latestBlockCount; height++) {
      await syncBlock(height);
    }

    console.log('Block sync completed');

  } catch (error) {
    console.error('Error syncing latest blocks:', error);
    throw error;
  }
}

export async function syncEntireBlockchain(): Promise<void> {
  try {
    await connectToDatabase();

    const latestBlockCount = await getBlockCount();
    console.log(`Latest block count: ${latestBlockCount}`);
    console.log('Starting full blockchain sync from block 0...');

    // Get the highest block we have
    const latestBlock = await Block.findOne().sort({ height: -1 });
    const startHeight = latestBlock ? latestBlock.height + 1 : 0;

    console.log(`Resuming sync from block ${startHeight} to ${latestBlockCount}`);

    for (let height = startHeight; height <= latestBlockCount; height++) {
      await syncBlock(height);

      // Progress indicator every 1000 blocks
      if (height % 1000 === 0) {
        console.log(`Progress: ${height}/${latestBlockCount} blocks synced (${Math.round((height / latestBlockCount) * 100)}%)`);
      }
    }

    console.log('Full blockchain sync completed');

  } catch (error) {
    console.error('Error syncing entire blockchain:', error);
    throw error;
  }
}

export async function getBlockFromCache(height: number): Promise<any | null> {
  try {
    await connectToDatabase();
    return await Block.findOne({ height }).lean();
  } catch (error) {
    console.error('Error getting block from cache:', error);
    return null;
  }
}

export async function getTransactionFromCache(txid: string): Promise<any | null> {
  try {
    await connectToDatabase();
    return await Transaction.findOne({ txid }).lean();
  } catch (error) {
    console.error('Error getting transaction from cache:', error);
    return null;
  }
}

export async function getBlocksFromCache(limit: number = 10, offset: number = 0): Promise<any[]> {
  try {
    await connectToDatabase();
    return await Block.find()
      .sort({ height: -1 })
      .skip(offset)
      .limit(limit)
      .select('-_id -__v -createdAt -updatedAt') // Exclude unnecessary fields
      .lean();
  } catch (error) {
    console.error('Error getting blocks from cache:', error);
    return [];
  }
}
