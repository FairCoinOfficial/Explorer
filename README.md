# FairCoin Explorer (Next.js 14 + Tailwind + MongoDB)

Modern, minimalist, responsive explorer for **FairCoin** using JSON‑RPC with MongoDB caching for improved performance.

## Quick start

```bash
# 1) Install deps
npm i

# 2) Set up MongoDB
# Install MongoDB locally or use a cloud service like MongoDB Atlas
# Update .env.local with your MongoDB URI

# 3) Copy env and configure
cp .env.example .env.local
# edit .env.local with your RPC and MongoDB credentials

# 4) Sync database (optional but recommended for performance)
npm run sync-db

# 5) Run
npm run dev
```

Open http://localhost:3000

## Environment

```
# RPC Configuration
FAIRCOIN_RPC_USER=fair
FAIRCOIN_RPC_PASS=change_me
FAIRCOIN_RPC_HOST=seed1.fairco.in
FAIRCOIN_RPC_PORT=40405
FAIRCOIN_RPC_SCHEME=http

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/faircoin-explorer
```

**Security**: Credentials are never exposed to the browser; all RPC calls are made on the server.

## MongoDB Setup

### Local MongoDB
```bash
# Install MongoDB
sudo apt-get install mongodb  # Ubuntu/Debian
# or
brew install mongodb/brew/mongodb-community  # macOS

# Start MongoDB
sudo systemctl start mongodb  # Linux
# or
brew services start mongodb/brew/mongodb-community  # macOS
```

### MongoDB Atlas (Cloud)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a cluster
3. Get connection string and update `MONGODB_URI`

### Database Sync
After setting up MongoDB, run the sync script to populate the database with the entire blockchain:

```bash
npm run sync-db
```

This will sync all blocks from genesis (block 0) to the latest block and their transactions to MongoDB for faster access. This may take some time depending on the blockchain size.

## Features

- **Dashboard** with latest blocks (cached in MongoDB)
- **Search** by block height, block hash, or txid (`/search?q=...`)
- **Block pages** with prev/next links and TX list
- **Transaction pages** with inputs/outputs
- **MongoDB caching** for improved performance
- Clean dark UI, responsive, zero analytics

## Performance Features

- **MongoDB Atlas**: Cloud-hosted database with automatic scaling and high availability
- **Optimized Indexes**: Compound indexes for fast queries on blocks, transactions, and addresses
- **Batch Operations**: Efficient bulk inserts and parallel data fetching
- **Connection Pooling**: Optimized connection management with retry logic
- **Lean Queries**: Memory-efficient queries excluding unnecessary fields
- **Caching Strategy**: Database-first approach with RPC fallback for resilience

## Database Indexes

The system automatically creates optimized indexes for:
- Block height, hash, and timestamp lookups
- Transaction ID and block relationship queries
- Address-based transaction searches
- Time-based queries for recent activity
- Compound indexes for complex filtering operations

## Notes

- Assumes Bitcoin‑style RPC compatibility (used by many FairCoin nodes).
- Address balances require an indexed node; not included here to stay lightweight.
- Add pagination or mempool via RPC if your node supports it.
- Database sync is optional but highly recommended for production use.
# Explorer
