# Changelog

All notable changes to the FairCoin Explorer are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **False "node is catching up" banner.** `/api/health` measured lag as the gap to
  the tallest height any peer *claimed* (`startingheight`). Since 2026-09-24
  (height 166299) a public peer has been on a separate, lower-difficulty PoS
  branch that is ~200 blocks *taller* than the heavier chain, so the endpoint
  reported `lagging` permanently and every visitor saw the banner. Lag is now
  taken from the node's own most-work header (`getblockchaininfo.headers`) while
  the tip is fresh; peer claims still count once the tip goes cold, so a truly
  stuck node is still reported as `stalled`. The tallest claimed height is
  exposed as `peerReportedHeight` for diagnostics.
- **Pages spinning for up to a minute when the node is slow.** On an RPC failure
  `cache.get` retried the same call (doubling the 10s timeout) instead of using
  the answer it already held. It now serves the last cached value once and
  logs a warning; `/api/health` opts out so a dead node is never reported
  healthy on stale numbers.
- **Live-update storm that looked like a bot.** If the monitor's startup read of
  the tip failed (node busy), it stayed at height 0 and the next poll announced
  every block from height 1 as `new-block`; each announcement made every open
  tab refetch `/api/stats` and `/api/peers`. One visitor became ~60 req/s for
  hours, saturating the single CPU and starving faircoind. The monitor now adopts
  an unestablished height as a baseline, announces at most 10 blocks per poll,
  and never runs overlapping polls; the browser throttles live-event
  invalidations to one refetch per key per 5s.
- **A page that fails to load no longer takes down the whole app.** Route chunks
  are loaded with retry (short backoff, then one guarded reload to pick up a new
  deploy), and each content panel has its own error boundary, so a failure shows
  an inline "try again" inside that panel while the header, navigation and the
  other pane keep working — instead of the full-screen "Something went wrong /
  Failed to fetch dynamically imported module".
- **Cache freshness honours the reader's TTL.** Call sites sharing a cache key
  with different TTLs (e.g. `getblockchaininfo` at 300s for stats, 10s for
  health) no longer get served a doc the long-TTL writer considered fresh.

## [0.3.4] - 2026-06-25

### Security

- **Sanitize public address validation.** `GET /api/validate-address` now validates
  its input and strips wallet-specific fields (`ismine`, `iswatchonly`, …) from the
  `validateaddress` RPC response, returning only public validity fields (#18).
- **Limit `GET /api/network-info` to public fields** (`version`, `subversion`,
  `protocolversion`, `connections`, `relayfee`); node topology, proxy config, local
  addresses and warnings are no longer disclosed (#19).
- **Cap WebSocket frame size.** The WS server sets `maxPayload`
  (`WEBSOCKET_MAX_PAYLOAD_BYTES`, default 64 KiB) so oversized frames can't exhaust
  memory (#20). (The PR's proposal to key the per-IP WS cap on the raw TCP peer was
  intentionally **not** taken — behind the reverse proxy that collapses every client
  to the proxy IP; the trusted-proxy IP resolution from #16 is retained.)

[0.3.4]: https://github.com/FairCoinOfficial/Explorer/releases/tag/v0.3.4

## [0.3.3] - 2026-06-25

### Security

- **Restrict trusted proxy headers.** `X-Forwarded-*` is now trusted only when the
  direct TCP peer is an explicitly configured proxy (`TRUSTED_PROXY_CIDRS`), instead
  of a blind single-hop trust, so a direct client cannot spoof its IP and bypass the
  per-IP rate limiter. The WebSocket per-IP cap uses the same trust decision (#16).
- **Redact public peer topology.** `GET /api/peers` no longer exposes raw peer
  addresses, client versions, or per-peer metadata (#17).

### Changed

- **Price history sampling is a single bounded query.** `fetchBoundedPriceHistory`
  loads the (two-tier-pruned, bounded) point set once and thins it in memory,
  removing the per-request `findOne` fan-out introduced earlier (#15).

[0.3.3]: https://github.com/FairCoinOfficial/Explorer/releases/tag/v0.3.3

## [0.3.2] - 2026-06-25

### Security

- **Stop using the Uniswap V3 `slot0` spot price as the FAIR price oracle.** An
  instantaneous pool tick on a low-liquidity pool is manipulable within a block.
  The price now comes from GeckoTerminal's indexed price for the WFAIR/USDC pool
  (`base_token_price_usd`, with a base/quote-token guard) — available and not a
  raw on-chain spot read (#11).
- **Cap prevout-lookup fan-out and rate-limit RPC-heavy paths.** `getTransaction`
  enforces a per-request prevout-lookup budget (and a tighter per-address-page
  aggregate), and `/api/transaction` + `/api/address` now run through the strict
  limiter, preventing RPC-amplification abuse (#10).
- **Bound public block pagination.** `/api/blocks` clamps the `offset` to a maximum
  so a remote client can't request arbitrarily deep pages (#9).
- **Validate the WFAIR reserves API response** before rendering it; malformed or
  unexpected payloads degrade to "unavailable" instead of being trusted (#14).

### Changed

- **Scope the stats-history sparklines to mainnet views**, so testnet/other-network
  pages don't pull mainnet history (#12).

[0.3.2]: https://github.com/FairCoinOfficial/Explorer/releases/tag/v0.3.2

## [0.3.1] - 2026-06-25

### Security

- **Rate-limit the public `/mcp` endpoint.** `POST /mcp` is mounted outside `/api`,
  so it previously bypassed all rate limiting; it now runs through the global and
  strict limiters, throttling abuse of the daemon-backed wallet tools
  (`send`/`sweep`) and other node-hitting MCP calls (#5).
- **Bound `GET /api/price/history`.** Long windows (`1y`/`all`) no longer load every
  matching point into memory; the handler issues a bounded query and samples the
  range with indexed lookups, capping work at `HISTORY_MAX_POINTS` (#6).
- **Drop the unbounded address-txid scan in `GET /api/search`.** Address search now
  calls only `getaddressbalance` and no longer invokes the unbounded
  `getaddresstxids` RPC (which a remote client could abuse to force large responses).
  Address search results report `txCount: 0` — use the address pages for full
  history (#8).

[0.3.1]: https://github.com/FairCoinOfficial/Explorer/releases/tag/v0.3.1

## [0.3.0] - 2026-06-16

### Added

- **Non-custodial agent wallets via MCP** — AI agents can hold their own FairCoin
  wallet and transact autonomously on mainnet and testnet. New MCP tools:
  - `create_wallet` — the agent generates its own keypair; the key is returned
    once and the server keeps no copy (fully non-custodial).
  - `get_balance` — confirmed/unconfirmed balance and UTXO count for an address.
  - `send` — pay any address from the agent's wallet.
  - `sweep` — return the full balance to a destination address.
  Keys are generated in-process with the audited `@noble/curves` secp256k1
  implementation; signing is delegated to the node's `signrawtransaction` so
  FairCoin's exact transaction format is always correct. The server never logs,
  echoes, or stores private keys.
- **MCP page** at `/tools/mcp` — endpoint, connect guide (Claude / ChatGPT /
  Cursor), and a live tool list served from `GET /api/mcp/info`.
- **Collapsible Tools submenu** in the sidebar (Fee Calculator, MCP).

### Notes

- The wallet tools and the explorer's address pages require a FairCoin node with
  the address-index RPCs (`getaddressbalance` / `getaddressutxos`), added in
  FairCoin daemon **v3.0.6**.

[0.3.0]: https://github.com/FairCoinOfficial/Explorer/releases/tag/v0.3.0

## [0.2.0] - 2026-06-16

### Added

- **MCP server for AI assistants** at `https://explorer.fairco.in/mcp` — the
  explorer now speaks the [Model Context Protocol](https://modelcontextprotocol.io)
  over Streamable HTTP (read-only, no API key). Connect Claude, ChatGPT, Cursor or
  any MCP client and query the FairCoin blockchain in natural language. Eleven
  tools: `search`, `fetch`, `get_network_stats`, `get_latest_blocks`, `get_block`,
  `get_transaction`, `get_address`, `get_mempool`, `get_masternodes`, `get_price`,
  `get_supply`. Every blockchain tool accepts an optional `network` argument
  (defaults to `mainnet`). The `search`/`fetch` pair implements ChatGPT's
  deep-research connector contract.

### Fixed

- RPC calls are now bounded by a 10s timeout (`@fairco.in/rpc-client` 0.1.1), so an
  unreachable or wedged node fails fast instead of leaving the explorer stuck on an
  endless loading state.

[0.2.0]: https://github.com/FairCoinOfficial/Explorer/releases/tag/v0.2.0
