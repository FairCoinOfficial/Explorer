# FairCoin Explorer

Modern, responsive block explorer for **FairCoin**. Vite + React SPA frontend with an Express API server (run with Bun) that talks JSON-RPC to a FairCoin node and caches responses in MongoDB. Real-time updates are pushed over WebSocket.

## Stack

- **Frontend**: Vite, React 18, TypeScript, TanStack Query, Tailwind CSS 4, shadcn/Radix UI, react-router
- **Backend**: Express 5 (Bun runtime), WebSocket (`ws`), MongoDB cache, `@fairco.in/rpc-client`
- **i18n**: 8 languages (en, es, fr, de, ru, zh, ja, ko)

## Quick start

```bash
# 1) Install deps
npm i

# 2) Configure environment
cp .env.example .env
# edit .env with your RPC and MongoDB credentials

# 3) Run the API server (port 8080)
npm run server          # or: npm run dev:server (watch mode, requires Bun)

# 4) Run the frontend dev server (port 5180, proxies /api to :8080)
npm run dev
```

Open http://localhost:5180

For production, build the SPA and let the API server serve it:

```bash
npm run build           # outputs dist/
npm run server          # serves dist/ + API + WebSocket on :8080
```

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Vite dev server (frontend, port 5180) |
| `npm run dev:server` | API server in watch mode (Bun, port 8080) |
| `npm run server` | API server (Bun) |
| `npm run build` | Typecheck + production build of the SPA |
| `npm run typecheck` | Typecheck frontend **and** server |
| `npm run sync-db` | Full blockchain sync into MongoDB (optional, Bun) |
| `npm run check-db` | MongoDB health/index check (Bun) |

## Environment

```bash
# RPC Configuration (server-side only; never exposed to the browser)
FAIRCOIN_RPC_USER=fair
FAIRCOIN_RPC_PASS=change_me
FAIRCOIN_RPC_HOST=127.0.0.1
FAIRCOIN_RPC_PORT=46373
FAIRCOIN_RPC_SCHEME=http

# MongoDB
MONGODB_URI=mongodb://localhost:27017/faircoin-explorer

# WebSocket / realtime monitor
WEBSOCKET_ENABLED=true
WEBSOCKET_NETWORKS=mainnet          # comma-separated; add testnet if you run a testnet node
BLOCKCHAIN_POLL_INTERVAL=10000
WEBSOCKET_HEARTBEAT_INTERVAL=30000
WEBSOCKET_MAX_CONNECTIONS_PER_IP=5

# Public origin allowed by the API CORS allowlist
PUBLIC_BASE_URL=https://explorer.fairco.in
```

**Security**: RPC credentials are only read server-side; all RPC calls are proxied through the API.

## API overview

The Express server exposes a read-only JSON API under `/api`:

- `GET /api/blocks`, `/api/block/:hashOrHeight`, `/api/blockcount`
- `GET /api/transaction/:txid`, `POST /api/tx/broadcast`
- `GET /api/address/:address`, `/api/address/:address/txs?page=&limit=`, `/api/address/:address/utxos` (requires a node with `addressindex` for full data)
- `GET /api/mempool`, `/api/masternodes`, `/api/peers`, `/api/stats`, `/api/network-info`, `/api/mining-info`
- `GET /api/search?q=` (block height/hash, txid, or address)
- `GET /api/validate-address?address=`, `/api/fee-estimate`
- `GET /api/price`, `/api/price/history`, `/api/stats/history`
- `GET /api/bridge/reserves` (proxied WFAIR bridge reserves)
- `WS /api/ws` (new blocks, mempool updates, network stats)

## Features

- Dashboard with live blocks, mempool, price and network stats
- Block, transaction and address pages (with paginated address history when the node has `addressindex`)
- Masternode list and reward stats, peers, network status
- Universal search (height, hash, txid, address)
- MongoDB-backed RPC caching with single-flight de-duplication and self-healing TTLs
- Real-time WebSocket updates
- Dark/light theme, 8 languages, responsive layout

## Notes

- Address balances/history require a FairCoin node with `addressindex=1`; without it the explorer degrades gracefully to validation-only data.
- The MongoDB cache populates on demand; `npm run sync-db` (full historical sync) is optional.
