// Single source of truth for the MCP tool catalog.
//
// Both the MCP tool registration (`server.ts` + `wallet-tools.ts`) AND the
// read-only REST endpoint `GET /api/mcp/info` (which powers the public `/tools/mcp`
// page in the web frontend) consume the name + description from here, so the
// documented tool list can never drift from what the server actually registers.
//
// `category` groups tools for presentation only (it is not part of the MCP
// protocol): blockchain read tools, the ChatGPT deep-research search/fetch pair,
// and the non-custodial agent-wallet tools.

/** Presentation grouping for a tool (not part of the MCP protocol). */
export type ToolCategory = "discovery" | "blockchain" | "wallet";

export interface ToolCatalogEntry {
  /** Tool name exactly as registered with the MCP server. */
  name: string;
  /** Human-readable description, mirrored in the tool registration. */
  description: string;
  /** Presentation grouping for the public tools page. */
  category: ToolCategory;
}

/**
 * Every tool the FairCoin Explorer MCP server registers, in registration order.
 * Keep this in lockstep with the `server.registerTool(...)` / `registerWalletTools`
 * calls — the registration helpers read their descriptions from here.
 */
export const TOOL_CATALOG: ToolCatalogEntry[] = [
  {
    name: "search",
    category: "discovery",
    description:
      "Resolve a query (block height, block hash, transaction id, or address) into a list of linkable results. Returns a human-readable summary and structured results shaped as { id, title, url }; pass a returned id to `fetch` for the full record.",
  },
  {
    name: "fetch",
    category: "discovery",
    description:
      "Given an id returned by `search` (e.g. 'block:12345', 'tx:<hash>', 'address:<addr>'), return the full record as { id, title, text, url, metadata }.",
  },
  {
    name: "get_network_stats",
    category: "blockchain",
    description:
      "Current chain stats: block height, difficulty, circulating/max supply, peer connections, mempool size, masternode count, and PoW/PoS phase.",
  },
  {
    name: "get_latest_blocks",
    category: "blockchain",
    description: "Return the most recent blocks (summaries: height, hash, time, size, tx count).",
  },
  {
    name: "get_block",
    category: "blockchain",
    description: "Fetch a full block by height (digits) or block hash (64 hex chars).",
  },
  {
    name: "get_transaction",
    category: "blockchain",
    description:
      "Fetch a full transaction by txid, including inputs/outputs with resolved prevouts and live confirmations.",
  },
  {
    name: "get_address",
    category: "blockchain",
    description:
      "Balance and totals for an address. Full transaction history requires a node with addressindex; without it the tool degrades gracefully to validation-only data.",
  },
  {
    name: "get_mempool",
    category: "blockchain",
    description:
      "Current mempool: total size, byte size, and detail for the most recent pending transactions.",
  },
  {
    name: "get_masternodes",
    category: "blockchain",
    description: "Masternode list (sorted by rank) plus aggregate stats (total, enabled, collateral).",
  },
  {
    name: "get_price",
    category: "blockchain",
    description:
      "Live USD price of FAIR (via the wrapped-FAIR WFAIR/USDC pool on Base), with 24h change, volume, liquidity, and market cap when available.",
  },
  {
    name: "get_supply",
    category: "blockchain",
    description:
      "Circulating and max supply at the current height, plus the current block reward and percent mined.",
  },
  {
    name: "create_wallet",
    category: "wallet",
    description:
      "Generate a brand-new FairCoin keypair for the given network and return the address and private key (WIF). The server stores NOTHING — you are the sole holder of the key. Store it securely; it cannot be recovered.",
  },
  {
    name: "get_balance",
    category: "wallet",
    description:
      "Return the confirmed + unconfirmed balance and UTXO count for an address via getaddressbalance/getaddressutxos. Requires a node with addressindex enabled; returns a clear error otherwise.",
  },
  {
    name: "send",
    category: "wallet",
    description:
      "Send a FAIR amount from the address controlled by your private key (WIF) to a destination address. Inputs are selected to cover the amount plus a flat 0.001 FAIR fee; change returns to your address (dust change is dropped into the fee). The transaction is built and signed by the node (your key is used transiently, never imported or stored). Returns { txid, amount, fee }.",
  },
  {
    name: "sweep",
    category: "wallet",
    description:
      "Send the ENTIRE balance of the address controlled by your private key (WIF) to a destination address, minus a flat 0.001 FAIR fee. Built and signed by the node (your key is used transiently, never imported or stored). Returns { txid, amount, fee }.",
  },
];

/** Index by tool name for O(1) description lookup during registration. */
const CATALOG_BY_NAME: Record<string, ToolCatalogEntry> = Object.fromEntries(
  TOOL_CATALOG.map((entry) => [entry.name, entry]),
);

/**
 * Description for a registered tool, sourced from {@link TOOL_CATALOG}. Throws if
 * the name is unknown so a registration/catalog mismatch fails loudly at startup
 * rather than silently shipping an empty description.
 */
export function toolDescription(name: string): string {
  const entry = CATALOG_BY_NAME[name];
  if (!entry) {
    throw new Error(`MCP tool '${name}' is not present in TOOL_CATALOG (server/mcp/tool-catalog.ts).`);
  }
  return entry.description;
}
