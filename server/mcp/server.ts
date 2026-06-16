// Remote MCP (Model Context Protocol) server for the FairCoin Explorer.
//
// Exposes the explorer's read-only blockchain data (blocks, transactions,
// addresses, masternodes, network stats, price, supply) to AI assistants
// (Claude, ChatGPT, Cursor, …) over the Streamable HTTP transport, mounted at
// `/mcp` by `server/index.ts`.
//
// Every tool reuses the SAME cached RPC accessors the REST routes use
// (`BlockCache`, `rpcWithNetwork`, `computeCirculatingSupply`, the shared price
// service) — there is no duplicated RPC logic here. Errors are sanitized the
// same way `handleRouteError` sanitizes them for the REST surface: the full
// error is logged server-side and the client receives a generic message, so RPC
// and Mongo internals never leak.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { rpcWithNetwork, type NetworkType } from "@fairco.in/rpc-client";
import { blockCache, type MasternodeCount } from "../lib/cache";
import { parseNetwork, MAX_LIMIT, ValidationError } from "../lib/http";
import { computeCirculatingSupply, currentBlockReward, MAX_SUPPLY } from "../lib/supply";
import { getPrice } from "../lib/price-service";
import { logger } from "../lib/logger";
import { registerWalletTools } from "./wallet-tools";

/** Public web base for explorer page links surfaced in `search`/`fetch` results. */
const EXPLORER_WEB_BASE = (process.env.PUBLIC_BASE_URL || "https://explorer.fairco.in").replace(/\/+$/, "");

/** Satoshis per FAIR, matching the conversion used by the REST routes. */
const SATS_PER_FAIR = 100_000_000;

/** PoW→PoS phase boundary per network (mirrors /api/stats). */
const LAST_POW_BLOCK: Record<NetworkType, number> = { mainnet: 10_000, testnet: 200 };

/** Default and bounds for the latest-blocks tool. */
const DEFAULT_LATEST_BLOCKS = 10;
const MAX_LATEST_BLOCKS = 50;

/** Number of mempool entries to detail (mirrors /api/mempool). */
const MEMPOOL_DETAIL_LIMIT = 20;

/** Masternode collateral, in FAIR (mirrors /api/masternodes). */
const COLLATERAL_PER_MASTERNODE = 5_000;

/** Optional `network` argument shared by every domain tool. */
const networkArg = {
  network: z
    .enum(["mainnet", "testnet"])
    .optional()
    .describe('FairCoin network to query. Defaults to "mainnet".'),
};

/** Resolve the validated network, defaulting to mainnet via the REST validator. */
function resolveNetwork(value: "mainnet" | "testnet" | undefined): NetworkType {
  return parseNetwork(value);
}

/**
 * A `search`/`fetch` record id. Encodes the entity kind and its value so a later
 * `fetch` can route to the right loader, e.g. `block:12345`, `tx:<hash>`,
 * `address:<addr>`. The value may itself contain no `:` for our entity types
 * (heights, hex hashes, base58 addresses), so a single split on the first `:`
 * is unambiguous.
 */
type EntityKind = "block" | "tx" | "address";

function encodeId(kind: EntityKind, value: string): string {
  return `${kind}:${value}`;
}

function decodeId(id: string): { kind: EntityKind; value: string } {
  const separator = id.indexOf(":");
  if (separator === -1) {
    throw new ValidationError(`Invalid id '${id}': expected '<type>:<value>' (e.g. 'tx:<hash>').`);
  }
  const kind = id.slice(0, separator);
  const value = id.slice(separator + 1);
  if (kind !== "block" && kind !== "tx" && kind !== "address") {
    throw new ValidationError(`Invalid id type '${kind}': expected 'block', 'tx', or 'address'.`);
  }
  if (!value) {
    throw new ValidationError(`Invalid id '${id}': missing value after '${kind}:'.`);
  }
  return { kind, value };
}

/** Build the explorer web URL for an entity (used by ChatGPT deep-research). */
function webUrl(kind: EntityKind, value: string): string {
  return `${EXPLORER_WEB_BASE}/${kind}/${value}`;
}

/**
 * Pretty-printed JSON `content` block plus a matching `structuredContent` object,
 * which is the shape the MCP tool spec expects for machine-readable results.
 */
function jsonResult(data: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

/**
 * Tool error result. Logs the underlying error server-side (with context) and
 * returns a sanitized, client-safe message — never raw RPC/Mongo internals.
 * A {@link ValidationError} is surfaced verbatim since it is already a safe,
 * caller-facing message.
 */
function errorResult(context: string, error: unknown) {
  const message =
    error instanceof ValidationError ? error.message : `${context}. The requested data could not be retrieved.`;
  if (!(error instanceof ValidationError)) {
    logger.error(`MCP ${context}:`, error);
  }
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true as const,
  };
}

// ---------------------------------------------------------------------------
// Domain loaders — thin wrappers over the same cached accessors the REST layer
// uses. They normalize shapes for the MCP payloads but never re-implement RPC.
// ---------------------------------------------------------------------------

interface BlockSummary {
  height: number | null;
  hash: string;
  time: number | null;
  size: number | null;
  nTx: number;
  tx: string[];
}

function toBlockSummary(block: Record<string, unknown>): BlockSummary {
  const txField = block.tx;
  const tx = Array.isArray(txField) ? (txField as unknown[]).map((t) => String(t)) : [];
  const nTxField = block.nTx;
  return {
    height: typeof block.height === "number" ? block.height : null,
    hash: typeof block.hash === "string" ? block.hash : "",
    time: typeof block.time === "number" ? block.time : null,
    size: typeof block.size === "number" ? block.size : null,
    nTx: typeof nTxField === "number" ? nTxField : tx.length,
    tx,
  };
}

async function loadNetworkStats(network: NetworkType): Promise<Record<string, unknown>> {
  const [blockHeight, blockchainInfo, miningInfo, mempoolInfo, networkInfo, masternodeCountRpc] = await Promise.all([
    blockCache.getBlockCount(network).catch(() => 0),
    blockCache.get<Record<string, unknown>>("getblockchaininfo", [], { network, ttl: 300 }).catch(() => null),
    blockCache.getMiningInfo(network).catch(() => null),
    blockCache.getMempoolInfo(network).catch(() => null),
    blockCache.getNetworkInfo(network).catch(() => null),
    blockCache.getMasternodeCount(network).catch(() => null),
  ]);

  const totalSupply = computeCirculatingSupply(blockHeight);
  const masternodeCount = masternodeCountRpc?.enabled ?? masternodeCountRpc?.total ?? 0;
  const difficultyRaw = (miningInfo as Record<string, unknown> | null)?.difficulty;
  const difficulty = typeof difficultyRaw === "number" ? difficultyRaw : 0;
  const phase = blockHeight > LAST_POW_BLOCK[network] ? "PoS" : "PoW";
  const connectionsRaw = (networkInfo as Record<string, unknown> | null)?.connections;
  const mempoolSizeRaw = (mempoolInfo as Record<string, unknown> | null)?.size;
  const chain = (blockchainInfo as Record<string, unknown> | null)?.chain;

  return {
    network,
    chain: typeof chain === "string" ? chain : network,
    blockHeight,
    difficulty,
    phase,
    totalSupply,
    circulatingSupply: totalSupply,
    maxSupply: MAX_SUPPLY,
    blockReward: currentBlockReward(blockHeight),
    mempoolSize: typeof mempoolSizeRaw === "number" ? mempoolSizeRaw : 0,
    masternodeCount,
    connections: typeof connectionsRaw === "number" ? connectionsRaw : 0,
  };
}

interface AddressBalanceRpc {
  balance: number;
  received: number;
}

async function loadAddress(address: string, network: NetworkType): Promise<Record<string, unknown>> {
  const validation = await blockCache.validateAddress(address, network).catch(() => null);
  const isValid = Boolean((validation as { isvalid?: unknown } | null)?.isvalid);
  if (!isValid) {
    return { address, network, isValid: false, note: "Address is not valid on this network." };
  }

  const [balanceRpc, txids] = await Promise.all([
    rpcWithNetwork<AddressBalanceRpc>("getaddressbalance", [{ addresses: [address] }], network).catch(() => null),
    rpcWithNetwork<string[]>("getaddresstxids", [{ addresses: [address] }], network).catch(() => null),
  ]);

  // Without addressindex the daemon answers neither call; degrade gracefully.
  if (balanceRpc === null && txids === null) {
    return {
      address,
      network,
      isValid: true,
      balance: 0,
      totalReceived: 0,
      totalSent: 0,
      txCount: 0,
      note: "addressindex not enabled on node; balance and history unavailable (validation only).",
    };
  }

  const balanceSats = balanceRpc?.balance ?? 0;
  const receivedSats = balanceRpc?.received ?? 0;
  return {
    address,
    network,
    isValid: true,
    balance: balanceSats / SATS_PER_FAIR,
    balanceSat: balanceSats,
    totalReceived: receivedSats / SATS_PER_FAIR,
    totalReceivedSat: receivedSats,
    totalSent: (receivedSats - balanceSats) / SATS_PER_FAIR,
    totalSentSat: receivedSats - balanceSats,
    txCount: txids?.length ?? 0,
  };
}

async function loadMempool(network: NetworkType): Promise<Record<string, unknown>> {
  const [mempoolInfo, rawMempool] = await Promise.all([
    rpcWithNetwork<Record<string, unknown>>("getmempoolinfo", [], network).catch(() => null),
    rpcWithNetwork<string[]>("getrawmempool", [], network).catch(() => []),
  ]);

  const recentTxs = rawMempool.slice(0, MEMPOOL_DETAIL_LIMIT);
  const transactions: Array<Record<string, unknown>> = [];
  for (const txid of recentTxs) {
    try {
      const entry = await rpcWithNetwork<Record<string, unknown>>("getmempoolentry", [txid], network);
      const ancestorfees = Number(entry.ancestorfees ?? 0);
      const ancestorsize = Number(entry.ancestorsize ?? 0);
      transactions.push({
        txid,
        size: Number(entry.size ?? 0),
        fee: Number(entry.fee ?? 0),
        feeRate: ancestorfees && ancestorsize ? ancestorfees / ancestorsize : 0,
        time: Number(entry.time ?? Date.now() / 1000),
        depends: Array.isArray(entry.depends) ? (entry.depends as unknown[]).map((d) => String(d)) : [],
      });
    } catch {
      // The tx may have just left the mempool; record it with zeroed metrics
      // rather than fabricating placeholder values.
      transactions.push({ txid, size: 0, fee: 0, feeRate: 0, time: Date.now() / 1000, depends: [] });
    }
  }

  const bytesRaw = (mempoolInfo as Record<string, unknown> | null)?.bytes;
  return {
    network,
    size: rawMempool.length,
    bytes: typeof bytesRaw === "number" ? bytesRaw : rawMempool.length * 250,
    transactions,
  };
}

interface MasternodeEntry {
  rank: number;
  txid: string;
  outidx: number;
  address: string;
  protocol: number;
  status: string;
  activeTime: number;
  lastSeen: number;
  lastPaid: number;
}

function parseMasternodeEntry(data: unknown): MasternodeEntry {
  const obj = (typeof data === "object" && data !== null ? data : {}) as Record<string, unknown>;
  return {
    rank: Number(obj.rank ?? 0),
    txid: String(obj.txhash ?? ""),
    outidx: Number(obj.outidx ?? 0),
    address: String(obj.addr ?? ""),
    protocol: Number(obj.version ?? 0),
    status: String(obj.status ?? "UNKNOWN"),
    activeTime: Number(obj.activetime ?? 0),
    lastSeen: Number(obj.lastseen ?? 0),
    lastPaid: Number(obj.lastpaid ?? 0),
  };
}

async function loadMasternodes(network: NetworkType): Promise<Record<string, unknown>> {
  const [masternodeList, masternodeCount, blockHeight] = await Promise.all([
    blockCache.getMasternodeList(network).catch(() => [] as unknown[]),
    blockCache.getMasternodeCount(network).catch(() => null as MasternodeCount | null),
    blockCache.getBlockCount(network).catch(() => 0),
  ]);

  const masternodes = (Array.isArray(masternodeList) ? masternodeList : []).map(parseMasternodeEntry);
  masternodes.sort((a, b) => a.rank - b.rank);

  const statusCounts = masternodes.reduce<Record<string, number>>((acc, mn) => {
    acc[mn.status] = (acc[mn.status] ?? 0) + 1;
    return acc;
  }, {});
  const enabled = masternodeCount?.enabled ?? statusCounts.ENABLED ?? 0;
  const total = masternodeCount?.total ?? masternodes.length;
  const totalCollateral = masternodes.length * COLLATERAL_PER_MASTERNODE;
  const totalSupply = computeCirculatingSupply(blockHeight);

  return {
    network,
    stats: {
      total,
      enabled,
      preEnabled: statusCounts.PRE_ENABLED ?? 0,
      expired: statusCounts.EXPIRED ?? 0,
      totalCollateral,
      collateralPercentage: totalSupply > 0 ? (totalCollateral / totalSupply) * 100 : 0,
    },
    masternodes,
  };
}

async function loadSupply(network: NetworkType): Promise<Record<string, unknown>> {
  const blockHeight = await blockCache.getBlockCount(network);
  const circulating = computeCirculatingSupply(blockHeight);
  return {
    network,
    blockHeight,
    circulatingSupply: circulating,
    totalSupply: circulating,
    maxSupply: MAX_SUPPLY,
    blockReward: currentBlockReward(blockHeight),
    percentMined: MAX_SUPPLY > 0 ? (circulating / MAX_SUPPLY) * 100 : 0,
  };
}

interface SearchHit {
  id: string;
  title: string;
  url: string;
}

/**
 * Resolve a free-text query to a block (by height or hash), a transaction, or an
 * address. Returns the structured hits (ChatGPT deep-research contract) plus the
 * resolved record for the human summary.
 */
async function resolveSearch(
  query: string,
  network: NetworkType,
): Promise<{ hits: SearchHit[]; record: Record<string, unknown> | null; kind: EntityKind | null }> {
  if (/^\d+$/.test(query)) {
    const block = await blockCache.getBlock(parseInt(query, 10), network, true).catch(() => null);
    if (block) {
      const summary = toBlockSummary(block as Record<string, unknown>);
      const value = String(summary.height ?? query);
      return {
        hits: [{ id: encodeId("block", value), title: `Block #${value}`, url: webUrl("block", value) }],
        record: { ...summary, network },
        kind: "block",
      };
    }
    return { hits: [], record: null, kind: null };
  }

  if (/^[0-9a-fA-F]{64}$/.test(query)) {
    const block = await blockCache.getBlock(query, network, true).catch(() => null);
    if (block) {
      const summary = toBlockSummary(block as Record<string, unknown>);
      return {
        hits: [{ id: encodeId("block", query), title: `Block ${query}`, url: webUrl("block", query) }],
        record: { ...summary, network },
        kind: "block",
      };
    }
    const tx = await blockCache.getTransaction(query, network, true).catch(() => null);
    if (tx) {
      return {
        hits: [{ id: encodeId("tx", query), title: `Transaction ${query}`, url: webUrl("tx", query) }],
        record: { ...(tx as Record<string, unknown>), network },
        kind: "tx",
      };
    }
    return { hits: [], record: null, kind: null };
  }

  if (/^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{25,62}$/.test(query)) {
    const record = await loadAddress(query, network);
    if (record.isValid === true) {
      return {
        hits: [{ id: encodeId("address", query), title: `Address ${query}`, url: webUrl("address", query) }],
        record,
        kind: "address",
      };
    }
    return { hits: [], record: null, kind: null };
  }

  return { hits: [], record: null, kind: null };
}

// ---------------------------------------------------------------------------
// Server factory
// ---------------------------------------------------------------------------

const SERVER_INSTRUCTIONS = [
  "MCP server for the FairCoin blockchain explorer (mainnet + testnet).",
  "Read tools expose blocks, transactions, addresses, masternodes, network stats, supply, and the live FAIR price.",
  "Non-custodial agent-wallet tools (`create_wallet`, `get_balance`, `send`, `sweep`) let you hold your OWN FairCoin key and transact autonomously: the server stores NOTHING — `create_wallet` returns the private key once and never keeps a copy; `send`/`sweep` take your key as a parameter, sign via the node, and never persist or log it.",
  'Every tool accepts an optional `network` argument ("mainnet" by default; "testnet" is also supported).',
  "Use `search` to resolve a block height, block hash, transaction id, or address into linkable results, then `fetch` with a returned id to retrieve the full record.",
  "Address balances/history and the wallet send/sweep tools require a node with addressindex enabled; read tools degrade gracefully to validation-only data without it.",
].join(" ");

/**
 * Build a fully-configured FairCoin Explorer MCP server. A fresh instance is
 * created per request by the stateless Streamable HTTP transport in
 * `server/index.ts`, so this registers every tool but holds no per-session state.
 */
export function createFaircoinMcpServer(version: string): McpServer {
  const server = new McpServer(
    { name: "faircoin-explorer", version },
    { instructions: SERVER_INSTRUCTIONS },
  );

  // ---- ChatGPT deep-research contract: search + fetch ----

  server.registerTool(
    "search",
    {
      title: "Search the FairCoin blockchain",
      description:
        "Resolve a query (block height, block hash, transaction id, or address) into a list of linkable results. Returns a human-readable summary and structured results shaped as { id, title, url }; pass a returned id to `fetch` for the full record.",
      inputSchema: {
        query: z.string().min(1).describe("Block height, block hash, transaction id, or FairCoin address."),
        ...networkArg,
      },
    },
    async ({ query, network }) => {
      try {
        const net = resolveNetwork(network);
        const trimmed = query.trim();
        if (!trimmed) {
          throw new ValidationError("Query must not be empty.");
        }
        const { hits, record, kind } = await resolveSearch(trimmed, net);
        const summary =
          hits.length > 0 && kind
            ? `Found 1 ${kind} on ${net} matching "${trimmed}".`
            : `No block, transaction, or address on ${net} matched "${trimmed}".`;
        return {
          content: [
            { type: "text" as const, text: summary },
            { type: "text" as const, text: JSON.stringify({ results: hits, record }, null, 2) },
          ],
          structuredContent: { results: hits },
        };
      } catch (error) {
        return errorResult("search failed", error);
      }
    },
  );

  server.registerTool(
    "fetch",
    {
      title: "Fetch a FairCoin record by id",
      description:
        "Given an id returned by `search` (e.g. 'block:12345', 'tx:<hash>', 'address:<addr>'), return the full record as { id, title, text, url, metadata }.",
      inputSchema: {
        id: z.string().min(1).describe("An id from `search`, e.g. 'tx:<hash>'."),
        ...networkArg,
      },
    },
    async ({ id, network }) => {
      try {
        const net = resolveNetwork(network);
        const { kind, value } = decodeId(id);

        let title: string;
        let record: Record<string, unknown> | null;
        if (kind === "block") {
          const block = await blockCache.getBlock(value, net, true).catch(() => null);
          record = block ? { ...toBlockSummary(block as Record<string, unknown>), network: net } : null;
          title = `Block ${value}`;
        } else if (kind === "tx") {
          const tx = await blockCache.getTransaction(value, net, true).catch(() => null);
          record = tx ? { ...(tx as Record<string, unknown>), network: net } : null;
          title = `Transaction ${value}`;
        } else {
          const address = await loadAddress(value, net);
          record = address.isValid === true ? address : null;
          title = `Address ${value}`;
        }

        if (!record) {
          throw new ValidationError(`No ${kind} found for id '${id}' on ${net}.`);
        }

        const result = {
          id,
          title,
          text: JSON.stringify(record, null, 2),
          url: webUrl(kind, value),
          metadata: { kind, network: net },
        };
        return { content: [{ type: "text" as const, text: result.text }], structuredContent: result };
      } catch (error) {
        return errorResult("fetch failed", error);
      }
    },
  );

  // ---- Network ----

  server.registerTool(
    "get_network_stats",
    {
      title: "Get FairCoin network stats",
      description:
        "Current chain stats: block height, difficulty, circulating/max supply, peer connections, mempool size, masternode count, and PoW/PoS phase.",
      inputSchema: { ...networkArg },
    },
    async ({ network }) => {
      try {
        return jsonResult(await loadNetworkStats(resolveNetwork(network)));
      } catch (error) {
        return errorResult("get_network_stats failed", error);
      }
    },
  );

  // ---- Blocks ----

  server.registerTool(
    "get_latest_blocks",
    {
      title: "Get latest FairCoin blocks",
      description: "Return the most recent blocks (summaries: height, hash, time, size, tx count).",
      inputSchema: {
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_LATEST_BLOCKS)
          .optional()
          .describe(`How many blocks to return (1-${MAX_LATEST_BLOCKS}, default ${DEFAULT_LATEST_BLOCKS}).`),
        ...networkArg,
      },
    },
    async ({ limit, network }) => {
      try {
        const net = resolveNetwork(network);
        const count = Math.min(MAX_LATEST_BLOCKS, Math.max(1, limit ?? DEFAULT_LATEST_BLOCKS));
        const [blocks, height] = await Promise.all([
          blockCache.getRecentBlocks(net, count, 0),
          blockCache.getBlockCount(net),
        ]);
        return jsonResult({ network: net, height, count: blocks.length, blocks });
      } catch (error) {
        return errorResult("get_latest_blocks failed", error);
      }
    },
  );

  server.registerTool(
    "get_block",
    {
      title: "Get a FairCoin block",
      description: "Fetch a full block by height (digits) or block hash (64 hex chars).",
      inputSchema: {
        hashOrHeight: z.string().min(1).describe("Block height (e.g. '12345') or 64-char block hash."),
        ...networkArg,
      },
    },
    async ({ hashOrHeight, network }) => {
      try {
        const net = resolveNetwork(network);
        const block = await blockCache.getBlock(hashOrHeight.trim(), net, true).catch(() => null);
        if (!block) {
          throw new ValidationError(`Block '${hashOrHeight}' not found on ${net}.`);
        }
        return jsonResult({ network: net, block: block as Record<string, unknown> });
      } catch (error) {
        return errorResult("get_block failed", error);
      }
    },
  );

  // ---- Transactions ----

  server.registerTool(
    "get_transaction",
    {
      title: "Get a FairCoin transaction",
      description:
        "Fetch a full transaction by txid, including inputs/outputs with resolved prevouts and live confirmations.",
      inputSchema: {
        txid: z.string().min(1).describe("Transaction id (64-char hex)."),
        ...networkArg,
      },
    },
    async ({ txid, network }) => {
      try {
        const net = resolveNetwork(network);
        const trimmed = txid.trim();
        if (!/^[0-9a-fA-F]{64}$/.test(trimmed)) {
          throw new ValidationError("Invalid txid: expected 64 hexadecimal characters.");
        }
        const tx = await blockCache.getTransaction(trimmed, net, true).catch(() => null);
        if (!tx) {
          throw new ValidationError(`Transaction '${trimmed}' not found on ${net}.`);
        }
        return jsonResult({ network: net, transaction: tx as Record<string, unknown> });
      } catch (error) {
        return errorResult("get_transaction failed", error);
      }
    },
  );

  // ---- Addresses ----

  server.registerTool(
    "get_address",
    {
      title: "Get a FairCoin address summary",
      description:
        "Balance and totals for an address. Full transaction history requires a node with addressindex; without it the tool degrades gracefully to validation-only data.",
      inputSchema: {
        address: z.string().min(1).describe("FairCoin address (base58)."),
        ...networkArg,
      },
    },
    async ({ address, network }) => {
      try {
        const net = resolveNetwork(network);
        const trimmed = address.trim();
        if (!/^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{25,62}$/.test(trimmed)) {
          throw new ValidationError("Invalid address format.");
        }
        return jsonResult(await loadAddress(trimmed, net));
      } catch (error) {
        return errorResult("get_address failed", error);
      }
    },
  );

  // ---- Mempool ----

  server.registerTool(
    "get_mempool",
    {
      title: "Get the FairCoin mempool",
      description: "Current mempool: total size, byte size, and detail for the most recent pending transactions.",
      inputSchema: { ...networkArg },
    },
    async ({ network }) => {
      try {
        return jsonResult(await loadMempool(resolveNetwork(network)));
      } catch (error) {
        return errorResult("get_mempool failed", error);
      }
    },
  );

  // ---- Masternodes ----

  server.registerTool(
    "get_masternodes",
    {
      title: "Get FairCoin masternodes",
      description: "Masternode list (sorted by rank) plus aggregate stats (total, enabled, collateral).",
      inputSchema: { ...networkArg },
    },
    async ({ network }) => {
      try {
        return jsonResult(await loadMasternodes(resolveNetwork(network)));
      } catch (error) {
        return errorResult("get_masternodes failed", error);
      }
    },
  );

  // ---- Price ----

  server.registerTool(
    "get_price",
    {
      title: "Get the FAIR price",
      description:
        "Live USD price of FAIR (via the wrapped-FAIR WFAIR/USDC pool on Base), with 24h change, volume, liquidity, and market cap when available.",
      inputSchema: {},
    },
    async () => {
      try {
        const price = await getPrice();
        return jsonResult({ ...price });
      } catch (error) {
        return errorResult("get_price failed", error);
      }
    },
  );

  // ---- Non-custodial agent wallets (create / balance / send / sweep) ----

  registerWalletTools(server);

  // ---- Supply ----

  server.registerTool(
    "get_supply",
    {
      title: "Get FairCoin supply",
      description: "Circulating and max supply at the current height, plus the current block reward and percent mined.",
      inputSchema: { ...networkArg },
    },
    async ({ network }) => {
      try {
        return jsonResult(await loadSupply(resolveNetwork(network)));
      } catch (error) {
        return errorResult("get_supply failed", error);
      }
    },
  );

  return server;
}
