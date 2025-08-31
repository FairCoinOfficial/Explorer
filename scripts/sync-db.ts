import { config } from 'dotenv';
import { syncEntireBlockchain } from '../lib/db/sync';

// Load environment variables from .env file
config();

async function main() {
  try {
    console.log('Starting FairCoin Explorer database sync...');

    // Sync the entire blockchain from block 0
    await syncEntireBlockchain();

    console.log('Database sync completed successfully!');
  } catch (error) {
    console.error('Database sync failed:', error);
    process.exit(1);
  }
}

main();
