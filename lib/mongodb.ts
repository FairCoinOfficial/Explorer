import { MongoClient, Db } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/faircoin-explorer'

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable')
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
interface MongoConnection {
  client: MongoClient | null
  db: Db | null
  promise: Promise<{ client: MongoClient; db: Db }> | null
}

let cached: MongoConnection = (global as any).mongoConnection

if (!cached) {
  cached = (global as any).mongoConnection = { client: null, db: null, promise: null }
}

export async function connectToMongoDB(): Promise<{ client: MongoClient; db: Db }> {
  if (cached.client && cached.db) {
    return { client: cached.client, db: cached.db }
  }

  if (!cached.promise) {
    const opts = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxIdleTimeMS: 30000,
    }

    cached.promise = MongoClient.connect(MONGODB_URI, opts).then((client) => {
      const dbName = new URL(MONGODB_URI).pathname.slice(1) || 'faircoin-explorer'
      const db = client.db(dbName)
      console.log(`Connected to MongoDB database: ${dbName}`)
      return { client, db }
    })
  }

  try {
    const { client, db } = await cached.promise
    cached.client = client
    cached.db = db
    return { client, db }
  } catch (e) {
    cached.promise = null
    throw e
  }
}

export async function getDatabase(): Promise<Db> {
  const { db } = await connectToMongoDB()
  return db
}
