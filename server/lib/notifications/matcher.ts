// Block matcher: the heart of the notification service.
//
// Given a parsed block (or mempool batch), it matches each transaction's output
// addresses (incoming) and spent-input addresses (outgoing) against the
// WatchedAddress index, advances the BIP44 gap-limit window when a watched
// address is used, and enqueues one silent push per (subscription, tx, event).
// It never blocks the caller's main loop for long: matching is index-backed and
// dispatch failures are isolated per push.

import type { NetworkType } from '@fairco.in/core'
import connectToDatabase from '../db/connect'
import { logger } from '../logger'
import NotificationSubscription, {
  type INotificationSubscription,
  type NotificationEvent,
} from '../db/models/NotificationSubscription'
import WatchedAddress from '../db/models/WatchedAddress'
import { insertWatchedWindow } from './subscriptions'
import type { Chain } from './derive'
import type { PushDispatcher } from '../push/types'

/**
 * Upper bound on pushes emitted per block, mirroring the monitor's
 * TRANSACTION_CONFIRMED_CAP: one pathological block can never fan out into an
 * unbounded dispatch storm.
 */
const MAX_NOTIFICATIONS_PER_BLOCK = 50

/** One transaction reduced to just the addresses the matcher needs. */
export interface ParsedBlockTx {
  txid: string
  /** Addresses paid by this tx's outputs (flattened across all vouts). */
  outputAddresses: string[]
  /** Resolved prevout addresses of this tx's inputs, where known (spends). */
  inputAddresses: string[]
}

/** A block (or mempool batch) reduced to what the matcher consumes. */
export interface ParsedBlock {
  network: NetworkType
  /** Confirmation depth of these txs: 0 = mempool/first-seen, >=1 = mined. */
  depth: number
  txs: ParsedBlockTx[]
}

interface MatchDeps {
  dispatch: PushDispatcher
}

/**
 * Extend a subscription's watched window for one chain so that at least
 * `gapLimit` unused addresses exist beyond a just-used index — the BIP44
 * gap-limit walk, server-side. Using index `i` derives+watches up to
 * `i + gapLimit` (exclusive). Monotonic and idempotent: never shrinks the
 * frontier, and re-deriving existing slots is a no-op.
 */
export async function advanceWindow(
  subscriptionId: string,
  chain: Chain,
  usedIndex: number,
  gapLimit: number,
  xpub: string,
  network: NetworkType,
): Promise<void> {
  const chainKey = chain === 0 ? 'receive' : 'change'
  const sub = await NotificationSubscription.findOne({ subscriptionId })
  if (!sub) {
    return
  }
  const current = sub.derivedTo[chainKey]
  const target = usedIndex + gapLimit
  if (target <= current) {
    return
  }
  await insertWatchedWindow(subscriptionId, xpub, network, chain, current, target - current)
  await NotificationSubscription.updateOne(
    { subscriptionId },
    { $max: { [`derivedTo.${chainKey}`]: target } },
  )
}

/**
 * Match every transaction in a block against watched addresses and dispatch the
 * resulting silent pushes.
 *
 * - An output paying a watched address → `incoming_confirmed` when the block is
 *   at/above the subscription's confirmation depth, else `incoming_pending`;
 *   also advances that chain's gap-limit window.
 * - An input spending a watched output (mined block only) → `outgoing_confirmed`.
 *
 * Deduped to one push per (subscription, txid, event); only events the
 * subscription opted into are delivered; dispatch failures are logged, never
 * thrown, so the caller's poll loop is never disrupted.
 */
export async function matchBlock(block: ParsedBlock, deps: MatchDeps): Promise<void> {
  await connectToDatabase()

  const subCache = new Map<string, INotificationSubscription | null>()
  const dispatched = new Set<string>()
  const matchedSubIds = new Set<string>()
  const jobs: Array<{ target: { subscriptionId: string; deviceToken: string; platform: INotificationSubscription['platform'] }; message: { txid: string; event: NotificationEvent } }> = []

  async function loadSub(subscriptionId: string): Promise<INotificationSubscription | null> {
    const cached = subCache.get(subscriptionId)
    if (cached !== undefined) {
      return cached
    }
    const sub = await NotificationSubscription.findOne({ subscriptionId })
    subCache.set(subscriptionId, sub)
    return sub
  }

  function enqueue(sub: INotificationSubscription, txid: string, event: NotificationEvent): void {
    if (!sub.events.includes(event)) {
      return
    }
    const key = `${sub.subscriptionId}|${txid}|${event}`
    if (dispatched.has(key) || jobs.length >= MAX_NOTIFICATIONS_PER_BLOCK) {
      return
    }
    dispatched.add(key)
    matchedSubIds.add(sub.subscriptionId)
    jobs.push({
      target: {
        subscriptionId: sub.subscriptionId,
        deviceToken: sub.deviceToken,
        platform: sub.platform,
      },
      message: { txid, event },
    })
  }

  for (const tx of block.txs) {
    const outputAddresses = new Set(tx.outputAddresses)
    const inputAddresses = new Set(tx.inputAddresses)
    const candidates = [...outputAddresses, ...inputAddresses]
    if (candidates.length === 0) {
      continue
    }

    const rows = await WatchedAddress.find({ address: { $in: candidates } })
    for (const row of rows) {
      const sub = await loadSub(row.subscriptionId)
      // Ignore a (cosmically unlikely) cross-network address collision.
      if (!sub || sub.network !== block.network) {
        continue
      }

      if (outputAddresses.has(row.address)) {
        // A used receive/change address advances the gap-limit window regardless
        // of which events the user subscribed to (keeps future receives watched).
        await advanceWindow(sub.subscriptionId, row.chain, row.index, sub.gapLimit, sub.xpub, sub.network)
        const event: NotificationEvent =
          block.depth >= sub.confirmations ? 'incoming_confirmed' : 'incoming_pending'
        enqueue(sub, tx.txid, event)
      }

      if (inputAddresses.has(row.address) && block.depth >= 1) {
        enqueue(sub, tx.txid, 'outgoing_confirmed')
      }
    }
  }

  for (const job of jobs) {
    try {
      await deps.dispatch(job.target, job.message)
    } catch (error) {
      logger.error(
        `[notifications] dispatch failed for ${job.target.subscriptionId} (${job.message.event})`,
        error,
      )
    }
  }

  if (matchedSubIds.size > 0) {
    await NotificationSubscription.updateMany(
      { subscriptionId: { $in: [...matchedSubIds] } },
      { $set: { lastSeenAt: new Date() } },
    )
  }
}
