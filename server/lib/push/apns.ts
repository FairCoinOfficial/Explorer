// APNS token-based sender over HTTP/2. Signs a provider-authentication JWT
// (ES256, from the `.p8` key) with Node's built-in crypto — no third-party JWT
// dependency — and sends a silent `content-available` background push. Only wire
// this when the APNS_* env is configured — see the notifications config.

import http2 from 'node:http2'
import { createPrivateKey, sign as cryptoSign, type KeyObject } from 'node:crypto'
import { logger } from '../logger'
import type { ApnsSender } from './types'

/**
 * How long a provider JWT is reused before re-signing. Apple requires refreshing
 * no more than once every 20 min and at least once every 60 min; 30 min sits
 * safely inside that window.
 */
const APNS_JWT_TTL_SECONDS = 30 * 60

const HOST_PRODUCTION = 'https://api.push.apple.com'
const HOST_SANDBOX = 'https://api.sandbox.push.apple.com'

export interface ApnsConfig {
  /** Contents of the AuthKey `.p8` (PKCS#8 PEM). */
  p8: string
  /** The key's 10-character Key ID. */
  keyId: string
  /** The Apple Developer Team ID. */
  teamId: string
  /** App bundle id, sent as `apns-topic`. */
  bundleId: string
  /** true → api.push.apple.com; false → the sandbox host. */
  production: boolean
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url')
}

/** Sign the APNS provider-authentication JWT (ES256) for the given issue time. */
function signProviderJwt(privateKey: KeyObject, keyId: string, teamId: string, iat: number): string {
  const header = base64url(JSON.stringify({ alg: 'ES256', kid: keyId }))
  const claims = base64url(JSON.stringify({ iss: teamId, iat }))
  const signingInput = `${header}.${claims}`
  // ieee-p1363 yields the raw R||S signature JWS ES256 requires (not DER).
  const signature = cryptoSign('sha256', Buffer.from(signingInput), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  })
  return `${signingInput}.${base64url(signature)}`
}

/**
 * Build an {@link ApnsSender}. Maintains one persistent HTTP/2 session (lazily
 * reconnected) and a cached provider JWT. A push resolves `{ deadToken: true }`
 * on 410 Unregistered / 400 BadDeviceToken; any other non-200 throws (transient).
 */
export function createApnsSender(config: ApnsConfig): ApnsSender {
  const host = config.production ? HOST_PRODUCTION : HOST_SANDBOX
  const privateKey = createPrivateKey(config.p8)

  let session: http2.ClientHttp2Session | null = null
  let cachedJwt: { token: string; issuedAt: number } | null = null

  function getSession(): http2.ClientHttp2Session {
    if (session && !session.closed && !session.destroyed) {
      return session
    }
    const next = http2.connect(host)
    next.on('error', (error) => {
      logger.error('[push] APNS HTTP/2 session error', error)
      if (session === next) {
        session = null
      }
    })
    session = next
    return next
  }

  function getJwt(): string {
    const now = Math.floor(Date.now() / 1000)
    if (cachedJwt && now - cachedJwt.issuedAt < APNS_JWT_TTL_SECONDS) {
      return cachedJwt.token
    }
    const token = signProviderJwt(privateKey, config.keyId, config.teamId, now)
    cachedJwt = { token, issuedAt: now }
    return token
  }

  return (deviceToken, payload) =>
    new Promise((resolve, reject) => {
      const request = getSession().request({
        ':method': 'POST',
        ':path': `/3/device/${deviceToken}`,
        authorization: `bearer ${getJwt()}`,
        'apns-topic': config.bundleId,
        'apns-push-type': 'background',
        'apns-priority': '5',
        'content-type': 'application/json',
      })

      let status = 0
      let body = ''
      request.setEncoding('utf8')
      request.on('response', (headers) => {
        status = Number(headers[':status'] ?? 0)
      })
      request.on('data', (chunk: string) => {
        body += chunk
      })
      request.on('end', () => {
        if (status === 200) {
          resolve({ deadToken: false })
          return
        }
        if (status === 410 || (status === 400 && body.includes('BadDeviceToken'))) {
          logger.debug(`[push] APNS reports dead token (${status})`)
          resolve({ deadToken: true })
          return
        }
        reject(new Error(`APNS send failed: ${status} ${body}`))
      })
      request.on('error', reject)
      request.end(JSON.stringify(payload))
    })
}
