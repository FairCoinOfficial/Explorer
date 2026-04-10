import mongoose, { Schema, type Document } from "mongoose";

export interface IPrice extends Document {
  price_usd: number;
  price_eur: number;
  price_btc: number;
  source: string;
  set_by: string;
  timestamp: Date;
}

const PriceSchema = new Schema<IPrice>({
  price_usd: { type: Number, required: true },
  price_eur: { type: Number, required: true, default: 0 },
  price_btc: { type: Number, required: true, default: 0 },
  source: { type: String, required: true, default: "manual" },
  set_by: { type: String, required: true, default: "admin" },
  timestamp: { type: Date, required: true, default: Date.now, index: true },
});

PriceSchema.index({ timestamp: -1 });

export const Price =
  mongoose.models.Price ||
  mongoose.model<IPrice>("Price", PriceSchema);
