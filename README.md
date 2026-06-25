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
WEBSOCKET_MAX_PAYLOAD_BYTES=65536

# Public origin allowed by the API CORS allowlist
PUBLIC_BASE_URL=https://explorer.fairco.in
```

**Security**: RPC credentials are only read server-side; all RPC calls are proxied through the API. The `/api` surface is rate-limited (a global limiter on `/api`, plus stricter limits on `/api/search`, `/api/transaction`, `/api/address`, `/api/tx/broadcast`, and the public `/mcp` endpoint, which can drive daemon-backed wallet tools). Expensive lookups are bounded: `/api/price/history` samples long windows in memory from a bounded, two-tier-pruned series, and `/api/search` on an address returns balance only (it no longer triggers an unbounded address-txid scan, so `txCount` is `0` there — use the address pages for full history). `/api/peers` is redacted (no raw peer addresses or topology).

Behind a reverse proxy (e.g. nginx/Cloudflare), set `TRUSTED_PROXY_CIDRS` to the proxy's IP/CIDR(s) so the rate limiter keys on the real client IP — `X-Forwarded-For` is trusted **only** from those peers, never from arbitrary clients. Leave it blank when the API is reached directly.

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

## MCP server (for AI assistants)

The explorer also speaks the [Model Context Protocol](https://modelcontextprotocol.io), so AI assistants (Claude, ChatGPT, Cursor, …) can query the FairCoin blockchain directly.

- **Endpoint**: `https://explorer.fairco.in/mcp`
- **Transport**: Streamable HTTP, stateless (a fresh server is built per request — no session store). `POST` carries the JSON-RPC request; `GET`/`DELETE` return `405` (there is no SSE stream or session to address).
- **Access**: read-only. No API key required.

Every blockchain tool accepts an optional `network` argument (`"mainnet"` by default; `"testnet"` is also supported).

| Tool | Purpose |
| --- | --- |
| `search` | Resolve a block height, block hash, txid, or address into linkable `{ id, title, url }` results (ChatGPT deep-research contract). |
| `fetch` | Given an id from `search` (e.g. `tx:<hash>`), return the full record as `{ id, title, text, url, metadata }`. |
| `get_network_stats` | Height, difficulty, supply, connections, mempool size, masternode count, PoW/PoS phase. |
| `get_latest_blocks` | Most recent blocks (`limit` 1–50, default 10). |
| `get_block` | A full block by height or hash. |
| `get_transaction` | A full transaction by txid (with resolved prevouts and live confirmations). |
| `get_address` | Balance/summary for an address (full history needs a node with `addressindex`; degrades gracefully). |
| `get_mempool` | Current mempool size and recent pending transactions. |
| `get_masternodes` | Masternode list (by rank) plus aggregate stats. |
| `get_price` | Live FAIR price (via the WFAIR/USDC pool on Base). |
| `get_supply` | Circulating/max supply, block reward, percent mined. |
| `create_wallet` | Generate a new FairCoin keypair and return `{ address, privateKey (WIF) }`. **Non-custodial** — the server stores nothing. |
| `get_balance` | Confirmed + unconfirmed balance and UTXO count for an address (needs a node with `addressindex`). |
| `send` | Send a FAIR `amount` from the address controlled by your `privateKey` (WIF) to `toAddress`. Returns `{ txid, amount, fee }`. |
| `sweep` | Send the entire balance of your `privateKey`'s address to `toAddress` (minus fee). Returns `{ txid, amount, fee }`. |

### Agent wallets (non-custodial)

The wallet tools let AI agents **receive and spend FAIR autonomously** on both mainnet and testnet, with a strictly **non-custodial** design:

- `create_wallet` generates a keypair **in-process** and returns the address and private key (WIF) **once**. The server keeps **no copy** — no database, no file, no in-memory cache. The agent is the sole holder of the key.
- `get_balance` reads an address balance + UTXOs from the node.
- `send` / `sweep` accept the agent's WIF **as a parameter**, derive the from-address, build the raw transaction, and hand the key to the node's `signrawtransaction` (which signs **without importing** the key to the wallet) before broadcasting. The key is used transiently and never persisted.

Only key generation is done in-process (using the audited `@noble/curves` secp256k1 implementation); all transaction construction, signing, and broadcasting are delegated to the FairCoin node (`createrawtransaction` / `signrawtransaction` / `sendrawtransaction`) so FairCoin's exact transaction and sighash format is always correct. `send` and `sweep` use a flat **0.001 FAIR** network fee; change below the dust threshold (0.0001 FAIR) is dropped into the fee rather than creating an uneconomical output.

> **Security caveat — the key is the holder's responsibility.** The private key is returned to and supplied by the caller. The server **never logs, echoes, or stores it**, and it cannot recover a lost key. Anyone holding the key controls the funds. Store it securely. `send`/`sweep` and `get_balance` require a FairCoin node started with `-addressindex=1`.

### Add to Claude / ChatGPT

- **Claude** (Desktop/Code): add a custom connector / MCP server with URL `https://explorer.fairco.in/mcp` (transport: HTTP/Streamable HTTP).
- **ChatGPT** (deep research / connectors): add a connector pointing at the same URL. The required `search` and `fetch` tools are implemented, so it works out of the box.
- **Cursor / other clients**: configure a Streamable HTTP MCP server with the same URL.

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
