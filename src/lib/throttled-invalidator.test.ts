import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createThrottledInvalidator } from './throttled-invalidator'

describe('createThrottledInvalidator', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('collapses a burst of events into one immediate and one trailing refetch', () => {
    const run = vi.fn()
    const inv = createThrottledInvalidator(run, 5_000)
    for (let i = 0; i < 1_000; i++) inv.invalidate(['stats'])
    expect(run).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(5_000)
    expect(run).toHaveBeenCalledTimes(2)
    vi.advanceTimersByTime(60_000)
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('throttles each key independently', () => {
    const run = vi.fn()
    const inv = createThrottledInvalidator(run, 5_000)
    inv.invalidate(['stats'])
    inv.invalidate(['peers'])
    expect(run.mock.calls.map((c) => c[0])).toEqual([['stats'], ['peers']])
  })

  it('runs again immediately once the window has passed', () => {
    const run = vi.fn()
    const inv = createThrottledInvalidator(run, 5_000)
    inv.invalidate(['stats'])
    vi.advanceTimersByTime(6_000)
    inv.invalidate(['stats'])
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('cancels pending trailing runs on dispose', () => {
    const run = vi.fn()
    const inv = createThrottledInvalidator(run, 5_000)
    inv.invalidate(['stats'])
    inv.invalidate(['stats'])
    inv.dispose()
    vi.advanceTimersByTime(10_000)
    expect(run).toHaveBeenCalledTimes(1)
  })
})
