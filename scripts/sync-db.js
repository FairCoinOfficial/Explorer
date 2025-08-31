#!/usr/bin/env node

import { syncLatestBlocks } from '../lib/db/sync.js';

async function main() {
  try {
    console.log('Starting FairCoin Explorer database sync...');

    // Sync the latest 1000 blocks
    await syncLatestBlocks(1000);

    console.log('Database sync completed successfully!');
  } catch (error) {
    console.error('Database sync failed:', error);
    process.exit(1);
  }
}

main();
