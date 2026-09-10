import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupMemoryMongo, teardownMemoryMongo, clearCollections } from './test-support'
import { registerSubscription } from './subscriptions'
import { deriveWindow } from './derive'
import { matchBlock, type ParsedBlock } from './matcher'
import type { PushTarget, PushMessage } from '../push/types'
import WatchedAddress from '../db/models/WatchedAddress'
import NotificationSubscription from '../db/models/NotificationSubscription'

const XPUB =
  'ToEA6m5JcxaE72JyzLAvHoonWB3GgAxzt5jADQC9Pc43q4V3omj94DdKe98KkRgY2nqwbNHxWCceM3o62VhFVe7HCnAW7yBGEvfbfwrYsK3N7t7'
const GAP_LIMIT = 5

/** Address at a receive/change index for the fixed test xpub. */
function addr(chain: 0 | 1, index: number): string {
  return deriveWindow(XPUB, chain, index, 1, 'mainnet')[0].address
}

async function seedSubscription(
  events = ['incoming_pending', 'incoming_confirmed', 'outgoing_confirmed'],
): Promise<string> {
  const { subscriptionId } = await registerSubscription({
    xpub: XPUB,
    scriptType: 'p2pkh',
    gapLimit: GAP_LIMIT,
    network: 'mainnet',
    deviceToken: 'device-token-abc',
    platform: 'android',
    confirmations: 1,
    events: events as never,
  })
  return subscriptionId
}

/** Collect dispatcher calls. */
function recordingDispatcher() {
  const calls: Array<{ target: PushTarget; message: PushMessage }> = []
  return {
    calls,
    dispatch: async (target: PushTarget, message: PushMessage) => {
      calls.push({ target, message })
    },
  }
}

describe('matchBlock', () => {
  beforeAll(async () => {
    await setupMemoryMongo()
  }, 60000)
  afterAll(async () => {
    await teardownMemoryMongo()
  })
  beforeEach(async () => {
    await clearCollections()
  })

  it('dispatches incoming_pending for a first-seen output and advances the gap window', async () => {
    const subscriptionId = await seedSubscription()
    const recorder = recordingDispatcher()

    const block: ParsedBlock = {
      network: 'mainnet',
      depth: 0, // mempool / first-seen
      txs: [
        {
          txid: 'a'.repeat(64),
          outputAddresses: [addr(0, 3)],
          inputAddresses: [],
        },
      ],
    }
    await matchBlock(block, { dispatch: recorder.dispatch })

    expect(recorder.calls).toHaveLength(1)
    expect(recorder.calls[0].target.subscriptionId).toBe(subscriptionId)
    expect(recorder.calls[0].message).toEqual({ txid: 'a'.repeat(64), event: 'incoming_pending' })

    // Using receive index 3 extends the watched window to 3 + gapLimit.
    const sub = await NotificationSubscription.findOne({ subscriptionId })
    expect(sub?.derivedTo.receive).toBe(3 + GAP_LIMIT)
    const receiveRows = await WatchedAddress.find({ subscriptionId, chain: 0 })
    expect(receiveRows).toHaveLength(3 + GAP_LIMIT)
    // The new frontier index (3+gapLimit-1) is now watched.
    expect(await WatchedAddress.countDocuments({ subscriptionId, chain: 0, index: 3 + GAP_LIMIT - 1 })).toBe(1)
  })

  it('dispatches incoming_confirmed when a mined block reaches the confirmation depth', async () => {
    const subscriptionId = await seedSubscription()
    const recorder = recordingDispatcher()

    const block: ParsedBlock = {
      network: 'mainnet',
      depth: 1, // confirmations default is 1
      txs: [{ txid: 'b'.repeat(64), outputAddresses: [addr(0, 0)], inputAddresses: [] }],
    }
    await matchBlock(block, { dispatch: recorder.dispatch })

    expect(recorder.calls).toHaveLength(1)
    expect(recorder.calls[0].message).toEqual({ txid: 'b'.repeat(64), event: 'incoming_confirmed' })
    expect(recorder.calls[0].target.subscriptionId).toBe(subscriptionId)
  })

  it('dispatches outgoing_confirmed when a mined tx spends a watched output', async () => {
    await seedSubscription()
    const recorder = recordingDispatcher()

    const block: ParsedBlock = {
      network: 'mainnet',
      depth: 1,
      txs: [
        {
          txid: 'c'.repeat(64),
          outputAddresses: ['FUnrelatedAddressNotWatched1111111'],
          inputAddresses: [addr(0, 0)], // spending a previously watched output
        },
      ],
    }
    await matchBlock(block, { dispatch: recorder.dispatch })

    expect(recorder.calls).toHaveLength(1)
    expect(recorder.calls[0].message.event).toBe('outgoing_confirmed')
  })

  it('sends only one push when a tx pays two watched addresses of the same subscription', async () => {
    await seedSubscription()
    const recorder = recordingDispatcher()

    const block: ParsedBlock = {
      network: 'mainnet',
      depth: 0,
      txs: [
        {
          txid: 'd'.repeat(64),
          outputAddresses: [addr(0, 0), addr(0, 1)],
          inputAddresses: [],
        },
      ],
    }
    await matchBlock(block, { dispatch: recorder.dispatch })

    expect(recorder.calls).toHaveLength(1)
  })

  it('does not dispatch an event the subscription did not opt into', async () => {
    await seedSubscription(['incoming_pending', 'incoming_confirmed']) // no outgoing
    const recorder = recordingDispatcher()

    const block: ParsedBlock = {
      network: 'mainnet',
      depth: 1,
      txs: [{ txid: 'e'.repeat(64), outputAddresses: [], inputAddresses: [addr(0, 0)] }],
    }
    await matchBlock(block, { dispatch: recorder.dispatch })

    expect(recorder.calls).toHaveLength(0)
  })

  it('does not dispatch for a block with no watched addresses', async () => {
    await seedSubscription()
    const recorder = recordingDispatcher()

    const block: ParsedBlock = {
      network: 'mainnet',
      depth: 1,
      txs: [{ txid: 'f'.repeat(64), outputAddresses: ['FSomeoneElse'], inputAddresses: [] }],
    }
    await matchBlock(block, { dispatch: recorder.dispatch })

    expect(recorder.calls).toHaveLength(0)
  })

  it('does not match a subscription on a different network', async () => {
    await seedSubscription() // mainnet
    const recorder = recordingDispatcher()

    const block: ParsedBlock = {
      network: 'testnet',
      depth: 0,
      txs: [{ txid: '0'.repeat(64), outputAddresses: [addr(0, 0)], inputAddresses: [] }],
    }
    await matchBlock(block, { dispatch: recorder.dispatch })

    expect(recorder.calls).toHaveLength(0)
  })
})
