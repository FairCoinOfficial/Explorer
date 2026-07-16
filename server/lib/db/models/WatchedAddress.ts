import mongoose from 'mongoose'
import type { Chain } from '../../notifications/derive'

/**
 * One derived address the notification service watches on behalf of a
 * subscription. Indexed by `address` so matching a block output is O(1); a tx
 * output whose address is not present here belongs to no subscription.
 */
export interface IWatchedAddress {
  /** The base58check P2PKH address (the match key against block outputs). */
  address: string
  /** Owning subscription (opaque id). */
  subscriptionId: string
  /** BIP44 chain: 0 = receive, 1 = change. */
  chain: Chain
  /** Derivation index within the chain. */
  index: number
  createdAt: Date
  updatedAt: Date
}

const WatchedAddressSchema = new mongoose.Schema<IWatchedAddress>(
  {
    address: {
      type: String,
      required: true,
      index: true,
    },
    subscriptionId: {
      type: String,
      required: true,
      index: true,
    },
    chain: {
      type: Number,
      enum: [0, 1],
      required: true,
    },
    index: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

// One row per (subscription, chain, index): makes window derivation idempotent
// (re-deriving the same slot is a no-op upsert, never a duplicate row).
WatchedAddressSchema.index({ subscriptionId: 1, chain: 1, index: 1 }, { unique: true })

export default mongoose.models.WatchedAddress ||
  mongoose.model<IWatchedAddress>('WatchedAddress', WatchedAddressSchema)
