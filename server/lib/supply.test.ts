import { describe, it, expect } from 'vitest'
import {
  computeCirculatingSupply,
  currentBlockReward,
  PREMINE,
  MAX_SUPPLY,
  HALVING_INTERVAL,
  MIN_REWARD,
  BLOCK_REWARD,
} from './supply'

describe('computeCirculatingSupply', () => {
  it('returns 0 before the chain starts', () => {
    expect(computeCirculatingSupply(0)).toBe(0)
    expect(computeCirculatingSupply(-1)).toBe(0)
  })

  it('counts only the premine on block 1', () => {
    expect(computeCirculatingSupply(1)).toBe(PREMINE)
  })

  it('adds full block rewards in the first era (before the first halving)', () => {
    // 5 blocks after the premine at 10 FAIR each
    expect(computeCirculatingSupply(6)).toBe(PREMINE + 5 * BLOCK_REWARD)
  })

  it('halves the reward at the era boundary', () => {
    // Era 1 contributes exactly HALVING_INTERVAL blocks at BLOCK_REWARD;
    // the next block belongs to era 2 (reward = BLOCK_REWARD / 2).
    const endOfEra1 = 1 + HALVING_INTERVAL
    const supplyEndOfEra1 = computeCirculatingSupply(endOfEra1)
    expect(supplyEndOfEra1).toBe(PREMINE + HALVING_INTERVAL * BLOCK_REWARD)

    const supplyAfter = computeCirculatingSupply(endOfEra1 + 1)
    expect(supplyAfter).toBeCloseTo(supplyEndOfEra1 + BLOCK_REWARD / 2, 8)
  })

  it('never exceeds the hard cap', () => {
    // Very large height: cap must clamp the result.
    expect(computeCirculatingSupply(10_000_000_000)).toBe(MAX_SUPPLY)
  })

  it('stays monotonic', () => {
    const samples = [100, 10_000, HALVING_INTERVAL, HALVING_INTERVAL * 2, HALVING_INTERVAL * 5]
    let previous = -1
    for (const h of samples) {
      const value = computeCirculatingSupply(h)
      expect(value).toBeGreaterThanOrEqual(previous)
      previous = value
    }
  })
})

describe('currentBlockReward', () => {
  it('returns the base reward in the first era', () => {
    expect(currentBlockReward(1)).toBe(BLOCK_REWARD)
    expect(currentBlockReward(HALVING_INTERVAL - 1)).toBe(BLOCK_REWARD)
  })

  it('halves at the era boundary', () => {
    expect(currentBlockReward(HALVING_INTERVAL)).toBe(BLOCK_REWARD / 2)
    expect(currentBlockReward(HALVING_INTERVAL * 2)).toBe(BLOCK_REWARD / 4)
  })

  it('clamps at the minimum reward', () => {
    expect(currentBlockReward(HALVING_INTERVAL * 50)).toBe(MIN_REWARD)
  })
})
