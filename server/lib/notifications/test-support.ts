import { existsSync } from 'node:fs'
import { join, delimiter } from 'node:path'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

// Shared test harness: an in-memory MongoDB the notification DB tests connect
// mongoose to. It prefers an already-installed `mongod` (from PATH, overridable
// via MONGOMS_SYSTEM_BINARY) so offline/local runs need no download; when none
// is present (e.g. a clean CI runner) it lets mongodb-memory-server download and
// cache its own binary. NOT a `*.test.ts` file, so vitest never runs it directly.

let memoryServer: MongoMemoryServer | null = null

/**
 * Locate an already-installed `mongod` (env override, then PATH) without
 * invoking a shell, or return null when none is found so the caller can fall
 * back to mongodb-memory-server's own download.
 */
function resolveMongodBinary(): string | null {
  const fromEnv = process.env.MONGOMS_SYSTEM_BINARY
  if (fromEnv) return fromEnv
  const dirs = (process.env.PATH ?? '').split(delimiter).filter(Boolean)
  for (const dir of dirs) {
    const candidate = join(dir, 'mongod')
    if (existsSync(candidate)) return candidate
  }
  return null
}

/** Boot an in-memory MongoDB and connect mongoose to it. Call in beforeAll. */
export async function setupMemoryMongo(): Promise<void> {
  const systemBinary = resolveMongodBinary()
  // Use a system binary when present (no network); otherwise omit `binary` so
  // mongodb-memory-server resolves, downloads, and caches one itself.
  memoryServer = await MongoMemoryServer.create(
    systemBinary ? { binary: { systemBinary } } : undefined,
  )
  await mongoose.connect(memoryServer.getUri(), { dbName: 'notifications_test' })
}

/** Disconnect mongoose and stop the in-memory MongoDB. Call in afterAll. */
export async function teardownMemoryMongo(): Promise<void> {
  await mongoose.disconnect()
  if (memoryServer) {
    await memoryServer.stop()
    memoryServer = null
  }
}

/** Drop every collection so each test starts from a clean slate. */
export async function clearCollections(): Promise<void> {
  const { collections } = mongoose.connection
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({})
  }
}
