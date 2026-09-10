import { describe, expect, it } from 'vitest'
import { decideHealthBanner, LAGGING_BANNER_THRESHOLD } from './node-health-banner'

/**
 * The banner is the user-facing half of /api/health: it exists so a visitor is
 * never shown a frozen chain that looks current. It must be loud when we are
 * demonstrably behind and silent otherwise — a banner that cries wolf during
 * ordinary block propagation gets ignored, which is the same failure as not
 * having one.
 */

describe('decideHealthBanner', () => {
  it('says nothing when the node is on the chain tip', () => {
    expect(decideHealthBanner({ status: 'ok', lagBlocks: 0 })).toBeNull()
  })

  it('says nothing while the health of the node is still unknown to the page', () => {
    expect(decideHealthBanner(undefined)).toBeNull()
  })

  it('stays silent for a one-block lag, which is ordinary propagation', () => {
    expect(decideHealthBanner({ status: 'lagging', lagBlocks: 1 })).toBeNull()
  })

  it('warns once the lag grows past the threshold', () => {
    const decision = decideHealthBanner({ status: 'lagging', lagBlocks: LAGGING_BANNER_THRESHOLD })
    expect(decision).not.toBeNull()
    expect(decision?.tone).toBe('warning')
    expect(decision?.messageKey).toBe('lagging')
  })

  it('raises a danger banner when the node has stopped following the chain', () => {
    const decision = decideHealthBanner({ status: 'stalled', lagBlocks: 69 })
    expect(decision?.tone).toBe('danger')
    expect(decision?.messageKey).toBe('stalled')
    expect(decision?.lagBlocks).toBe(69)
  })

  it('warns when health cannot be established rather than staying silent', () => {
    const decision = decideHealthBanner({ status: 'unknown', lagBlocks: 0 })
    expect(decision?.tone).toBe('warning')
    expect(decision?.messageKey).toBe('unknown')
  })

  it('warns when the health endpoint itself cannot be reached', () => {
    const decision = decideHealthBanner(null)
    expect(decision?.tone).toBe('warning')
    expect(decision?.messageKey).toBe('unreachable')
  })
})
