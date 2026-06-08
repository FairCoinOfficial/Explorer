import { Router, type Request, type Response } from "express";
import connectToDatabase from "../lib/db/connect";
import { Price } from "../lib/db/models/Price";
import { PricePoint } from "../lib/db/models/PricePoint";
import { getBasePublicClient } from "../lib/base-client";

const router = Router();

/**
 * GET /api/price
 *
 * Returns the live USD price of FAIR, sourced from WFAIR — the wrapped-FAIR
 * bridge token on Base L2 (1:1 peg, so WFAIR's market price represents FAIR's).
 *
 * Primary source is the on-chain spot price of the WFAIR/USDC Uniswap V3 pool,
 * read directly from the pool's `slot0()` via the Base RPC. The pool has a real
 * spot price even when it is single-sided / un-traded, so this works where the
 * indexers below return `null`.
 *
 * GeckoTerminal / Dexscreener are kept only for *supplementary* context (24h
 * volume, USD liquidity) and as a price fallback if the pool read ever fails.
 *
 * Price is computed server-side (no key required) and cached for
 * {@link CACHE_TTL_MS}, mirroring the single-flight pattern in routes/github.ts.
 *
 * Source order:
 *   1. WFAIR/USDC Uniswap V3 pool `slot0` (primary, on-chain spot price).
 *   2. GeckoTerminal token endpoint (price fallback + volume/liquidity context).
 *   3. Dexscreener token endpoint (last-ditch price fallback).
 *
 * The endpoint always returns HTTP 200 (never a 5xx); `price` is `null` only in
 * the unlikely case that every source above is unavailable.
 */

// ---- On-chain pool (Base, Uniswap V3, fee 0.3%) ----

/** WFAIR/USDC Uniswap V3 pool on Base. token0 = USDC, token1 = WFAIR. */
const WFAIR_USDC_POOL_ADDRESS = "0x9F4F694390c60b51e30461c785C1345A1545b7ca" as const;
/** USDC on Base (pool token0), 6 decimals. */
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
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
const PRICE_SOURCE_POOL = "wfair-usdc-pool" as const;
const PRICE_SOURCE_FALLBACK = "wfair-base" as const;
type PriceSource = typeof PRICE_SOURCE_POOL | typeof PRICE_SOURCE_FALLBACK;

const GECKOTERMINAL_BASE = "https://api.geckoterminal.com/api/v2";
const DEXSCREENER_BASE = "https://api.dexscreener.com/latest/dex";

/** 60s — fresh enough for a spot price while staying well under rate limits. */
const CACHE_TTL_MS = 60 * 1000;

/** Upstream request timeout to keep the endpoint responsive on slow networks. */
const UPSTREAM_TIMEOUT_MS = 8_000;

interface PricePayload {
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
 * `10 ** (WFAIR_DECIMALS - USDC_DECIMALS) = 1e12`. Concretely, for a human price
 * of `P` USDC per WFAIR the raw ratio is `1e12 / P`, so we invert:
 *
 *   usdPerWfair = 1e12 / ((sqrtPriceX96 / 2**96) ** 2)
 *
 * Number-precision math is acceptable here: the result feeds a display string
 * rounded to a few decimals, and `sqrtPriceX96` (≤ 2**160) stays well within a
 * double's exactly-representable range once divided by 2**96.
 */
async function loadPoolPrice(): Promise<number | null> {
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
      // GeckoTerminal's token endpoint exposes no 24h price-change percentage.
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
  const body = await fetchJson<DexscreenerTokenResponse>(
    `${DEXSCREENER_BASE}/tokens/${WFAIR_ADDRESS}`,
  );
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

async function getPrice(): Promise<PricePayload> {
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
    // Serve the last successful payload if we have one; otherwise an honest
    // null-price payload so the client renders its "no market yet" state.
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

// ---- Price history sampler (accumulates a real series over time) ----
//
// The pool has a real on-chain spot price even though it is single-sided and
// un-traded, so no OHLCV indexer will chart it. To build a genuine history we
// sample that spot price ourselves: a server-side interval reads the pool and
// upserts one point per fixed time window into Mongo. The accumulated series
// backs the home price-card sparkline via GET /api/price/history.

/** One sample per 5-minute window. */
const SAMPLE_INTERVAL_MS = 5 * 60 * 1000;
/** Retain ~7 days of history; older points are pruned on each successful write. */
const HISTORY_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
/** Cap on points returned by GET /api/price/history (newest-biased, then sorted asc). */
const HISTORY_MAX_POINTS = 100;

/**
 * Floor `now` to the start of its sampling window. Bucketing the timestamp makes
 * the upsert idempotent: every tick inside one window targets the same document,
 * so a restart, an overlapping run, or a double-fire can never create duplicates
 * (the unique index on `timestamp` enforces ≤1 sample per window).
 */
function currentSampleBucket(now: number): Date {
  return new Date(Math.floor(now / SAMPLE_INTERVAL_MS) * SAMPLE_INTERVAL_MS);
}

/**
 * Read the pool spot price once and upsert it as this window's sample, then prune
 * points older than the retention horizon. Fully guarded — any failure (RPC down,
 * Mongo unavailable) is logged and swallowed so the sampler never crashes the
 * process or interferes with serving requests.
 */
async function sampleAndStorePrice(): Promise<void> {
  try {
    const price = await loadPoolPrice();
    if (price === null) {
      // No usable spot price this tick (e.g. transient RPC issue); skip quietly.
      return;
    }

    await connectToDatabase();

    const bucket = currentSampleBucket(Date.now());
    await PricePoint.updateOne(
      { timestamp: bucket },
      { $set: { price_usd: price, source: PRICE_SOURCE_POOL } },
      { upsert: true },
    );

    const cutoff = new Date(Date.now() - HISTORY_RETENTION_MS);
    await PricePoint.deleteMany({ timestamp: { $lt: cutoff } });
  } catch (error: unknown) {
    console.error("Price sampler tick failed:", error);
  }
}

let samplerStarted = false;

/**
 * Start the background sampler exactly once per process. Runs an immediate tick
 * (so history begins accumulating without waiting a full window) and then on a
 * fixed interval. `unref()` keeps the timer from holding the event loop open, so
 * it never blocks a graceful shutdown.
 */
function startPriceSampler(): void {
  if (samplerStarted) return;
  samplerStarted = true;

  void sampleAndStorePrice();

  const timer = setInterval(() => {
    void sampleAndStorePrice();
  }, SAMPLE_INTERVAL_MS);
  timer.unref?.();
}

startPriceSampler();

router.get("/", async (_req: Request, res: Response) => {
  const data = await getPrice();
  res.json(data);
});

interface PriceHistoryPoint {
  price_usd: number;
  timestamp: string;
}

/**
 * GET /api/price/history?period=24h|7d|30d|1y|all
 *
 * Returns the stored WFAIR/USDC spot-price series accumulated by the sampler
 * above, oldest→newest, capped to the most recent {@link HISTORY_MAX_POINTS}
 * points (≈7 days at the sampling cadence). The series is empty until the first
 * sample lands; either way the response is always HTTP 200 (never a 5xx) so the
 * card can render its low-data state instead of erroring.
 *
 * The `period` query param is accepted for forward-compatibility but does not
 * widen the window beyond retention; the stored series is already bounded.
 */
router.get("/history", async (_req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const cutoff = new Date(Date.now() - HISTORY_RETENTION_MS);
    const docs = await PricePoint.find({ timestamp: { $gte: cutoff } })
      .sort({ timestamp: -1 })
      .limit(HISTORY_MAX_POINTS)
      .lean<{ price_usd: number; timestamp: Date }[]>()
      .exec();

    // Fetched newest-first (to take the most recent N); reverse to oldest→newest
    // for charting.
    const history: PriceHistoryPoint[] = docs
      .reverse()
      .map((doc) => ({
        price_usd: doc.price_usd,
        timestamp: doc.timestamp.toISOString(),
      }));

    res.json({ history, source: PRICE_SOURCE_POOL });
  } catch (error: unknown) {
    console.error("Error fetching price history:", error);
    // Honest empty series rather than a 5xx so the sparkline degrades gracefully.
    res.json({ history: [], source: PRICE_SOURCE_POOL });
  }
});

/**
 * POST /api/price
 *
 * Records a manual price point in the database (admin, protected by API key).
 * This is independent of the live WFAIR feed above — it remains available for
 * operators who want to log reference prices, but the public GET always serves
 * the live WFAIR market price.
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const apiKey = req.headers["x-api-key"] as string | undefined;
    const expectedKey = process.env.EXPLORER_API_KEY;

    if (!expectedKey || apiKey !== expectedKey) {
      res.status(401).json({ error: "Unauthorized: invalid or missing API key" });
      return;
    }

    await connectToDatabase();

    const { price_usd, price_eur, price_btc, source } = req.body as {
      price_usd?: number;
      price_eur?: number;
      price_btc?: number;
      source?: string;
    };

    if (typeof price_usd !== "number" || price_usd < 0) {
      res.status(400).json({ error: "price_usd is required and must be a non-negative number" });
      return;
    }

    const priceDoc = await Price.create({
      price_usd,
      price_eur: typeof price_eur === "number" ? price_eur : 0,
      price_btc: typeof price_btc === "number" ? price_btc : 0,
      source: typeof source === "string" && source.length > 0 ? source : "manual",
      set_by: "api",
      timestamp: new Date(),
    });

    res.json({
      success: true,
      price: {
        usd: priceDoc.price_usd,
        eur: priceDoc.price_eur,
        btc: priceDoc.price_btc,
        source: priceDoc.source,
        timestamp: priceDoc.timestamp,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to set price";
    console.error("Error setting price:", error);
    res.status(500).json({ error: message });
  }
});

export default router;
