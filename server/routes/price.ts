import { Router, type Request, type Response } from "express";
import connectToDatabase from "../lib/db/connect";
import { Price, type IPrice } from "../lib/db/models/Price";

const router = Router();

const VALID_PERIODS = ["24h", "7d", "30d", "1y", "all"] as const;
type Period = (typeof VALID_PERIODS)[number];

function periodToMs(period: Period): number {
  switch (period) {
    case "24h":
      return 24 * 60 * 60 * 1000;
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return 30 * 24 * 60 * 60 * 1000;
    case "1y":
      return 365 * 24 * 60 * 60 * 1000;
    case "all":
      return 0;
  }
}

function isValidPeriod(value: string): value is Period {
  return (VALID_PERIODS as readonly string[]).includes(value);
}

/**
 * GET /api/price
 * Returns the latest price and 24h change percentage.
 */
router.get("/", async (_req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const latest = await Price.findOne().sort({ timestamp: -1 }).lean<IPrice>();

    if (!latest) {
      res.json({ price: null, message: "No price data available" });
      return;
    }

    // Calculate 24h change
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const previous = await Price.findOne({ timestamp: { $lte: oneDayAgo } })
      .sort({ timestamp: -1 })
      .lean<IPrice>();

    interface Change24h {
      usd: number;
      eur: number;
      btc: number;
    }

    let change24h: Change24h | null = null;
    if (previous && previous.price_usd > 0) {
      change24h = {
        usd: ((latest.price_usd - previous.price_usd) / previous.price_usd) * 100,
        eur:
          previous.price_eur > 0
            ? ((latest.price_eur - previous.price_eur) / previous.price_eur) * 100
            : 0,
        btc:
          previous.price_btc > 0
            ? ((latest.price_btc - previous.price_btc) / previous.price_btc) * 100
            : 0,
      };
    }

    res.json({
      price: {
        usd: latest.price_usd,
        eur: latest.price_eur,
        btc: latest.price_btc,
      },
      source: latest.source,
      timestamp: latest.timestamp,
      change_24h: change24h,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch price";
    console.error("Error fetching price:", error);
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/price/history?period=24h|7d|30d|1y|all
 * Returns price history for the given period.
 */
router.get("/history", async (req: Request, res: Response) => {
  try {
    await connectToDatabase();

    const periodParam = (req.query.period as string) || "7d";
    const period: Period = isValidPeriod(periodParam) ? periodParam : "7d";
    const ms = periodToMs(period);

    const query = ms > 0 ? { timestamp: { $gte: new Date(Date.now() - ms) } } : {};

    const history = await Price.find(query)
      .sort({ timestamp: 1 })
      .select({ price_usd: 1, price_eur: 1, price_btc: 1, timestamp: 1, _id: 0 })
      .lean();

    res.json({ history, period });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch price history";
    console.error("Error fetching price history:", error);
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/price
 * Set a new price entry (admin, protected by API key).
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
