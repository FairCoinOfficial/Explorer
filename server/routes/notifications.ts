import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import connectToDatabase from '../lib/db/connect'
import { handleRouteError } from '../lib/http'
import { deriveWindow } from '../lib/notifications/derive'
import { registerSubscription, deleteSubscription } from '../lib/notifications/subscriptions'
import {
  NOTIFICATION_EVENTS,
  PLATFORMS,
  SCRIPT_TYPES,
} from '../lib/db/models/NotificationSubscription'

const router = Router()

/** Upper bound on the gap-limit window a client may request (DoS guard). */
const MAX_GAP_LIMIT = 100
/** Upper bound on the confirmation depth a client may request. */
const MAX_CONFIRMATIONS = 100

// Descriptor-equivalent registration payload (spec §4.1). Unknown keys are
// stripped; every field is whitelisted so nothing from the body reaches the DB
// unvalidated.
const registerSchema = z
  .object({
    xpub: z.string().min(1).max(200),
    scriptType: z.enum(SCRIPT_TYPES).default('p2pkh'),
    gapLimit: z.number().int().min(1).max(MAX_GAP_LIMIT).default(20),
    network: z.enum(['mainnet', 'testnet']),
    deviceToken: z.string().min(1).max(4096),
    platform: z.enum(PLATFORMS),
    confirmations: z.number().int().min(1).max(MAX_CONFIRMATIONS).default(1),
    events: z.array(z.enum(NOTIFICATION_EVENTS)).min(1).default(() => [...NOTIFICATION_EVENTS]),
  })
  .strict()

const unregisterSchema = z.object({ subscriptionId: z.string().min(1).max(200) }).strict()

/**
 * POST /register — register a watch-only account xpub for background payment
 * notifications. Validates the payload, derives the gap-limit receive/change
 * window, and upserts the subscription. Watch-only: the xpub can never sign.
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid registration payload' })
      return
    }

    // Reject a malformed or wrong-network xpub before any DB write (deriveWindow
    // parses it under the network's BIP32 version bytes).
    try {
      deriveWindow(parsed.data.xpub, 0, 0, 1, parsed.data.network)
    } catch {
      res.status(400).json({ error: 'Invalid xpub for the specified network' })
      return
    }

    await connectToDatabase()
    const result = await registerSubscription(parsed.data)
    res.json(result)
  } catch (error) {
    handleRouteError(res, 'Error registering notification subscription', error)
  }
})

/**
 * DELETE /register — unregister a subscription (logout, notifications off, or
 * token rotation). Removes the subscription and every address it watches.
 */
router.delete('/register', async (req: Request, res: Response) => {
  try {
    const parsed = unregisterSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'subscriptionId is required' })
      return
    }
    await connectToDatabase()
    await deleteSubscription(parsed.data.subscriptionId)
    res.json({ ok: true })
  } catch (error) {
    handleRouteError(res, 'Error unregistering notification subscription', error)
  }
})

export default router
