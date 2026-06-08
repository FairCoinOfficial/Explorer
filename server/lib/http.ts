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
export const MAX_LIMIT = 50
const DEFAULT_LIMIT = 20

const NETWORKS = ['mainnet', 'testnet'] as const

const networkSchema = z.enum(NETWORKS)

const limitSchema = z.coerce
  .number()
  .int()
  .min(MIN_LIMIT)
  .max(MAX_LIMIT)

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
 * Validate and clamp the `limit` query parameter to the integer range
 * [{@link MIN_LIMIT}, {@link MAX_LIMIT}]. Returns the default when absent;
 * throws {@link ValidationError} on NaN/non-integer/out-of-range input.
 */
export function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === '') {
    return DEFAULT_LIMIT
  }
  const result = limitSchema.safeParse(value)
  if (!result.success) {
    throw new ValidationError(
      `Invalid 'limit': must be an integer between ${MIN_LIMIT} and ${MAX_LIMIT}`,
    )
  }
  return result.data
}

/** Escape a string for safe interpolation into a MongoDB `$regex` pattern. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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
