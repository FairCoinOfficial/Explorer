import mongoose from 'mongoose'
import type { NetworkType } from '@fairco.in/core'

/**
 * The events a subscription can opt into. The push payload carries the matched
 * event by name; the visible notification text is composed on-device (no amount
 * or address ever transits FCM/APNS).
 */
export const NOTIFICATION_EVENTS = [
  'incoming_pending',
  'incoming_confirmed',
  'outgoing_confirmed',
] as const
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number]

/** Push transports the wallet can register a device token for. */
export const PLATFORMS = ['android', 'ios'] as const
export type Platform = (typeof PLATFORMS)[number]

/** Address encodings the service watches. FairCoin standard is P2PKH. */
export const SCRIPT_TYPES = ['p2pkh'] as const
export type ScriptType = (typeof SCRIPT_TYPES)[number]

export interface INotificationSubscription {
  /** Opaque, revocable subscription reference. Carries no wallet identity/PII. */
  subscriptionId: string
  /** Account-level watch-only extended public key (m/44'/coinType'/0'). */
  xpub: string
  scriptType: ScriptType
  /** BIP44 gap limit: unused-address lookahead kept beyond the highest used index. */
  gapLimit: number
  network: NetworkType
  /** Rotating native FCM/APNS device token — the wake target, not an identity. */
  deviceToken: string
  platform: Platform
  /** Confirmation depth at which an `*_confirmed` event fires. */
  confirmations: number
  events: NotificationEvent[]
  /** Highest index+1 currently derived+watched per chain (the gap-limit frontier). */
  derivedTo: {
    receive: number
    change: number
  }
  /** Last time a block matched this subscription (used for pruning stale rows). */
  lastSeenAt?: Date
  createdAt: Date
  updatedAt: Date
}

const NotificationSubscriptionSchema = new mongoose.Schema<INotificationSubscription>(
  {
    subscriptionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    xpub: {
      type: String,
      required: true,
    },
    scriptType: {
      type: String,
      enum: SCRIPT_TYPES,
      required: true,
      default: 'p2pkh',
    },
    gapLimit: {
      type: Number,
      required: true,
    },
    network: {
      type: String,
      enum: ['mainnet', 'testnet'],
      required: true,
    },
    deviceToken: {
      type: String,
      required: true,
    },
    platform: {
      type: String,
      enum: PLATFORMS,
      required: true,
    },
    confirmations: {
      type: Number,
      required: true,
      default: 1,
    },
    events: {
      type: [String],
      enum: NOTIFICATION_EVENTS,
      required: true,
    },
    derivedTo: {
      receive: { type: Number, required: true, default: 0 },
      change: { type: Number, required: true, default: 0 },
    },
    lastSeenAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
)

// A device token is unique to one install; a second registration for the same
// token+network reuses the row rather than orphaning the previous one.
NotificationSubscriptionSchema.index({ deviceToken: 1, network: 1 })

export default mongoose.models.NotificationSubscription ||
  mongoose.model<INotificationSubscription>('NotificationSubscription', NotificationSubscriptionSchema)
