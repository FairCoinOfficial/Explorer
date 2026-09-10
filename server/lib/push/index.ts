// Push dispatch: turn a matched (target, message) into one silent provider push.
//
// The dispatcher owns the payload contract — the ONLY thing that transits
// FCM/APNS is `{ txid, event, subscriptionId }` (FCM data message / APNS
// content-available background push). It never sends an amount, address,
// balance, or user identity; the visible notification is composed on-device.
//
// The concrete FCM/APNS senders are injected (built from env in server startup,
// mocked in tests), so this module has no network/credential dependency and is a
// pure, inert no-op when no sender is configured.

import { logger } from '../logger'
import type {
  ApnsSender,
  FcmSender,
  PushData,
  PushDispatcher,
  PushSendResult,
} from './types'

export type { PushDispatcher } from './types'

export interface DispatcherConfig {
  /** Android transport. Absent → android pushes are a no-op. */
  fcm?: FcmSender
  /** iOS transport. Absent → ios pushes are a no-op. */
  apns?: ApnsSender
  /** Invoked with the subscriptionId when a provider reports a permanently dead token. */
  onDeadToken?: (subscriptionId: string) => Promise<void>
}

/**
 * Build a {@link PushDispatcher} from the configured senders. The returned
 * function never throws: transient provider errors are logged (pushes are
 * best-effort — the wallet reconciles true state on next open), and a dead-token
 * result triggers `onDeadToken` so the stale subscription is pruned.
 */
export function createDispatcher(config: DispatcherConfig): PushDispatcher {
  return async (target, message) => {
    // The complete, content-free application payload.
    const data: PushData = {
      txid: message.txid,
      event: message.event,
      subscriptionId: target.subscriptionId,
    }

    let result: PushSendResult
    try {
      if (target.platform === 'android') {
        if (!config.fcm) {
          logger.debug('[push] no FCM sender configured; skipping android push')
          return
        }
        result = await config.fcm(target.deviceToken, data)
      } else {
        if (!config.apns) {
          logger.debug('[push] no APNS sender configured; skipping ios push')
          return
        }
        result = await config.apns(target.deviceToken, {
          aps: { 'content-available': 1 },
          txid: data.txid,
          event: data.event,
          subscriptionId: data.subscriptionId,
        })
      }
    } catch (error) {
      logger.error(`[push] ${target.platform} send failed for ${target.subscriptionId}`, error)
      return
    }

    if (result.deadToken && config.onDeadToken) {
      await config.onDeadToken(target.subscriptionId)
    }
  }
}
