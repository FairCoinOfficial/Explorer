// The push contract shared by the block matcher (producer of push jobs) and the
// dispatcher (FCM/APNS transport). Type-only: no runtime, no dependency on the
// mongoose document, so the matcher and the dispatcher stay decoupled and the
// dispatcher is trivially mockable in tests.

import type { NotificationEvent, Platform } from '../db/models/NotificationSubscription'

/**
 * The minimal subscription facts the dispatcher needs to deliver a push. It is
 * deliberately NOT the whole subscription: the transport never sees the xpub,
 * gap limit, or watched addresses — only where to send and the opaque id echoed
 * back in the (content-free) payload.
 */
export interface PushTarget {
  subscriptionId: string
  deviceToken: string
  platform: Platform
}

/**
 * The wake signal. This is the ENTIRE application payload that transits
 * FCM/APNS: an opaque subscription ref, the matched event name, and the txid the
 * device re-syncs locally. No amount, address, balance, or user identifier.
 */
export interface PushMessage {
  txid: string
  event: NotificationEvent
}

/** Delivers one silent push to one device. Implemented by the FCM/APNS dispatcher. */
export type PushDispatcher = (target: PushTarget, message: PushMessage) => Promise<void>
