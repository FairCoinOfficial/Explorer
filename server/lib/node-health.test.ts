import { describe, expect, it } from 'vitest'
import { assessNodeHealth, STALE_TIP_SECONDS } from './node-health'

/**
 * The explorer used to serve its node's tip with no indication of whether that
 * tip was still current. When the node stopped following the chain, every
 * endpoint kept answering 200 with a frozen height and nothing looked wrong —
 * the outage was invisible until a human happened to compare against another
 * node. These tests lock the rule that makes that impossible: a tip is only
 * "ok" when nobody we are connected to has more chain than we do.
 */

const NOW = 1_800_000_000
const FRESH = NOW - 60

describe('assessNodeHealth', () => {
  it('is ok when the node matches the best peer', () => {
    const health = assessNodeHealth({ nodeHeight: 100, tipTime: FRESH, peerHeights: [100, 99], now: NOW })
    expect(health.status).toBe('ok')
    expect(health.lagBlocks).toBe(0)
    expect(health.networkHeight).toBe(100)
  })

  it('is ok when the node is ahead of every peer', () => {
    const health = assessNodeHealth({ nodeHeight: 101, tipTime: FRESH, peerHeights: [100], now: NOW })
    expect(health.status).toBe('ok')
    expect(health.lagBlocks).toBe(0)
  })

  it('is lagging when a peer is ahead but the tip is still fresh', () => {
    // A block or two behind with a recent tip is normal propagation, not an outage.
    const health = assessNodeHealth({ nodeHeight: 98, tipTime: FRESH, peerHeights: [100], now: NOW })
    expect(health.status).toBe('lagging')
    expect(health.lagBlocks).toBe(2)
  })

  it('is stalled when a peer is ahead AND our tip has gone stale', () => {
    const health = assessNodeHealth({
      nodeHeight: 81534,
      tipTime: NOW - STALE_TIP_SECONDS - 1,
      peerHeights: [81603],
      now: NOW,
    })
    expect(health.status).toBe('stalled')
    expect(health.lagBlocks).toBe(69)
    expect(health.tipAgeSeconds).toBeGreaterThan(STALE_TIP_SECONDS)
  })

  it('does not call a quiet network a stall', () => {
    // Every peer agrees with us; the chain itself simply is not producing.
    const health = assessNodeHealth({
      nodeHeight: 100,
      tipTime: NOW - STALE_TIP_SECONDS - 1,
      peerHeights: [100, 100],
      now: NOW,
    })
    expect(health.status).toBe('ok')
    expect(health.lagBlocks).toBe(0)
  })

  it('reports unknown, never ok, when the tip is stale and we have no peer heights', () => {
    // With nothing to compare against we cannot claim health either way, and
    // claiming "ok" is exactly the failure this endpoint exists to prevent.
    const health = assessNodeHealth({
      nodeHeight: 100,
      tipTime: NOW - STALE_TIP_SECONDS - 1,
      peerHeights: [],
      now: NOW,
    })
    expect(health.status).toBe('unknown')
  })

  it('is ok with no peers while the tip is fresh', () => {
    const health = assessNodeHealth({ nodeHeight: 100, tipTime: FRESH, peerHeights: [], now: NOW })
    expect(health.status).toBe('ok')
  })

  it('ignores the -1 sentinel peers report before they have synced with us', () => {
    const health = assessNodeHealth({ nodeHeight: 100, tipTime: FRESH, peerHeights: [-1, -1], now: NOW })
    expect(health.networkHeight).toBe(100)
    expect(health.status).toBe('ok')
  })

  it('never reports a negative tip age', () => {
    // PoS blocks are accepted with timestamps slightly ahead of our clock, so a
    // fresh tip can legitimately be "in the future". Reporting -10s as an age is
    // just confusing to anyone reading the endpoint.
    const health = assessNodeHealth({ nodeHeight: 100, tipTime: NOW + 10, peerHeights: [100], now: NOW })
    expect(health.tipAgeSeconds).toBe(0)
    expect(health.status).toBe('ok')
  })

  it('never reports a negative lag', () => {
    const health = assessNodeHealth({ nodeHeight: 200, tipTime: FRESH, peerHeights: [100], now: NOW })
    expect(health.lagBlocks).toBe(0)
  })
})
