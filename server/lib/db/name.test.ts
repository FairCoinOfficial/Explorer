import { describe, it, expect, afterEach } from 'vitest'
import { getMongoDatabaseName, DEFAULT_MONGO_DATABASE_NAME } from './name'

describe('getMongoDatabaseName', () => {
  const originalUri = process.env.MONGODB_URI
  const originalDbName = process.env.MONGODB_DB_NAME

  afterEach(() => {
    if (originalUri === undefined) delete process.env.MONGODB_URI
    else process.env.MONGODB_URI = originalUri
    if (originalDbName === undefined) delete process.env.MONGODB_DB_NAME
    else process.env.MONGODB_DB_NAME = originalDbName
  })

  it('uses MONGODB_DB_NAME when set', () => {
    process.env.MONGODB_DB_NAME = 'explicit-db'
    expect(getMongoDatabaseName('mongodb://localhost:27017/uri-path')).toBe('explicit-db')
  })

  it('uses the URI path when MONGODB_DB_NAME is unset', () => {
    delete process.env.MONGODB_DB_NAME
    expect(getMongoDatabaseName('mongodb://localhost:27017/faircoin-explorer')).toBe(
      'faircoin-explorer',
    )
  })

  it('falls back to the default name when the URI has no path', () => {
    delete process.env.MONGODB_DB_NAME
    expect(getMongoDatabaseName('mongodb://localhost:27017')).toBe(DEFAULT_MONGO_DATABASE_NAME)
    expect(getMongoDatabaseName('mongodb://localhost:27017/')).toBe(DEFAULT_MONGO_DATABASE_NAME)
  })
})
