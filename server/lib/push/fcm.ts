// FCM HTTP v1 sender. Builds a data-only message and authenticates with an OAuth
// access token minted from the Firebase service account (google-auth-library
// caches/refreshes the token). Only wire this when FCM_SERVICE_ACCOUNT_JSON is
// configured — see the notifications config.

import { JWT } from 'google-auth-library'
import { logger } from '../logger'
import type { FcmSender } from './types'

/** OAuth scope required to send FCM messages via HTTP v1. */
const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging'

/** The service-account fields we read (the JSON has many more). */
interface FcmServiceAccount {
  client_email: string
  private_key: string
  project_id: string
}

function parseServiceAccount(json: string): FcmServiceAccount {
  const parsed: unknown = JSON.parse(json)
  if (parsed === null || typeof parsed !== 'object') {
    throw new Error('FCM_SERVICE_ACCOUNT_JSON is not a JSON object')
  }
  const record = parsed as Record<string, unknown>
  const clientEmail = record.client_email
  const privateKey = record.private_key
  const projectId = record.project_id
  if (typeof clientEmail !== 'string' || typeof privateKey !== 'string' || typeof projectId !== 'string') {
    throw new Error('FCM_SERVICE_ACCOUNT_JSON missing client_email/private_key/project_id')
  }
  return { client_email: clientEmail, private_key: privateKey, project_id: projectId }
}

/**
 * Build an {@link FcmSender} from a Firebase service-account JSON string. The
 * sender posts a data-only, high-priority message; a permanently invalid token
 * resolves as `{ deadToken: true }` and any other non-2xx throws (transient).
 */
export function createFcmSender(serviceAccountJson: string): FcmSender {
  const account = parseServiceAccount(serviceAccountJson)
  const jwtClient = new JWT({
    email: account.client_email,
    key: account.private_key,
    scopes: [FCM_SCOPE],
  })
  const endpoint = `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`

  return async (deviceToken, data) => {
    const { token } = await jwtClient.getAccessToken()
    if (!token) {
      throw new Error('FCM: failed to obtain an access token')
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token: deviceToken,
          data,
          android: { priority: 'high' },
        },
      }),
    })

    if (response.ok) {
      return { deadToken: false }
    }

    const body = await response.text()
    // A token FCM no longer recognizes (uninstalled app / rotated token): prune.
    if (
      response.status === 404 ||
      body.includes('UNREGISTERED') ||
      (response.status === 400 && body.includes('INVALID_ARGUMENT'))
    ) {
      logger.debug(`[push] FCM reports dead token (${response.status})`)
      return { deadToken: true }
    }

    throw new Error(`FCM send failed: ${response.status} ${body}`)
  }
}
