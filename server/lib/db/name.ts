/**
 * Single source of truth for the MongoDB database name used by both Mongoose
 * (models / sync) and the native MongoClient (RPC cache).
 *
 * Strategy (in order):
 *  1. Explicit `MONGODB_DB_NAME` when set
 *  2. Path segment of `MONGODB_URI` (e.g. `.../faircoin-explorer`)
 *  3. Default `faircoin-explorer` when the URI has no path
 *
 * Both clients MUST call this helper — never parse the URI independently or
 * invent a second naming scheme (that caused the historical split-brain).
 */

export const DEFAULT_MONGO_DATABASE_NAME = 'faircoin-explorer'

const DEFAULT_MONGO_URI = `mongodb://localhost:27017/${DEFAULT_MONGO_DATABASE_NAME}`

/**
 * Resolve the MongoDB database name from env. Safe to call at module load or
 * connection time; does not open a connection.
 */
export function getMongoDatabaseName(
  uri: string = process.env.MONGODB_URI || DEFAULT_MONGO_URI,
): string {
  const explicit = process.env.MONGODB_DB_NAME?.trim()
  if (explicit) {
    return explicit
  }

  try {
    const pathname = new URL(uri).pathname.replace(/^\//, '')
    // Strip query-like leftovers if a non-standard URI sneaks in; pathname is
    // normally just the db name (no slashes).
    const dbName = pathname.split('/')[0]?.trim()
    if (dbName) {
      return dbName
    }
  } catch {
    // Invalid URI — fall through to the default name. Connection will fail
    // later with a clear driver error if the URI itself is unusable.
  }

  return DEFAULT_MONGO_DATABASE_NAME
}

/** Canonical default URI used when `MONGODB_URI` is unset. */
export function getDefaultMongoUri(): string {
  return DEFAULT_MONGO_URI
}
