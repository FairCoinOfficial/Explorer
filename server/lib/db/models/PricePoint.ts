import mongoose, { Schema, type Document } from "mongoose";

/**
 * A single sampled FAIR/USD indexed market price.
 *
 * Unlike {@link ./Price.ts} (operator-entered reference prices), these rows are
 * written automatically by the server-side sampler in `routes/price.ts`: it
 * reads the same indexed feed as `GET /api/price` on an interval and appends
 * one point per sampling window. The accumulated series backs `GET /api/price/history`
 * (the home price-card sparkline).
 */
export interface IPricePoint extends Document {
  price_usd: number;
  source: string;
  timestamp: Date;
}

const PricePointSchema = new Schema<IPricePoint>({
  price_usd: { type: Number, required: true },
  source: { type: String, required: true, default: "wfair-base" },
  // A unique index makes the per-window upsert idempotent: two concurrent ticks
  // (or a restart mid-window) collapse onto the same bucket instead of duplicating.
  timestamp: { type: Date, required: true, unique: true },
});

export const PricePoint =
  mongoose.models.PricePoint ||
  mongoose.model<IPricePoint>("PricePoint", PricePointSchema);
