// Subscription persistence for the notification service.
//
// The single place that mutates NotificationSubscription / WatchedAddress rows:
// registration derives and stores the gap-limit window, the block matcher
// extends it, and unregister (logout / dead token) removes it. Keeping every
// write here means one consistent, whitelisted mutation path — routes validate,
// this module persists.

import { randomUUID } from 'node:crypto'
import type { NetworkType } from '@fairco.in/core'
import NotificationSubscription, {
  type NotificationEvent,
  type Platform,
  type ScriptType,
} from '../db/models/NotificationSubscription'
import WatchedAddress from '../db/models/WatchedAddress'
import { deriveWindow, type Chain } from './derive'

/** A validated registration request (edge-validated by the route). */
export interface RegisterInput {
  xpub: string
  scriptType: ScriptType
  gapLimit: number
  network: NetworkType
  deviceToken: string
  platform: Platform
  confirmations: number
  events: NotificationEvent[]
}

export interface RegisterResult {
  subscriptionId: string
  watchedTo: {
    receive: number
    change: number
  }
}

/**
 * Derive `count` addresses for one chain starting at `from` and upsert them as
 * WatchedAddress rows. Idempotent: re-deriving an existing (subscription, chain,
 * index) slot is a no-op, never a duplicate.
 */
export async function insertWatchedWindow(
  subscriptionId: string,
  xpub: string,
  network: NetworkType,
  chain: Chain,
  from: number,
  count: number,
): Promise<void> {
  const entries = deriveWindow(xpub, chain, from, count, network)
  if (entries.length === 0) {
    return
  }
  await WatchedAddress.bulkWrite(
    entries.map((entry) => ({
      updateOne: {
        filter: { subscriptionId, chain, index: entry.index },
        update: { $set: { address: entry.address } },
        upsert: true,
      },
    })),
  )
}

/**
 * Register (or re-register) a device's watch-only subscription. A device is
 * identified by its (deviceToken, network); re-registering — token rotation,
 * wallet switch, confirmation-depth change — replaces the prior subscription and
 * its watched addresses so a stale xpub is never left watched.
 *
 * Derives exactly `gapLimit` receive (chain 0) and `gapLimit` change (chain 1)
 * addresses. The caller must have already validated the xpub (see the route).
 */
export async function registerSubscription(input: RegisterInput): Promise<RegisterResult> {
  // Replace any existing subscription for this device+network.
  const existing = await NotificationSubscription.find({
    deviceToken: input.deviceToken,
    network: input.network,
  })
  for (const doc of existing) {
    await deleteSubscription(doc.subscriptionId)
  }

  const subscriptionId = randomUUID()
  await NotificationSubscription.create({
    subscriptionId,
    xpub: input.xpub,
    scriptType: input.scriptType,
    gapLimit: input.gapLimit,
    network: input.network,
    deviceToken: input.deviceToken,
    platform: input.platform,
    confirmations: input.confirmations,
    events: input.events,
    derivedTo: { receive: input.gapLimit, change: input.gapLimit },
  })

  try {
    await insertWatchedWindow(subscriptionId, input.xpub, input.network, 0, 0, input.gapLimit)
    await insertWatchedWindow(subscriptionId, input.xpub, input.network, 1, 0, input.gapLimit)
  } catch (error) {
    // Never leave a subscription without its watched addresses.
    await deleteSubscription(subscriptionId)
    throw error
  }

  return {
    subscriptionId,
    watchedTo: { receive: input.gapLimit, change: input.gapLimit },
  }
}

/** Remove a subscription and every address it watches. */
export async function deleteSubscription(subscriptionId: string): Promise<void> {
  await NotificationSubscription.deleteOne({ subscriptionId })
  await WatchedAddress.deleteMany({ subscriptionId })
}
