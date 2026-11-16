import { describe, expect, it } from 'vitest'
import { MAX_BLOCKS_ANNOUNCED_PER_POLL, planBlockAnnouncements } from './blockchain-monitor'

/**
 * 2026-11-16: a failed startup read left the monitor at height 0; the next poll
 * announced 241k historical blocks one by one, and every announcement made each
 * open browser refetch stats + peers. These pin that it cannot happen again.
 */
describe('planBlockAnnouncements', () => {
  it('announces nothing when the starting height was never established', () => {
    expect(planBlockAnnouncements(null, 241_000)).toEqual([])
  })

  it('announces each block of an ordinary burst', () => {
    expect(planBlockAnnouncements(100, 103)).toEqual([101, 102, 103])
  })

  it('caps a large catch-up to the most recent blocks', () => {
    const heights = planBlockAnnouncements(0, 241_000)
    expect(heights).toHaveLength(MAX_BLOCKS_ANNOUNCED_PER_POLL)
    expect(heights[0]).toBe(241_000 - MAX_BLOCKS_ANNOUNCED_PER_POLL + 1)
    expect(heights.at(-1)).toBe(241_000)
  })

  it('announces nothing when the tip did not move or went backwards', () => {
    expect(planBlockAnnouncements(100, 100)).toEqual([])
    expect(planBlockAnnouncements(100, 98)).toEqual([])
  })
})
