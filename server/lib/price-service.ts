// Shared FAIR/WFAIR price service.
//
// The live USD price of FAIR is sourced from WFAIR — the wrapped-FAIR bridge
// token on Base L2 (1:1 peg). The primary source is the on-chain spot price of
// the WFAIR/USDC Uniswap V3 pool read via `slot0()`, with GeckoTerminal and
// Dexscreener as supplementary context and price fallbacks.
//
// This module is the single source of truth for the price computation. Both the
// REST route (`routes/price.ts`) and the MCP server consume `getPrice()` here so
// the logic is never duplicated.

import { getBasePublicClient } from "./base-client";

// ---- On-chain pool (Base, Uniswap V3, fee 0.3%) ----

/** WFAIR/USDC Uniswap V3 pool on Base. token0 = USDC, token1 = WFAIR. */
const WFAIR_USDC_POOL_ADDRESS = "0x9F4F694390c60b51e30461c785C1345A1545b7ca" as const;
/** WFAIR on Base (pool token1), 18 decimals. */
const WFAIR_ADDRESS = "0xF2853CedDF47A05Fee0B4b24DFf2925d59737fb3" as const;

const USDC_DECIMALS = 6;
const WFAIR_DECIMALS = 18;

/**
 * Uniswap V3 `slot0()` returns the current `sqrtPriceX96` as its first field.
 * We only need that first value, but viem requires the full tuple shape to
 * decode the call correctly.
 */
const UNISWAP_V3_POOL_ABI = [
  {
    type: "function",
    name: "slot0",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "tick", type: "int24" },
      { name: "observationIndex", type: "uint16" },
      { name: "observationCardinality", type: "uint16" },
      { name: "observationCardinalityNext", type: "uint16" },
      { name: "feeProtocol", type: "uint8" },
      { name: "unlocked", type: "bool" },
    ],
  },
] as const;

const WFAIR_NETWORK = "base";
export const PRICE_SOURCE_POOL = "wfair-usdc-pool" as const;
export const PRICE_SOURCE_FALLBACK = "wfair-base" as const;
export type PriceSource = typeof PRICE_SOURCE_POOL | typeof PRICE_SOURCE_FALLBACK;

const GECKOTERMINAL_BASE = "https://api.geckoterminal.com/api/v2";
const DEXSCREENER_BASE = "https://api.dexscreener.com/latest/dex";

/** 60s — fresh enough for a spot price while staying well under rate limits. */
const CACHE_TTL_MS = 60 * 1000;

/** Upstream request timeout to keep callers responsive on slow networks. */
const UPSTREAM_TIMEOUT_MS = 8_000;

export interface PricePayload {
  price: number | null;
  change24h: number | null;
  volume24h: number | null;
  liquidityUsd: number | null;
  marketCapUsd: number | null;
  source: PriceSource;
  updatedAt: string;
}

/** Supplementary context (volume/liquidity) sourced from the indexers. */
interface PriceContext {
  change24h: number | null;
  volume24h: number | null;
  liquidityUsd: number | null;
  marketCapUsd: number | null;
}

const EMPTY_CONTEXT: PriceContext = {
  change24h: null,
  volume24h: null,
  liquidityUsd: null,
  marketCapUsd: null,
};

// ---- Upstream response shapes (only the fields we consume) ----

interface GeckoTerminalTokenResponse {
  data?: {
    attributes?: {
      price_usd?: string | null;
      volume_usd?: { h24?: string | null } | null;
      market_cap_usd?: string | null;
      fdv_usd?: string | null;
      total_reserve_in_usd?: string | null;
    } | null;
  } | null;
}

interface DexscreenerPair {
  priceUsd?: string | null;
  priceChange?: { h24?: number | null } | null;
  liquidity?: { usd?: number | null } | null;
  volume?: { h24?: number | null } | null;
  marketCap?: number | null;
}

interface DexscreenerTokenResponse {
  pairs?: DexscreenerPair[] | null;
}

/**
 * Parse a numeric upstream field that may arrive as a string, number, null, or
 * a non-finite value. Returns `null` for anything that is not a finite number.
 */
function parseNumeric(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "faircoin-explorer" },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Upstream ${res.status} ${res.statusText} for ${url}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Primary source: the WFAIR/USDC Uniswap V3 pool spot price, read on-chain.
 *
 * Uniswap V3 stores price as `sqrtPriceX96`, where the raw token1/token0 ratio
 * is `(sqrtPriceX96 / 2**96) ** 2`. With token0 = USDC (6 dp) and token1 = WFAIR
 * (18 dp), the decimal adjustment between the raw ratio and a human price is
 * `10 ** (WFAIR_DECIMALS - USDC_DECIMALS) = 1e12`. For a human price `P` USDC per
 * WFAIR the raw ratio is `1e12 / P`, so we invert:
 *
 *   usdPerWfair = 1e12 / ((sqrtPriceX96 / 2**96) ** 2)
 */
export async function loadPoolPrice(): Promise<number | null> {
  const client = getBasePublicClient();
  const slot0 = await client.readContract({
    address: WFAIR_USDC_POOL_ADDRESS,
    abi: UNISWAP_V3_POOL_ABI,
    functionName: "slot0",
  });

  const sqrtPriceX96 = slot0[0];
  if (sqrtPriceX96 <= 0n) return null;

  const decimalAdjustment = 10 ** (WFAIR_DECIMALS - USDC_DECIMALS);
  const ratio = (Number(sqrtPriceX96) / 2 ** 96) ** 2;
  if (!Number.isFinite(ratio) || ratio <= 0) return null;

  const usdPerWfair = decimalAdjustment / ratio;
  return Number.isFinite(usdPerWfair) && usdPerWfair > 0 ? usdPerWfair : null;
}

/**
 * Supplementary context from GeckoTerminal: 24h volume, on-chain reserve value
 * (surfaced as liquidity), market cap. Also returns a price we can fall back to
 * if the pool read failed.
 */
async function loadFromGeckoTerminal(): Promise<{ price: number | null; context: PriceContext }> {
  const body = await fetchJson<GeckoTerminalTokenResponse>(
    `${GECKOTERMINAL_BASE}/networks/${WFAIR_NETWORK}/tokens/${WFAIR_ADDRESS}`,
  );
  const attrs = body.data?.attributes ?? null;

  return {
    price: parseNumeric(attrs?.price_usd),
    context: {
      change24h: null,
      volume24h: parseNumeric(attrs?.volume_usd?.h24),
      liquidityUsd: parseNumeric(attrs?.total_reserve_in_usd),
      marketCapUsd: parseNumeric(attrs?.market_cap_usd),
    },
  };
}

/**
 * Last-ditch price + context from Dexscreener. Only consulted when both the
 * pool read and GeckoTerminal failed to produce a price.
 */
async function loadFromDexscreener(): Promise<{ price: number; context: PriceContext } | null> {
  const body = await fetchJson<DexscreenerTokenResponse>(`${DEXSCREENER_BASE}/tokens/${WFAIR_ADDRESS}`);
  const pair = body.pairs?.[0];
  if (!pair) return null;

  const price = parseNumeric(pair.priceUsd);
  if (price === null) return null;

  return {
    price,
    context: {
      change24h: parseNumeric(pair.priceChange?.h24),
      volume24h: parseNumeric(pair.volume?.h24),
      liquidityUsd: parseNumeric(pair.liquidity?.usd),
      marketCapUsd: parseNumeric(pair.marketCap),
    },
  };
}

async function loadPrice(): Promise<PricePayload> {
  // 1. On-chain pool spot price (primary). Supplementary context comes from the
  //    indexers below, fetched in parallel so a slow indexer never delays price.
  const [poolPrice, gecko] = await Promise.all([
    loadPoolPrice().catch((error: unknown) => {
      console.error("WFAIR/USDC pool slot0 read failed:", error);
      return null;
    }),
    loadFromGeckoTerminal().catch((error: unknown) => {
      console.error("GeckoTerminal context fetch failed for WFAIR:", error);
      return { price: null as number | null, context: EMPTY_CONTEXT };
    }),
  ]);

  let price = poolPrice;
  let context = gecko.context;
  let source: PriceSource = PRICE_SOURCE_POOL;

  // 2. Pool unavailable → fall back to GeckoTerminal's indexed price.
  if (price === null && gecko.price !== null) {
    price = gecko.price;
    source = PRICE_SOURCE_FALLBACK;
  }

  // 3. Still no price → last-ditch Dexscreener (also enriches context).
  if (price === null) {
    const dex = await loadFromDexscreener().catch((error: unknown) => {
      console.error("Dexscreener fallback failed for WFAIR price:", error);
      return null;
    });
    if (dex) {
      price = dex.price;
      source = PRICE_SOURCE_FALLBACK;
      context = {
        change24h: dex.context.change24h ?? context.change24h,
        volume24h: dex.context.volume24h ?? context.volume24h,
        liquidityUsd: dex.context.liquidityUsd ?? context.liquidityUsd,
        marketCapUsd: dex.context.marketCapUsd ?? context.marketCapUsd,
      };
    }
  }

  return {
    price,
    change24h: context.change24h,
    volume24h: context.volume24h,
    liquidityUsd: context.liquidityUsd,
    marketCapUsd: context.marketCapUsd,
    source,
    updatedAt: new Date().toISOString(),
  };
}

// ---- Module-level cache + single-flight (mirrors routes/github.ts) ----

interface CacheEntry {
  data: PricePayload;
  expires: number;
}

let cache: CacheEntry | null = null;
let lastGood: PricePayload | null = null;
/** De-duplicates concurrent cache misses into a single upstream fetch. */
let inFlight: Promise<PricePayload> | null = null;

/**
 * Return the live FAIR/WFAIR USD price payload. Cached for {@link CACHE_TTL_MS}
 * and single-flighted so concurrent misses share one upstream round-trip. Always
 * resolves (never throws): on failure it serves the last good payload, or an
 * honest null-price payload when none exists yet.
 */
export async function getPrice(): Promise<PricePayload> {
  const now = Date.now();
  if (cache && cache.expires > now) {
    return cache.data;
  }

  if (!inFlight) {
    inFlight = loadPrice();
  }

  try {
    const data = await inFlight;
    cache = { data, expires: now + CACHE_TTL_MS };
    lastGood = data;
    return data;
  } catch (error: unknown) {
    console.error("Error fetching WFAIR price:", error);
    if (lastGood) {
      return lastGood;
    }
    return {
      price: null,
      change24h: null,
      volume24h: null,
      liquidityUsd: null,
      marketCapUsd: null,
      source: PRICE_SOURCE_POOL,
      updatedAt: new Date().toISOString(),
    };
  } finally {
    inFlight = null;
  }
}
