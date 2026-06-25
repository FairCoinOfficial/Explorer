import type { Request, Response } from 'express'
import { z } from 'zod'
import type { NetworkType } from '@fairco.in/rpc-client'

/**
 * Edge input-validation and error-sanitization helpers shared by every route.
 *
 * Rationale:
 * - `limit` flows into a serial RPC loop (cache.getRecentBlocks); an unbounded
 *   value lets `?limit=100000` trigger ~200k RPC calls (DoS). Clamp to a sane range.
 * - `network` flows into Mongo `_id`/`$regex` keys and selects RPC credentials;
 *   it must be exactly `mainnet` or `testnet`, never arbitrary user input.
 * - Raw `error.message` leaks RPC/Mongo internals to clients; sanitize at the edge.
 */

/** Inclusive bounds for any list `limit` query parameter. */
export const MIN_LIMIT = 1
export const MAX_LIMIT = 100
export const MAX_BLOCK_OFFSET = 10_000
const DEFAULT_LIMIT = 20

const NETWORKS = ['mainnet', 'testnet'] as const

const networkSchema = z.enum(NETWORKS)

// Just require an integer; the out-of-range handling is a clamp (not a reject)
// in parseLimit so legitimate callers (e.g. the /blocks list asks for 100) work
// and abusive values (?limit=99999) are capped to MAX_LIMIT rather than 400'd.
const limitSchema = z.coerce.number().int()

/** Raised when an edge validation check fails; carries the client-facing 400 message. */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Validate and coerce the `network` query parameter.
 * Returns the default `mainnet` when absent; throws {@link ValidationError} when
 * present but not one of the supported networks.
 */
export function parseNetwork(value: unknown): NetworkType {
  if (value === undefined || value === null || value === '') {
    return 'mainnet'
  }
  const result = networkSchema.safeParse(value)
  if (!result.success) {
    throw new ValidationError("Invalid 'network': must be 'mainnet' or 'testnet'")
  }
  return result.data
}

/**
 * Coerce the `limit` query parameter into the integer range
 * [{@link MIN_LIMIT}, {@link MAX_LIMIT}]. Returns the default when absent or
 * non-numeric; CLAMPS out-of-range values (so large requests are capped rather
 * than rejected) — this keeps the DoS guard while never 400'ing a real caller.
 */
export function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === '') {
    return DEFAULT_LIMIT
  }
  const result = limitSchema.safeParse(value)
  if (!result.success) {
    return DEFAULT_LIMIT
  }
  return Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, result.data))
}

/**
 * Coerce the `offset` query parameter into a non-negative integer. Returns 0
 * when absent or non-numeric; clamps negatives to 0.
 */
export function parseOffset(value: unknown): number {
  if (value === undefined || value === null || value === '') return 0
  const result = limitSchema.safeParse(value)
  if (!result.success) return 0
  return Math.max(0, result.data)
}

/**
 * Coerce the public block-list `offset` into a bounded range. Block windows are
 * expensive to materialize on cache misses, so keeping this edge-bounded limits
 * attacker-controlled recent-block cache keys and RPC walks.
 */
export function parseBlockOffset(value: unknown): number {
  return Math.min(MAX_BLOCK_OFFSET, parseOffset(value))
}

/** Escape a string for safe interpolation into a MongoDB `$regex` pattern. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Base58Check shape check for FairCoin addresses (legacy P2PKH/P2SH style).
 * This is only a cheap syntactic gate before hitting RPC — full validation is
 * the daemon's `validateaddress`. Length 25–62 covers mainnet/testnet formats.
 */
const ADDRESS_REGEX = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{25,62}$/

/**
 * Validate the `:address` route parameter shape. Throws {@link ValidationError}
 * (mapped to 400 by {@link handleRouteError}) on malformed input so it never
 * reaches RPC params or Mongo keys.
 */
export function parseAddress(value: unknown): string {
  if (typeof value !== 'string' || !ADDRESS_REGEX.test(value)) {
    throw new ValidationError('Invalid address format')
  }
  return value
}

/**
 * Central error responder. Logs the full error server-side (with context) and
 * returns a generic message to the client so internals never leak. When the
 * error is a {@link ValidationError}, responds 400 with its message instead.
 */
export function handleRouteError(res: Response, context: string, error: unknown): void {
  if (error instanceof ValidationError) {
    res.status(400).json({ error: error.message })
    return
  }
  console.error(`${context}:`, error)
  res.status(500).json({ error: 'Internal error' })
}

/**
 * Read and validate the common `network` + `limit` query parameters in one call.
 * Throws {@link ValidationError} (mapped to 400 by {@link handleRouteError}).
 */
export function parseListQuery(req: Request): { network: NetworkType; limit: number } {
  return {
    network: parseNetwork(req.query.network),
    limit: parseLimit(req.query.limit),
  }
}
