import { describe, expect, it } from 'vitest'
import {
  compareHalves,
  observedBlocks,
  preparePrices,
  prepareStats,
} from './chart-data'
const sample = (height: number, timestamp: string) => ({
  height,
  timestamp,
  difficulty: 1,
  connections: 4,
  mempoolSize: 0,
  lastBlockTxCount: 2,
})
describe('Explorer chart data', () => {
  it('sorts, deduplicates timestamps, rejects invalid samples and keeps zero values', () => {
    const rows = prepareStats([
      sample(2, '2026-10-08T01:00:00Z'),
      sample(1, '2026-10-08T00:00:00Z'),
      sample(3, '2026-10-08T01:00:00Z'),
      sample(0, '2026-10-08T02:00:00Z'),
      sample(4, 'bad'),
    ])
    expect(rows.map((x) => x.height)).toEqual([1, 3])
    expect(rows[0].mempoolSize).toBe(0)
  })
  it('counts a repeatedly sampled block only once', () => {
    expect(
      observedBlocks(
        prepareStats([
          sample(10, '2026-10-08T00:00:00Z'),
          sample(10, '2026-10-08T00:05:00Z'),
          sample(11, '2026-10-08T00:10:00Z'),
        ]),
      ),
    ).toHaveLength(2)
  })
  it('compares equal halves without padding absent history', () => {
    expect(compareHalves([{ label: 'a', value: 1 }])).toEqual([])
    expect(
      compareHalves(
        [1, 2, 3, 4, 5].map((value) => ({ label: String(value), value })),
      ),
    ).toEqual([
      { label: '4', current: 4, previous: 2 },
      { label: '5', current: 5, previous: 3 },
    ])
  })
  it('rejects non-finite and negative prices without discarding a real zero', () => {
    expect(
      preparePrices(
        [0, -1, NaN, Infinity].map((price_usd, i) => ({
          price_usd,
          timestamp: `2026-10-08T0${i}:00:00Z`,
        })),
      ).map((x) => x.price_usd),
    ).toEqual([0])
  })
})
