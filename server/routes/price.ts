import { Router, type Request, type Response } from "express";
import connectToDatabase from "../lib/db/connect";
import { Price } from "../lib/db/models/Price";

const router = Router();

/**
 * GET /api/price
 *
 * Returns the live USD price of FAIR, sourced from WFAIR — the wrapped-FAIR
 * bridge token on Base L2 (1:1 peg, so WFAIR's market price represents FAIR's).
 *
 * Price is fetched server-side (no key required) and cached for
 * {@link CACHE_TTL_MS}, mirroring the single-flight pattern in routes/github.ts.
 *
 * Source order:
 *   1. GeckoTerminal token endpoint (primary, public/no-key).
 *   2. Dexscreener token endpoint (fallback, used only if Gecko has no price
 *      but a Dexscreener pair appears later).
 *
 * Reality at time of writing: WFAIR has no Uniswap pool with liquidity, so
 * `price_usd` is `null`. That is an honest, expected state — the endpoint
 * returns `{ price: null, ... }` with HTTP 200 (never a 5xx), and will begin
 * serving a real price automatically the moment a priced pool exists.
 */

const WFAIR_ADDRESS = "0xF2853CedDF47A05Fee0B4b24DFf2925d59737fb3";
const WFAIR_NETWORK = "base";
const PRICE_SOURCE = "wfair-base" as const;

const GECKOTERMINAL_BASE = "https://api.geckoterminal.com/api/v2";
const DEXSCREENER_BASE = "https://api.dexscreener.com/latest/dex";

/** 3 minutes — long enough to stay well under upstream rate limits. */
const CACHE_TTL_MS = 3 * 60 * 1000;

/** Upstream request timeout to keep the endpoint responsive on slow networks. */
const UPSTREAM_TIMEOUT_MS = 8_000;

interface PricePayload {
  price: number | null;
  change24h: number | null;
  volume24h: number | null;
  liquidityUsd: number | null;
  marketCapUsd: number | null;
  source: typeof PRICE_SOURCE;
  updatedAt: string;
}

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
 * Primary source: GeckoTerminal. Returns a partial payload; `price` may be
 * `null` when no priced pool exists yet (the current real-world state).
 */
async function loadFromGeckoTerminal(): Promise<Omit<PricePayload, "source" | "updatedAt">> {
  const body = await fetchJson<GeckoTerminalTokenResponse>(
    `${GECKOTERMINAL_BASE}/networks/${WFAIR_NETWORK}/tokens/${WFAIR_ADDRESS}`,
  );
  const attrs = body.data?.attributes ?? null;

  // GeckoTerminal does not expose a 24h price-change percentage on the token
  // endpoint; it only becomes available once we can read it from a pool
  // (Dexscreener). `total_reserve_in_usd` is the on-chain reserve value and is
  // populated even before a priced pool exists, so we surface it as liquidity.
  return {
    price: parseNumeric(attrs?.price_usd),
    change24h: null,
    volume24h: parseNumeric(attrs?.volume_usd?.h24),
    liquidityUsd: parseNumeric(attrs?.total_reserve_in_usd),
    marketCapUsd: parseNumeric(attrs?.market_cap_usd),
  };
}

/**
 * Fallback source: Dexscreener. Only consulted to fill in a price when Gecko
 * has none — handy if a pair is indexed by Dexscreener before GeckoTerminal.
 */
async function loadFromDexscreener(): Promise<Omit<PricePayload, "source" | "updatedAt"> | null> {
  const body = await fetchJson<DexscreenerTokenResponse>(
    `${DEXSCREENER_BASE}/tokens/${WFAIR_ADDRESS}`,
  );
  const pair = body.pairs?.[0];
  if (!pair) return null;

  const price = parseNumeric(pair.priceUsd);
  if (price === null) return null;

  return {
    price,
    change24h: parseNumeric(pair.priceChange?.h24),
    volume24h: parseNumeric(pair.volume?.h24),
    liquidityUsd: parseNumeric(pair.liquidity?.usd),
    marketCapUsd: parseNumeric(pair.marketCap),
  };
}

async function loadPrice(): Promise<PricePayload> {
  const gecko = await loadFromGeckoTerminal();

  // Prefer GeckoTerminal when it already has a price. Otherwise try Dexscreener,
  // which may surface a freshly-created pair sooner. Either way, merge so we
  // keep Gecko's reserve/volume context even when Dexscreener supplies price.
  let merged = gecko;
  if (gecko.price === null) {
    const dex = await loadFromDexscreener().catch((error: unknown) => {
      console.error("Dexscreener fallback failed for WFAIR price:", error);
      return null;
    });
    if (dex && dex.price !== null) {
      merged = {
        price: dex.price,
        change24h: dex.change24h ?? gecko.change24h,
        volume24h: dex.volume24h ?? gecko.volume24h,
        liquidityUsd: dex.liquidityUsd ?? gecko.liquidityUsd,
        marketCapUsd: dex.marketCapUsd ?? gecko.marketCapUsd,
      };
    }
  }

  return {
    ...merged,
    source: PRICE_SOURCE,
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
      source: PRICE_SOURCE,
      updatedAt: new Date().toISOString(),
    };
  } finally {
    inFlight = null;
  }
}

router.get("/", async (_req: Request, res: Response) => {
  const data = await getPrice();
  res.json(data);
});

/**
 * GET /api/price/history?period=24h|7d|30d|1y|all
 *
 * Sparkline source. GeckoTerminal OHLCV requires a pool address, which does not
 * exist for WFAIR yet, so we have no on-chain price history to chart. Returns an
 * empty series gracefully (HTTP 200, never an error). When a priced pool
 * appears, this is the single place to wire pool-OHLCV fetching.
 */
router.get("/history", (_req: Request, res: Response) => {
  res.json({ history: [], source: PRICE_SOURCE });
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
