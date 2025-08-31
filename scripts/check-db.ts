import { config } from 'dotenv';
import connectToDatabase from '../lib/db/connect';
import Block from '../lib/db/models/Block';
import Transaction from '../lib/db/models/Transaction';

// Load environment variables
config();

async function checkDatabase() {
  try {
    console.log('Checking MongoDB connection and performance...');

    // Test connection
    await connectToDatabase();
    console.log('✅ MongoDB connection successful');

    // Check collections
    const blockCount = await Block.countDocuments();
    const txCount = await Transaction.countDocuments();

    console.log(`📊 Database stats:`);
    console.log(`   Blocks: ${blockCount.toLocaleString()}`);
    console.log(`   Transactions: ${txCount.toLocaleString()}`);

    // Check indexes
    console.log('\n🔍 Checking indexes...');
    const blockIndexes = await Block.collection?.indexes();
    const txIndexes = await Transaction.collection?.indexes();

    console.log('Block indexes:');
    blockIndexes?.forEach((index, i) => {
      console.log(`  ${i + 1}. ${Object.keys(index.key).join(', ')}`);
    });

    console.log('Transaction indexes:');
    txIndexes?.forEach((index, i) => {
      console.log(`  ${i + 1}. ${Object.keys(index.key).join(', ')}`);
    });

    // Performance test
    console.log('\n⚡ Performance test...');
    const startTime = Date.now();

    // Test block lookup
    if (blockCount > 0) {
      const latestBlock = await Block.findOne().sort({ height: -1 }).lean() as any;
      console.log(`Latest block: #${latestBlock?.height} (${Date.now() - startTime}ms)`);
    }

    // Test transaction lookup
    if (txCount > 0) {
      const sampleTx = await Transaction.findOne().lean() as any;
      if (sampleTx) {
        const txLookupTime = Date.now();
        await Transaction.findOne({ txid: sampleTx.txid }).lean();
        console.log(`Transaction lookup: ${Date.now() - txLookupTime}ms`);
      }
    }

    console.log('\n✅ Database check completed successfully');

  } catch (error) {
    console.error('❌ Database check failed:', error);
    process.exit(1);
  }
}

checkDatabase();
