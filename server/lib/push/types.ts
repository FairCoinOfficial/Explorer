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

/** Outcome of a single provider send. */
export interface PushSendResult {
  /** The provider reports this token is permanently invalid; the caller prunes it. */
  deadToken: boolean
}

/**
 * The FCM data message — the COMPLETE application payload sent to Google. Every
 * value is a string (FCM data constraint) and the only keys are the content-free
 * wake signal. No amount/address/balance ever appears here.
 */
export interface PushData {
  txid: string
  event: NotificationEvent
  subscriptionId: string
}

/** Sends a data-only FCM message. Transient failures throw; a dead token resolves. */
export type FcmSender = (deviceToken: string, data: PushData) => Promise<PushSendResult>

/**
 * The APNS background-push payload: a silent `content-available` aps dictionary
 * plus the same content-free wake signal. No `alert`, so nothing is displayed by
 * the OS — the app composes the visible notification on-device.
 */
export interface ApnsPayload {
  aps: { 'content-available': 1 }
  txid: string
  event: NotificationEvent
  subscriptionId: string
}

/** Sends a silent APNS push. Transient failures throw; a dead token resolves. */
export type ApnsSender = (deviceToken: string, payload: ApnsPayload) => Promise<PushSendResult>
