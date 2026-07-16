import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import express from 'express'
import type { Server } from 'node:http'
import { AddressInfo } from 'node:net'
import notificationsRouter from '../../routes/notifications'
import { setupMemoryMongo, teardownMemoryMongo, clearCollections } from './test-support'
import { createDispatcher } from '../push'
import { matchBlock, type ParsedBlock } from './matcher'
import { isNotificationsEnabled, buildDispatcher } from './config'
import type { PushData, PushSendResult } from '../push/types'

const XPUB =
  'ToEA6m5JcxaE72JyzLAvHoonWB3GgAxzt5jADQC9Pc43q4V3omj94DdKe98KkRgY2nqwbNHxWCceM3o62VhFVe7HCnAW7yBGEvfbfwrYsK3N7t7'
const RECEIVE_0 = 'FQVANvQqVsLwkwBnAJ5oPDYrqcfXLak7Bf'
const DEVICE_TOKEN = 'device-token-abc'
const TXID = 'a'.repeat(64)

let server: Server
let baseUrl: string

describe('notifications end-to-end', () => {
  beforeAll(async () => {
    await setupMemoryMongo()
    const app = express()
    app.use(express.json())
    app.use('/api/notifications', notificationsRouter)
    server = app.listen(0)
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  }, 60000)

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await teardownMemoryMongo()
  })

  beforeEach(async () => {
    await clearCollections()
  })

  it('registers via the route, matches a block, and dispatches exactly one content-free push', async () => {
    // 1. Register the wallet's watch-only xpub through the real route.
    const res = await fetch(`${baseUrl}/api/notifications/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        xpub: XPUB,
        scriptType: 'p2pkh',
        gapLimit: 5,
        network: 'mainnet',
        deviceToken: DEVICE_TOKEN,
        platform: 'android',
        confirmations: 1,
        events: ['incoming_pending', 'incoming_confirmed', 'outgoing_confirmed'],
      }),
    })
    expect(res.status).toBe(200)
    const { subscriptionId } = (await res.json()) as { subscriptionId: string }

    // 2. A real dispatcher over a mock FCM sender that captures what is sent.
    const sent: Array<{ token: string; data: PushData }> = []
    const dispatch = createDispatcher({
      fcm: async (token, data): Promise<PushSendResult> => {
        sent.push({ token, data })
        return { deadToken: false }
      },
    })

    // 3. Feed a synthetic block paying the registered index-0 receive address.
    const block: ParsedBlock = {
      network: 'mainnet',
      depth: 0,
      txs: [{ txid: TXID, outputAddresses: [RECEIVE_0], inputAddresses: [] }],
    }
    await matchBlock(block, { dispatch })

    // 4. Exactly one push, to the registered device, carrying ONLY the wake signal.
    expect(sent).toHaveLength(1)
    expect(sent[0].token).toBe(DEVICE_TOKEN)
    expect(Object.keys(sent[0].data).sort()).toEqual(['event', 'subscriptionId', 'txid'])
    expect(sent[0].data).toEqual({ txid: TXID, event: 'incoming_pending', subscriptionId })
    // No amount/address/balance ever transits the provider.
    expect(JSON.stringify(sent[0].data).toLowerCase()).not.toMatch(/amount|address|balance|value|fair/)
  })

  it('is disabled and dispatcher-less when no provider credentials are present', () => {
    expect(isNotificationsEnabled({})).toBe(false)
    expect(buildDispatcher({})).toBeNull()
  })

  it('enables and builds a dispatcher from a structurally valid FCM service account', () => {
    const serviceAccount = JSON.stringify({
      client_email: 'notifier@example.iam.gserviceaccount.com',
      private_key: 'unused-at-construction',
      project_id: 'fair-explorer',
    })
    expect(isNotificationsEnabled({ FCM_SERVICE_ACCOUNT_JSON: serviceAccount })).toBe(true)
    expect(typeof buildDispatcher({ FCM_SERVICE_ACCOUNT_JSON: serviceAccount })).toBe('function')
  })
})
