import { Router, type Request, type Response } from "express";
import connectToDatabase from "../lib/db/connect";
import { StatPoint } from "../lib/db/models/StatPoint";
import { blockCache } from "../lib/cache";

const router = Router();

/**
 * Stats history sampler + endpoint.
 *
 * Mirrors the price-history machinery in `routes/price.ts`. The `/api/stats`
 * inline handler in `server/index.ts` computes a fresh snapshot on every request
 * but keeps no history, so there is nothing to chart over time. To give the home
 * stat-strip real micro-sparklines, this module samples the same live numbers on
 * a fixed interval and upserts one point per window into Mongo. `GET
 * /api/stats/history` returns the accumulated series (last 7 days, ≤100 points).
 *
 * Only the time-varying stats are recorded: block height (for client-derived
 * circulating supply), difficulty, and peer connections. The series is read off
 * the shared {@link blockCache}, i.e. the exact source the live `/api/stats`
 * handler uses, so the sampled values stay consistent with what the page shows.
 */

/** Stat history is sampled for mainnet only (what the home dashboard renders). */
const SAMPLE_NETWORK = "mainnet" as const;

/** One sample per 5-minute window (matches the price sampler cadence). */
const SAMPLE_INTERVAL_MS = 5 * 60 * 1000;
/** Retain ~7 days of history; older points are pruned on each successful write. */
const HISTORY_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
/** Cap on points returned by GET /api/stats/history (newest-biased, then sorted asc). */
const HISTORY_MAX_POINTS = 100;

interface StatSample {
  height: number;
  difficulty: number;
  connections: number;
}

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
 * Read the live, cache-backed stats once. Each underlying RPC is individually
 * guarded so a single slow/unavailable call degrades to a sensible default
 * rather than failing the whole sample.
 */
async function loadStatSample(): Promise<StatSample> {
  const [blockHeight, miningInfo, networkInfo] = await Promise.all([
    blockCache.getBlockCount(SAMPLE_NETWORK).catch(() => 0),
    blockCache.getMiningInfo(SAMPLE_NETWORK).catch(() => null),
    blockCache.getNetworkInfo(SAMPLE_NETWORK).catch(() => null),
  ]);

  const difficultyRaw = (miningInfo as Record<string, unknown> | null)?.difficulty;
  const connectionsRaw = (networkInfo as Record<string, unknown> | null)?.connections;

  return {
    height: typeof blockHeight === "number" ? blockHeight : 0,
    difficulty: typeof difficultyRaw === "number" ? difficultyRaw : 0,
    connections: typeof connectionsRaw === "number" ? connectionsRaw : 0,
  };
}

/**
 * Sample the live stats once and upsert them as this window's point, then prune
 * points older than the retention horizon. Fully guarded — any failure (RPC
 * down, Mongo unavailable) is logged and swallowed so the sampler never crashes
 * the process or interferes with serving requests.
 */
async function sampleAndStoreStats(): Promise<void> {
  try {
    const sample = await loadStatSample();
    // A height of 0 means we never got a usable reading this tick; skip quietly
    // rather than persisting a junk all-zero point.
    if (sample.height <= 0) {
      return;
    }

    await connectToDatabase();

    const bucket = currentSampleBucket(Date.now());
    await StatPoint.updateOne(
      { timestamp: bucket },
      {
        $set: {
          height: sample.height,
          difficulty: sample.difficulty,
          connections: sample.connections,
        },
      },
      { upsert: true },
    );

    const cutoff = new Date(Date.now() - HISTORY_RETENTION_MS);
    await StatPoint.deleteMany({ timestamp: { $lt: cutoff } });
  } catch (error: unknown) {
    console.error("Stats sampler tick failed:", error);
  }
}

let samplerStarted = false;

/**
 * Start the background sampler exactly once per process. Runs an immediate tick
 * (so history begins accumulating without waiting a full window) and then on a
 * fixed interval. `unref()` keeps the timer from holding the event loop open, so
 * it never blocks a graceful shutdown.
 */
function startStatsSampler(): void {
  if (samplerStarted) return;
  samplerStarted = true;

  void sampleAndStoreStats();

  const timer = setInterval(() => {
    void sampleAndStoreStats();
  }, SAMPLE_INTERVAL_MS);
  timer.unref?.();
}

startStatsSampler();

interface StatHistoryPoint {
  height: number;
  difficulty: number;
  connections: number;
  timestamp: string;
}

/**
 * GET /api/stats/history
 *
 * Returns the stored stats series accumulated by the sampler above, oldest→
 * newest, capped to the most recent {@link HISTORY_MAX_POINTS} points (≈7 days
 * at the sampling cadence). The series is empty until the first sample lands;
 * either way the response is always HTTP 200 (never a 5xx) so the stat-strip can
 * render its clean no-history state instead of erroring.
 */
router.get("/", async (_req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const cutoff = new Date(Date.now() - HISTORY_RETENTION_MS);
    const docs = await StatPoint.find({ timestamp: { $gte: cutoff } })
      .sort({ timestamp: -1 })
      .limit(HISTORY_MAX_POINTS)
      .lean<{ height: number; difficulty: number; connections: number; timestamp: Date }[]>()
      .exec();

    // Fetched newest-first (to take the most recent N); reverse to oldest→newest
    // for charting.
    const history: StatHistoryPoint[] = docs.reverse().map((doc) => ({
      height: doc.height,
      difficulty: doc.difficulty,
      connections: doc.connections,
      timestamp: doc.timestamp.toISOString(),
    }));

    res.json({ history });
  } catch (error: unknown) {
    console.error("Error fetching stats history:", error);
    // Honest empty series rather than a 5xx so the sparklines degrade gracefully.
    res.json({ history: [] });
  }
});

export default router;
