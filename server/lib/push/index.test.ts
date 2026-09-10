import { describe, it, expect, vi } from 'vitest'
import { createDispatcher } from './index'
import type { ApnsSender, FcmSender, PushSendResult } from './types'

const androidTarget = { subscriptionId: 'sub-1', deviceToken: 'fcm-token', platform: 'android' as const }
const iosTarget = { subscriptionId: 'sub-2', deviceToken: 'apns-token', platform: 'ios' as const }
const message = { txid: 'e'.repeat(64), event: 'incoming_pending' as const }

const delivered: PushSendResult = { deadToken: false }
const dead: PushSendResult = { deadToken: true }

describe('createDispatcher', () => {
  it('sends android pushes via FCM with a content-free data payload', async () => {
    const fcm = vi.fn<FcmSender>(async () => delivered)
    const apns = vi.fn<ApnsSender>(async () => delivered)
    const dispatch = createDispatcher({ fcm, apns })

    await dispatch(androidTarget, message)

    expect(fcm).toHaveBeenCalledTimes(1)
    expect(apns).not.toHaveBeenCalled()
    const [token, data] = fcm.mock.calls[0]
    expect(token).toBe('fcm-token')
    // The payload keys are EXACTLY the content-free wake signal — nothing else.
    expect(Object.keys(data).sort()).toEqual(['event', 'subscriptionId', 'txid'])
    expect(data).toEqual({ txid: 'e'.repeat(64), event: 'incoming_pending', subscriptionId: 'sub-1' })
    // Defense-in-depth: no amount/address/balance leaked into the payload.
    const serialized = JSON.stringify(data).toLowerCase()
    expect(serialized).not.toMatch(/amount|address|balance|value|fair/)
  })

  it('sends ios pushes via APNS as a silent content-available push with no alert', async () => {
    const fcm = vi.fn<FcmSender>(async () => delivered)
    const apns = vi.fn<ApnsSender>(async () => delivered)
    const dispatch = createDispatcher({ fcm, apns })

    await dispatch(iosTarget, message)

    expect(apns).toHaveBeenCalledTimes(1)
    expect(fcm).not.toHaveBeenCalled()
    const [token, payload] = apns.mock.calls[0]
    expect(token).toBe('apns-token')
    expect(payload.aps['content-available']).toBe(1)
    // Silent push: no alert dictionary, so the OS shows nothing on its own.
    expect('alert' in payload.aps).toBe(false)
    expect(payload).toMatchObject({ txid: 'e'.repeat(64), event: 'incoming_pending', subscriptionId: 'sub-2' })
    const serialized = JSON.stringify(payload).toLowerCase()
    expect(serialized).not.toMatch(/amount|address|balance|"value"|fair/)
  })

  it('prunes the subscription when FCM reports a dead token', async () => {
    const fcm = vi.fn(async (): Promise<PushSendResult> => dead)
    const onDeadToken = vi.fn(async () => {})
    const dispatch = createDispatcher({ fcm, onDeadToken })

    await dispatch(androidTarget, message)

    expect(onDeadToken).toHaveBeenCalledWith('sub-1')
  })

  it('prunes the subscription when APNS reports a dead token', async () => {
    const apns = vi.fn(async (): Promise<PushSendResult> => dead)
    const onDeadToken = vi.fn(async () => {})
    const dispatch = createDispatcher({ apns, onDeadToken })

    await dispatch(iosTarget, message)

    expect(onDeadToken).toHaveBeenCalledWith('sub-2')
  })

  it('swallows a transient send error and does not prune the token', async () => {
    const fcm = vi.fn(async (): Promise<PushSendResult> => {
      throw new Error('503 upstream')
    })
    const onDeadToken = vi.fn(async () => {})
    const dispatch = createDispatcher({ fcm, onDeadToken })

    await expect(dispatch(androidTarget, message)).resolves.toBeUndefined()
    expect(onDeadToken).not.toHaveBeenCalled()
  })

  it('is a no-op when no sender is configured for the platform', async () => {
    const apns = vi.fn(async (): Promise<PushSendResult> => delivered)
    const dispatch = createDispatcher({ apns }) // android target, no fcm sender

    await expect(dispatch(androidTarget, message)).resolves.toBeUndefined()
    expect(apns).not.toHaveBeenCalled()
  })
})
