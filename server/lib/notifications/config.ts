// Notification feature configuration — the single gate that makes the whole
// feature Phase-1-safe. With no FCM/APNS credentials in the environment,
// `isNotificationsEnabled` is false and `buildDispatcher` returns null, so the
// monitor is never given a dispatcher and the entire notification path is an
// inert no-op. Nothing here throws on missing/bad creds: a misconfigured
// provider is logged and simply left disabled.

import { logger } from '../logger'
import { createDispatcher, type PushDispatcher } from '../push'
import { createFcmSender } from '../push/fcm'
import { createApnsSender } from '../push/apns'
import type { ApnsSender, FcmSender } from '../push/types'
import { deleteSubscription } from './subscriptions'

type Env = Record<string, string | undefined>

/**
 * Whether background notifications are configured. True as soon as EITHER
 * transport's credentials are present; each transport is wired independently.
 */
export function isNotificationsEnabled(env: Env = process.env): boolean {
  return Boolean(env.FCM_SERVICE_ACCOUNT_JSON || isApnsConfigured(env))
}

function isApnsConfigured(env: Env): boolean {
  return Boolean(env.APNS_KEY_P8 && env.APNS_KEY_ID && env.APNS_TEAM_ID && env.APNS_BUNDLE_ID)
}

function buildFcmSender(env: Env): FcmSender | undefined {
  if (!env.FCM_SERVICE_ACCOUNT_JSON) {
    return undefined
  }
  try {
    return createFcmSender(env.FCM_SERVICE_ACCOUNT_JSON)
  } catch (error) {
    logger.error('[notifications] FCM disabled: invalid FCM_SERVICE_ACCOUNT_JSON', error)
    return undefined
  }
}

function buildApnsSender(env: Env): ApnsSender | undefined {
  if (!isApnsConfigured(env) || !env.APNS_KEY_P8 || !env.APNS_KEY_ID || !env.APNS_TEAM_ID || !env.APNS_BUNDLE_ID) {
    return undefined
  }
  try {
    return createApnsSender({
      // Env-stored PEMs commonly carry escaped newlines; restore them.
      p8: env.APNS_KEY_P8.replace(/\\n/g, '\n'),
      keyId: env.APNS_KEY_ID,
      teamId: env.APNS_TEAM_ID,
      bundleId: env.APNS_BUNDLE_ID,
      production: env.APNS_ENV !== 'sandbox',
    })
  } catch (error) {
    logger.error('[notifications] APNS disabled: invalid APNS_* configuration', error)
    return undefined
  }
}

/**
 * Build the push dispatcher from the environment, or null when neither transport
 * is configured. Dead tokens prune the subscription (and its watched addresses).
 */
export function buildDispatcher(env: Env = process.env): PushDispatcher | null {
  const fcm = buildFcmSender(env)
  const apns = buildApnsSender(env)
  if (!fcm && !apns) {
    return null
  }
  return createDispatcher({
    fcm,
    apns,
    onDeadToken: (subscriptionId) => deleteSubscription(subscriptionId),
  })
}
