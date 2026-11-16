import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpcMock = vi.hoisted(() => vi.fn())
vi.mock('@fairco.in/rpc-client', () => ({ rpcWithNetwork: rpcMock }))

import { BlockchainCache } from './cache'

/**
 * When the node is slow, every RPC call can burn the full client timeout. The
 * cache used to retry the same call after a failure — doubling the wait — and
 * never fell back to the answer it already held, so pages spun for a minute and
 * showed nothing. These tests pin the fallback, and pin that `/api/health`
 * (which must notice a dead node) can opt out of it.
 */

interface Doc {
  _id: string
  data: unknown
  timestamp: number
  ttl: number
}

class FakeCollection {
  docs = new Map<string, Doc>()
  async findOne(filter: { _id: string }) {
    return this.docs.get(filter._id) ?? null
  }
  async replaceOne(filter: { _id: string }, doc: Omit<Doc, '_id'>) {
    this.docs.set(filter._id, { _id: filter._id, ...doc })
  }
}

class TestCache extends BlockchainCache {
  constructor(readonly fake: FakeCollection) {
    super()
  }
  protected override async cacheCollection() {
    return this.fake as never
  }
}

const KEY = 'mainnet:getblockcount:[]'

function seed(fake: FakeCollection, data: unknown, ageSeconds: number, ttl: number) {
  fake.docs.set(KEY, { _id: KEY, data, timestamp: Date.now() - ageSeconds * 1000, ttl })
}

describe('BlockchainCache.get', () => {
  let fake: FakeCollection
  let cache: TestCache

  beforeEach(() => {
    rpcMock.mockReset()
    fake = new FakeCollection()
    cache = new TestCache(fake)
  })

  it('serves a fresh cached value without calling the node', async () => {
    seed(fake, 100, 5, 60)
    await expect(cache.get('getblockcount', [], { network: 'mainnet', ttl: 60 })).resolves.toBe(100)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('serves the stale value once — no retry — when the node times out', async () => {
    seed(fake, 100, 120, 60)
    rpcMock.mockRejectedValue(new Error('RPC getblockcount timed out after 10000ms'))
    await expect(cache.get('getblockcount', [], { network: 'mainnet', ttl: 60 })).resolves.toBe(100)
    expect(rpcMock).toHaveBeenCalledTimes(1)
  })

  it('throws when the node fails and nothing is cached', async () => {
    rpcMock.mockRejectedValue(new Error('down'))
    await expect(cache.get('getblockcount', [], { network: 'mainnet', ttl: 60 })).rejects.toThrow('down')
    expect(rpcMock).toHaveBeenCalledTimes(1)
  })

  it('lets a health probe opt out of stale fallback', async () => {
    seed(fake, 100, 120, 60)
    rpcMock.mockRejectedValue(new Error('down'))
    await expect(
      cache.get('getblockcount', [], { network: 'mainnet', ttl: 10, staleOnError: false }),
    ).rejects.toThrow('down')
  })

  it("honours the reader's shorter TTL over the writer's longer one", async () => {
    // Written by a 300s reader 60s ago; a 10s reader must refetch.
    seed(fake, 100, 60, 300)
    rpcMock.mockResolvedValue(101)
    await expect(cache.get('getblockcount', [], { network: 'mainnet', ttl: 10 })).resolves.toBe(101)
    expect(fake.docs.get(KEY)?.data).toBe(101)
  })
})
