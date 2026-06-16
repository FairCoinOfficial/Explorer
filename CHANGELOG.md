# Changelog

All notable changes to the FairCoin Explorer are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
