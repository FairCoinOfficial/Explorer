import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import express from 'express'
import type { Server } from 'node:http'
import { AddressInfo } from 'node:net'
import notificationsRouter from './notifications'
import {
  setupMemoryMongo,
  teardownMemoryMongo,
  clearCollections,
} from '../lib/notifications/test-support'
import WatchedAddress from '../lib/db/models/WatchedAddress'
import NotificationSubscription from '../lib/db/models/NotificationSubscription'

// The wallet's account xpub (m/44'/119'/0') for the fixed test mnemonic, and the
// first receive address it derives — the route MUST watch this exact address.
const MAINNET_XPUB =
  'ToEA6m5JcxaE72JyzLAvHoonWB3GgAxzt5jADQC9Pc43q4V3omj94DdKe98KkRgY2nqwbNHxWCceM3o62VhFVe7HCnAW7yBGEvfbfwrYsK3N7t7'
const MAINNET_RECEIVE_0 = 'FQVANvQqVsLwkwBnAJ5oPDYrqcfXLak7Bf'

let server: Server
let baseUrl: string

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    xpub: MAINNET_XPUB,
    scriptType: 'p2pkh',
    gapLimit: 5,
    network: 'mainnet',
    deviceToken: 'device-token-abc',
    platform: 'android',
    confirmations: 1,
    events: ['incoming_pending', 'incoming_confirmed', 'outgoing_confirmed'],
    ...overrides,
  }
}

async function postRegister(body: unknown): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await fetch(`${baseUrl}/api/notifications/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: res.status, json: (await res.json()) as Record<string, unknown> }
}

async function deleteRegister(body: unknown): Promise<number> {
  const res = await fetch(`${baseUrl}/api/notifications/register`, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.status
}

describe('notifications register route', () => {
  beforeAll(async () => {
    await setupMemoryMongo()
    const app = express()
    app.use(express.json())
    app.use('/api/notifications', notificationsRouter)
    server = app.listen(0)
    const address = server.address() as AddressInfo
    baseUrl = `http://127.0.0.1:${address.port}`
  }, 60000)

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await teardownMemoryMongo()
  })

  beforeEach(async () => {
    await clearCollections()
  })

  it('registers a subscription and derives gapLimit receive + change addresses', async () => {
    const { status, json } = await postRegister(validBody())
    expect(status).toBe(200)
    expect(typeof json.subscriptionId).toBe('string')
    expect(json.watchedTo).toEqual({ receive: 5, change: 5 })

    const subscriptionId = json.subscriptionId as string
    const receive = await WatchedAddress.find({ subscriptionId, chain: 0 }).sort({ index: 1 })
    const change = await WatchedAddress.find({ subscriptionId, chain: 1 }).sort({ index: 1 })
    expect(receive).toHaveLength(5)
    expect(change).toHaveLength(5)
    expect(receive.map((r) => r.index)).toEqual([0, 1, 2, 3, 4])
    // The derived receive address must equal the wallet's own address 0.
    expect(receive[0].address).toBe(MAINNET_RECEIVE_0)

    const sub = await NotificationSubscription.findOne({ subscriptionId })
    expect(sub?.derivedTo).toMatchObject({ receive: 5, change: 5 })
  })

  it('rejects a malformed xpub with 400', async () => {
    const { status } = await postRegister(validBody({ xpub: 'not-a-real-xpub' }))
    expect(status).toBe(400)
  })

  it('rejects an xpub for the wrong network with 400', async () => {
    const testnetXpub =
      'DRKVrRqVwgE2Eir1qeGNgWGuFi7adRMfXEEpevPzSWLd2qvr415hDdAyYXWk3xoEoT5Dg88jjaSeorgG7YTYFoLBioNu9zf7fu6URcdZYhxM3Buu'
    const { status } = await postRegister(validBody({ xpub: testnetXpub, network: 'mainnet' }))
    expect(status).toBe(400)
  })

  it('rejects an out-of-range gapLimit with 400', async () => {
    const { status } = await postRegister(validBody({ gapLimit: 1000 }))
    expect(status).toBe(400)
  })

  it('rejects an unknown network with 400', async () => {
    const { status } = await postRegister(validBody({ network: 'regtest' }))
    expect(status).toBe(400)
  })

  it('rejects an unknown platform with 400', async () => {
    const { status } = await postRegister(validBody({ platform: 'blackberry' }))
    expect(status).toBe(400)
  })

  it('rejects an unknown event with 400', async () => {
    const { status } = await postRegister(validBody({ events: ['incoming_pending', 'moon_phase'] }))
    expect(status).toBe(400)
  })

  it('replaces the prior subscription when the same device re-registers', async () => {
    const first = await postRegister(validBody())
    const firstId = first.json.subscriptionId as string

    const second = await postRegister(validBody({ gapLimit: 3 }))
    const secondId = second.json.subscriptionId as string

    // The old subscription and its watched addresses are gone; only the new one remains.
    expect(await NotificationSubscription.countDocuments({})).toBe(1)
    expect(await WatchedAddress.countDocuments({ subscriptionId: firstId })).toBe(0)
    expect(await WatchedAddress.countDocuments({ subscriptionId: secondId })).toBe(6)
  })

  it('unregisters a subscription and removes its watched addresses', async () => {
    const { json } = await postRegister(validBody())
    const subscriptionId = json.subscriptionId as string

    const status = await deleteRegister({ subscriptionId })
    expect(status).toBe(200)
    expect(await NotificationSubscription.countDocuments({ subscriptionId })).toBe(0)
    expect(await WatchedAddress.countDocuments({ subscriptionId })).toBe(0)
  })
})
