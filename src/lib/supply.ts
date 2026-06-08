// FairCoin supply economics (mirrors server/routes/stats.ts).
// Premine 5,000,000 FAIR on block 1; block reward 10 FAIR; halving every
// 525,600 blocks; minimum reward 1.25 FAIR; hard cap 33,000,000 FAIR.

export const PREMINE = 5_000_000
export const BLOCK_REWARD = 10
export const HALVING_INTERVAL = 525_600
export const MIN_REWARD = 1.25
export const MAX_SUPPLY = 33_000_000

export interface SupplyInfo {
  /** Circulating supply at the given height, in FAIR. */
  circulating: number
  /** Hard cap, in FAIR. */
  max: number
  /** Fraction of the hard cap minted so far (0..1). */
  fraction: number
  /** Current block reward at this height, in FAIR. */
  currentReward: number
  /** Number of halvings that have already occurred. */
  halvings: number
  /** Block height of the next halving boundary. */
  nextHalvingHeight: number
  /** Blocks remaining until the next halving. */
  blocksToNextHalving: number
}

/**
 * Compute the circulating supply at a given block height using the same
 * halving schedule the chain uses on the server.
 */
export function computeCirculatingSupply(blockHeight: number): number {
  if (blockHeight <= 0) return 0
  let supply = PREMINE
  if (blockHeight > 1) {
    let remaining = blockHeight - 1
    let reward = BLOCK_REWARD
    while (remaining > 0 && reward >= MIN_REWARD) {
      const blocksInEra = Math.min(remaining, HALVING_INTERVAL)
      supply += blocksInEra * reward
      remaining -= blocksInEra
      reward = Math.max(reward / 2, MIN_REWARD)
    }
    if (remaining > 0) supply += remaining * MIN_REWARD
  }
  return Math.min(supply, MAX_SUPPLY)
}

/** Derive a full supply snapshot (circulating, halving progress, etc.). */
export function computeSupplyInfo(blockHeight: number): SupplyInfo {
  const circulating = computeCirculatingSupply(blockHeight)
  const halvings = blockHeight > 0 ? Math.floor(blockHeight / HALVING_INTERVAL) : 0
  const currentReward = Math.max(BLOCK_REWARD / 2 ** halvings, MIN_REWARD)
  const nextHalvingHeight = (halvings + 1) * HALVING_INTERVAL
  const blocksToNextHalving = Math.max(nextHalvingHeight - blockHeight, 0)

  return {
    circulating,
    max: MAX_SUPPLY,
    fraction: MAX_SUPPLY > 0 ? Math.min(circulating / MAX_SUPPLY, 1) : 0,
    currentReward,
    halvings,
    nextHalvingHeight,
    blocksToNextHalving,
  }
}
