// Shared FAIR/WFAIR price service.
//
// The live USD price of FAIR is sourced from WFAIR — the wrapped-FAIR bridge
// token on Base L2 (1:1 peg). Public price responses deliberately rely on
// indexed market data instead of the current Uniswap V3 pool slot0 spot price:
// the pool can be low-liquidity or single-sided, so its instantaneous tick is
// not a safe oracle for the official explorer price.
//
// This module is the single source of truth for the price computation. Both the
// REST route (`routes/price.ts`) and the MCP server consume `getPrice()` here so
// the logic is never duplicated.

/** WFAIR on Base, 18 decimals. */
const WFAIR_ADDRESS = "0xF2853CedDF47A05Fee0B4b24DFf2925d59737fb3" as const;

const WFAIR_NETWORK = "base";
export const PRICE_SOURCE_INDEXER = "wfair-base" as const;
export type PriceSource = typeof PRICE_SOURCE_INDEXER;

const GECKOTERMINAL_BASE = "https://api.geckoterminal.com/api/v2";
const DEXSCREENER_BASE = "https://api.dexscreener.com/latest/dex";

/** 60s — fresh enough for the home card while staying well under rate limits. */
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
 * Preferred public price and context from GeckoTerminal: price, 24h volume,
 * on-chain reserve value (surfaced as liquidity), and market cap.
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
 * Last-ditch price + context from Dexscreener. Only consulted when
 * GeckoTerminal failed to produce a price.
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
  // 1. GeckoTerminal is the preferred source for public price and context.
  //    Do not substitute the instantaneous Uniswap V3 slot0 spot price here;
  //    a low-liquidity pool tick is manipulable and is not an oracle.
  const gecko = await loadFromGeckoTerminal().catch((error: unknown) => {
    console.error("GeckoTerminal price fetch failed for WFAIR:", error);
    return { price: null as number | null, context: EMPTY_CONTEXT };
  });

  let price = gecko.price;
  let context = gecko.context;
  const source: PriceSource = PRICE_SOURCE_INDEXER;

  // 2. Still no price → last-ditch Dexscreener (also enriches context).
  if (price === null) {
    const dex = await loadFromDexscreener().catch((error: unknown) => {
      console.error("Dexscreener fallback failed for WFAIR price:", error);
      return null;
    });
    if (dex) {
      price = dex.price;
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
      source: PRICE_SOURCE_INDEXER,
      updatedAt: new Date().toISOString(),
    };
  } finally {
    inFlight = null;
  }
}
