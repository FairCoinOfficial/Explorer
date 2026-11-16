import { describe, expect, it } from 'vitest'
import { assessNodeHealth, STALE_TIP_SECONDS, type NodeHealthInput } from './node-health'

/**
 * The explorer used to serve its node's tip with no indication of whether that
 * tip was still current. When the node stopped following the chain, every
 * endpoint kept answering 200 with a frozen height and nothing looked wrong —
 * the outage was invisible until a human happened to compare against another
 * node. These tests lock the rule that makes that impossible, without letting a
 * taller peer on another branch raise a permanent false alarm.
 */

const NOW = 1_800_000_000
const FRESH = NOW - 60
const COLD = NOW - STALE_TIP_SECONDS - 1

function assess(overrides: Partial<NodeHealthInput>) {
  return assessNodeHealth({
    nodeHeight: 100,
    bestHeaderHeight: 100,
    tipTime: FRESH,
    peerHeights: [],
    now: NOW,
    ...overrides,
  })
}

describe('assessNodeHealth', () => {
  it('is ok when the node matches the best peer', () => {
    const health = assess({ peerHeights: [100, 99] })
    expect(health.status).toBe('ok')
    expect(health.lagBlocks).toBe(0)
    expect(health.networkHeight).toBe(100)
  })

  it('is ok when the node is ahead of every peer', () => {
    const health = assess({ nodeHeight: 101, bestHeaderHeight: 101, peerHeights: [100] })
    expect(health.status).toBe('ok')
    expect(health.lagBlocks).toBe(0)
  })

  it('is lagging when our node holds heavier headers it has not connected yet', () => {
    const health = assess({ nodeHeight: 98, bestHeaderHeight: 103, peerHeights: [103] })
    expect(health.status).toBe('lagging')
    expect(health.lagBlocks).toBe(5)
    expect(health.networkHeight).toBe(103)
  })

  it('ignores a taller peer on another branch while our tip is fresh', () => {
    // Regression: since 2026-09-24 a public peer on a lower-difficulty PoS fork
    // reported ~200 more blocks than the heavier chain. Height is not work, and
    // our own node saw no heavier header, so this must not read as "catching up".
    const health = assess({
      nodeHeight: 241_222,
      bestHeaderHeight: 241_222,
      peerHeights: [241_222, 241_429, 241_220],
      tipTime: NOW - 151,
    })
    expect(health.status).toBe('ok')
    expect(health.lagBlocks).toBe(0)
    expect(health.networkHeight).toBe(241_222)
    expect(health.peerReportedHeight).toBe(241_429)
  })

  it('is stalled when a peer is ahead AND our tip has gone stale', () => {
    // A stuck node's header view is frozen too, so peer claims must still count.
    const health = assess({ nodeHeight: 81534, bestHeaderHeight: 81534, tipTime: COLD, peerHeights: [81603] })
    expect(health.status).toBe('stalled')
    expect(health.lagBlocks).toBe(69)
    expect(health.tipAgeSeconds).toBeGreaterThan(STALE_TIP_SECONDS)
  })

  it('is stalled when the tip is cold and heavier headers are known', () => {
    const health = assess({ bestHeaderHeight: 140, tipTime: COLD, peerHeights: [100] })
    expect(health.status).toBe('stalled')
    expect(health.lagBlocks).toBe(40)
  })

  it('does not call a quiet network a stall', () => {
    // Every peer agrees with us; the chain itself simply is not producing.
    const health = assess({ tipTime: COLD, peerHeights: [100, 100] })
    expect(health.status).toBe('ok')
    expect(health.lagBlocks).toBe(0)
  })

  it('reports unknown, never ok, when the tip is stale and we have no peer heights', () => {
    // With nothing to compare against we cannot claim health either way, and
    // claiming "ok" is exactly the failure this endpoint exists to prevent.
    const health = assess({ tipTime: COLD, peerHeights: [] })
    expect(health.status).toBe('unknown')
  })

  it('is ok with no peers while the tip is fresh', () => {
    expect(assess({ peerHeights: [] }).status).toBe('ok')
  })

  it('treats a missing best-header height as no work-backed lag', () => {
    expect(assess({ bestHeaderHeight: -1, peerHeights: [150] }).status).toBe('ok')
    expect(assess({ bestHeaderHeight: Number.NaN, peerHeights: [150] }).status).toBe('ok')
  })

  it('ignores the -1 sentinel peers report before they have synced with us', () => {
    const health = assess({ peerHeights: [-1, -1] })
    expect(health.networkHeight).toBe(100)
    expect(health.peerReportedHeight).toBe(100)
    expect(health.status).toBe('ok')
  })

  it('never reports a negative tip age', () => {
    // PoS blocks are accepted with timestamps slightly ahead of our clock, so a
    // fresh tip can legitimately be "in the future". Reporting -10s as an age is
    // just confusing to anyone reading the endpoint.
    const health = assess({ tipTime: NOW + 10, peerHeights: [100] })
    expect(health.tipAgeSeconds).toBe(0)
    expect(health.status).toBe('ok')
  })

  it('never reports a negative lag', () => {
    const health = assess({ nodeHeight: 200, bestHeaderHeight: 150, peerHeights: [100] })
    expect(health.lagBlocks).toBe(0)
  })
})
