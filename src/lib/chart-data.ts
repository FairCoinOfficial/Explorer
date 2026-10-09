import type { PriceHistoryPoint } from '@/hooks/use-coin-price'
import type { StatHistoryPoint } from '@/hooks/use-stats-history'
import { computeCirculatingSupply } from '@shared/supply'

/** Ignore malformed samples; preserve actual zeros and chronological order. */
export function prepareStats(points: StatHistoryPoint[]) {
  const byTime = new Map<number, StatHistoryPoint>()
  for (const point of points) {
    const time = Date.parse(point.timestamp)
    if (
      !Number.isFinite(time) ||
      !Number.isInteger(point.height) ||
      point.height <= 0 ||
      !Number.isFinite(point.difficulty) ||
      point.difficulty < 0 ||
      !Number.isFinite(point.connections) ||
      point.connections < 0
    )
      continue
    byTime.set(time, point)
  }
  return [...byTime.entries()]
    .sort(([a], [b]) => a - b)
    .map(([time, point]) => ({
      ...point,
      time,
      supply: computeCirculatingSupply(point.height),
    }))
}

export function preparePrices(points: PriceHistoryPoint[]) {
  const byTime = new Map<number, PriceHistoryPoint>()
  for (const point of points) {
    const time = Date.parse(point.timestamp)
    if (
      Number.isFinite(time) &&
      Number.isFinite(point.price_usd) &&
      point.price_usd >= 0
    )
      byTime.set(time, point)
  }
  return [...byTime.entries()]
    .sort(([a], [b]) => a - b)
    .map(([time, point]) => ({ ...point, time }))
}

/** A tip sampled repeatedly is one observed block, not repeated transaction volume. */
export function observedBlocks(points: ReturnType<typeof prepareStats>) {
  return [...new Map(points.map((point) => [point.height, point])).values()]
}

/** Pair equal-size successive sets; never invent a previous-period baseline. */
export function compareHalves(values: { label: string; value: number }[]) {
  const size = Math.floor(values.length / 2)
  const start = values.length - size * 2
  return values.slice(start + size).map((point, index) => ({
    label: point.label,
    current: point.value,
    previous: values[start + index].value,
  }))
}
