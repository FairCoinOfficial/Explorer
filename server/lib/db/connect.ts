import mongoose from 'mongoose'
import { config } from 'dotenv'

// Load environment variables
config()

const APP_NAME = 'explorer'

function getDatabaseName(): string {
  const env = process.env.NODE_ENV || 'development'
  return `${APP_NAME}-${env}`
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/explorer-development'

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local')
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

const globalWithMongoose = global as typeof globalThis & { mongoose?: MongooseCache }

let cached: MongooseCache = globalWithMongoose.mongoose ?? { conn: null, promise: null }

if (!globalWithMongoose.mongoose) {
  globalWithMongoose.mongoose = cached
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const dbName = getDatabaseName()
    const opts = {
      dbName,
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      retryReads: true,
      compressors: ['zlib' as const],
    }

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      console.log('Connected to MongoDB Atlas')
      return mongooseInstance
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

export default connectToDatabase
