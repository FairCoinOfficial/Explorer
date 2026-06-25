import { Router, type Request, type Response } from "express";
import { timingSafeEqual } from "crypto";
import connectToDatabase from "../lib/db/connect";
import { Price } from "../lib/db/models/Price";
import { PricePoint } from "../lib/db/models/PricePoint";
import { getPrice, PRICE_SOURCE_INDEXER } from "../lib/price-service";

const router = Router();

/** Constant-time string comparison to avoid leaking the API key via timing. */
function safeKeyEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * GET /api/price
 *
 * Returns the live USD price of FAIR, sourced from WFAIR — the wrapped-FAIR
 * bridge token on Base L2 (1:1 peg, so WFAIR's market price represents FAIR's).
 *
 * The price computation (indexer-sourced, cached and single-flighted) lives in
 * {@link getPrice} in `lib/price-service.ts` so the
 * REST route and the MCP server share one implementation. This route adds the
 * history sampler and the protected manual-price POST below.
 *
 * The endpoint always returns HTTP 200 (never a 5xx); `price` is `null` only in
 * the unlikely case that every source is unavailable.
 */

// ---- Price history sampler (accumulates a real series over time) ----
//
// To build a genuine history we sample the same trusted public price feed used
// by GET /api/price and upsert one point per fixed time window into Mongo. The
// accumulated series backs the home price-card sparkline via GET /api/price/history.

/** One sample per 5-minute window. */
const SAMPLE_INTERVAL_MS = 5 * 60 * 1000;
/** Keep full 5-minute resolution for this window... */
const FINE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
/** ...then thin to hourly points up to this horizon; nothing is kept past it. */
const COARSE_RETENTION_MS = 366 * 24 * 60 * 60 * 1000;
/** Cap on points returned by GET /api/price/history (series is thinned evenly). */
const HISTORY_MAX_POINTS = 300;
/** One hour, used to identify the hourly samples that survive coarse pruning. */
const HOUR_MS = 60 * 60 * 1000;

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
 * Read the current public price once and upsert it as this window's sample, then
 * prune in two tiers: inside {@link FINE_RETENTION_MS} every 5-minute sample is
 * kept; between fine and {@link COARSE_RETENTION_MS} only on-the-hour samples
 * survive (long-horizon charts need no finer grain); beyond coarse everything
 * is dropped. Fully guarded — any failure (RPC down, Mongo unavailable) is
 * logged and swallowed so the sampler never crashes the process.
 */
async function sampleAndStorePrice(): Promise<void> {
  try {
    const payload = await getPrice();
    const price = payload.price;
    if (price === null) {
      // No usable indexed price this tick; skip quietly.
      return;
    }

    await connectToDatabase();

    const bucket = currentSampleBucket(Date.now());
    await PricePoint.updateOne(
      { timestamp: bucket },
      { $set: { price_usd: price, source: PRICE_SOURCE_INDEXER } },
      { upsert: true },
    );

    const now = Date.now();
    const fineCutoff = new Date(now - FINE_RETENTION_MS);
    const coarseCutoff = new Date(now - COARSE_RETENTION_MS);

    // Tier 2: drop everything older than the coarse horizon.
    await PricePoint.deleteMany({ timestamp: { $lt: coarseCutoff } });

    // Tier 1: between coarse and fine horizons keep only on-the-hour samples.
    // Sample timestamps are bucketed to 5-minute boundaries, so "on the hour"
    // is an exact modulo check on the epoch milliseconds.
    const candidates = await PricePoint.find({
      timestamp: { $gte: coarseCutoff, $lt: fineCutoff },
    })
      .select("_id timestamp")
      .lean<{ _id: unknown; timestamp: Date }[]>()
      .exec();
    const toDelete = candidates
      .filter((doc) => doc.timestamp.getTime() % HOUR_MS !== 0)
      .map((doc) => doc._id);
    if (toDelete.length > 0) {
      await PricePoint.deleteMany({ _id: { $in: toDelete } });
    }
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

interface PriceHistoryDoc {
  price_usd: number;
  timestamp: Date;
}

/** Lookback window per `period` query value, in milliseconds. */
const PERIOD_WINDOW_MS: Record<string, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "1y": 365 * 24 * 60 * 60 * 1000,
};

async function fetchBoundedPriceHistory(cutoff: Date, windowEndMs: number): Promise<PriceHistoryDoc[]> {
  const docs = await PricePoint.find({ timestamp: { $gte: cutoff } })
    .sort({ timestamp: 1 })
    .lean<PriceHistoryDoc[]>()
    .exec();

  if (docs.length <= HISTORY_MAX_POINTS) {
    return docs;
  }

  const cutoffMs = cutoff.getTime();
  const stepMs = (windowEndMs - cutoffMs) / HISTORY_MAX_POINTS;
  const targetTimes = Array.from({ length: HISTORY_MAX_POINTS - 1 }, (_unused, index) => cutoffMs + index * stepMs);

  const docsByTimestamp = new Map<string, PriceHistoryDoc>();

  let docIndex = 0;
  for (const targetTime of targetTimes) {
    while (docIndex < docs.length && docs[docIndex].timestamp.getTime() < targetTime) {
      docIndex += 1;
    }

    if (docIndex < docs.length) {
      const doc = docs[docIndex];
      docsByTimestamp.set(doc.timestamp.toISOString(), doc);
    }
  }
  const lastDoc = docs.at(-1);
  if (lastDoc) {
    docsByTimestamp.set(lastDoc.timestamp.toISOString(), lastDoc);
  }

  return Array.from(docsByTimestamp.values()).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

/**
 * GET /api/price/history?period=24h|7d|30d|1y|all
 *
 * Returns the stored WFAIR indexed-price series accumulated by the sampler
 * above, oldest→newest, for the requested period (defaults to 7d). When the
 * window holds more than {@link HISTORY_MAX_POINTS} samples the series is thinned
 * evenly (keeping the last point) so the payload stays bounded. The series is
 * empty until the first sample lands; either way the response is always HTTP 200
 * (never a 5xx) so the card can render its low-data state instead of erroring.
 */
router.get("/history", async (req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const period = String(req.query.period ?? "7d");
    const windowMs = period === "all" ? COARSE_RETENTION_MS : PERIOD_WINDOW_MS[period] ?? PERIOD_WINDOW_MS["7d"];
    const now = Date.now();
    const cutoff = new Date(now - windowMs);

    const series = await fetchBoundedPriceHistory(cutoff, now);

    const history: PriceHistoryPoint[] = series.map((doc) => ({
      price_usd: doc.price_usd,
      timestamp: doc.timestamp.toISOString(),
    }));

    res.json({ history, period, source: PRICE_SOURCE_INDEXER });
  } catch (error: unknown) {
    console.error("Error fetching price history:", error);
    // Honest empty series rather than a 5xx so the sparkline degrades gracefully.
    res.json({ history: [], source: PRICE_SOURCE_INDEXER });
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

    if (!expectedKey || typeof apiKey !== "string" || !safeKeyEqual(apiKey, expectedKey)) {
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
