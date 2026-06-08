import mongoose, { Schema, type Document } from "mongoose";

/**
 * A single sampled snapshot of the network's time-varying stats.
 *
 * Mirrors {@link ./PricePoint.ts}: rows are written automatically by the
 * server-side sampler in `routes/stats-history.ts`, which reads the live chain
 * stats on an interval and appends one point per sampling window. The
 * accumulated series backs `GET /api/stats/history`, which feeds the subtle
 * background micro-sparklines on the home stat-strip (Difficulty, Supply,
 * Connections — supply is derived client-side from `height`).
 */
export interface IStatPoint extends Document {
  height: number;
  difficulty: number;
  connections: number;
  timestamp: Date;
}

const StatPointSchema = new Schema<IStatPoint>({
  height: { type: Number, required: true },
  difficulty: { type: Number, required: true },
  connections: { type: Number, required: true },
  // A unique index makes the per-window upsert idempotent: two concurrent ticks
  // (or a restart mid-window) collapse onto the same bucket instead of duplicating.
  timestamp: { type: Date, required: true, unique: true },
});

export const StatPoint =
  mongoose.models.StatPoint ||
  mongoose.model<IStatPoint>("StatPoint", StatPointSchema);
