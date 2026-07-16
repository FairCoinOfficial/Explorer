import { existsSync } from 'node:fs'
import { join, delimiter } from 'node:path'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

// Shared test harness: an in-memory MongoDB the notification DB tests connect
// mongoose to. It uses the machine's already-installed `mongod` binary
// (resolved from PATH, overridable via MONGOMS_SYSTEM_BINARY) so tests need no
// network download. NOT a `*.test.ts` file, so vitest never runs it directly.

let memoryServer: MongoMemoryServer | null = null

/** Locate the `mongod` executable on PATH without invoking a shell. */
function resolveMongodBinary(): string {
  const fromEnv = process.env.MONGOMS_SYSTEM_BINARY
  if (fromEnv) return fromEnv
  const dirs = (process.env.PATH ?? '').split(delimiter).filter(Boolean)
  for (const dir of dirs) {
    const candidate = join(dir, 'mongod')
    if (existsSync(candidate)) return candidate
  }
  throw new Error('mongod not found on PATH; set MONGOMS_SYSTEM_BINARY to its location')
}

/** Boot an in-memory MongoDB and connect mongoose to it. Call in beforeAll. */
export async function setupMemoryMongo(): Promise<void> {
  memoryServer = await MongoMemoryServer.create({
    binary: { systemBinary: resolveMongodBinary() },
  })
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
