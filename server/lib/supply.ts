// FairCoin supply economics (mirrors src/lib/supply.ts).
// Premine 5,000,000 FAIR on block 1; block reward 10 FAIR; halving every
// 525,600 blocks; minimum reward 1.25 FAIR; hard cap 33,000,000 FAIR.

export const PREMINE = 5_000_000
export const BLOCK_REWARD = 10
export const HALVING_INTERVAL = 525_600
export const MIN_REWARD = 1.25
export const MAX_SUPPLY = 33_000_000

/**
 * Compute the circulating supply at a given block height using the chain's
 * halving schedule: block 1 carries the premine, every subsequent block mints
 * the era reward (halved every HALVING_INTERVAL blocks, floored at MIN_REWARD).
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

/** Current block reward at the given height, considering halvings. */
export function currentBlockReward(blockHeight: number): number {
  const halvings = blockHeight > 0 ? Math.floor(blockHeight / HALVING_INTERVAL) : 0
  return Math.max(BLOCK_REWARD / 2 ** halvings, MIN_REWARD)
}
