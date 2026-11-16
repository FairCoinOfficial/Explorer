import { afterEach, describe, expect, it, vi } from 'vitest'
import { importWithRetry, isChunkLoadError } from './lazy-with-retry'

const chunkError = () => new TypeError('Failed to fetch dynamically imported module: https://x/assets/blocks-DVSoAvMX.js')

describe('importWithRetry', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('recognises chunk-load failures across browsers', () => {
    expect(isChunkLoadError(chunkError())).toBe(true)
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true)
    expect(isChunkLoadError(new Error('x is undefined'))).toBe(false)
  })

  it('recovers from a transient failure without reloading', async () => {
    const factory = vi.fn().mockRejectedValueOnce(chunkError()).mockResolvedValue({ default: 'page' })
    await expect(importWithRetry(factory, [0, 0])).resolves.toEqual({ default: 'page' })
    expect(factory).toHaveBeenCalledTimes(2)
  })

  it('does not retry errors that are not chunk loads', async () => {
    const factory = vi.fn().mockRejectedValue(new Error('boom'))
    await expect(importWithRetry(factory, [0, 0])).rejects.toThrow('boom')
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('reloads once, then gives up to the error boundary instead of looping', async () => {
    const store = new Map<string, string>()
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
    })
    const reload = vi.fn()
    vi.stubGlobal('window', { location: { reload } })
    const factory = vi.fn().mockRejectedValue(chunkError())

    // First exhaustion: reload, and the promise stays pending while the page goes away.
    const pending = importWithRetry(factory, [0])
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1))
    void pending

    // Second exhaustion inside the guard window: no second reload, error surfaces.
    await expect(importWithRetry(factory, [0])).rejects.toThrow('Failed to fetch dynamically imported module')
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
