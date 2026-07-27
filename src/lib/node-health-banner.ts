/**
 * Should the page tell the visitor that the chain data may not be current?
 *
 * The server decides WHETHER the node is healthy (`/api/health`); this decides
 * whether that verdict is worth interrupting the visitor for. The distinction
 * matters: a node one block behind during normal propagation is not an outage,
 * and a banner that appears every few minutes teaches people to ignore it —
 * which leaves us exactly where we started, serving a frozen chain that looks
 * current.
 */

export type NodeHealthStatus = 'ok' | 'lagging' | 'stalled' | 'unknown'

export interface NodeHealthSummary {
  status: NodeHealthStatus
  lagBlocks: number
}

export interface HealthBannerDecision {
  tone: 'warning' | 'danger'
  /** Suffix of the `nodeHealth.*` translation key to render. */
  messageKey: 'lagging' | 'stalled' | 'unknown' | 'unreachable'
  lagBlocks: number
}

/** Blocks behind before an otherwise-healthy lag is worth mentioning. */
export const LAGGING_BANNER_THRESHOLD = 3

/**
 * @param health the parsed `/api/health` body, `null` when the endpoint could
 *   not be reached, or `undefined` while the first request is still in flight.
 */
export function decideHealthBanner(
  health: NodeHealthSummary | null | undefined,
): HealthBannerDecision | null {
  // Nothing known yet — say nothing rather than flash a warning on every load.
  if (health === undefined) {
    return null
  }

  // The health endpoint is the one thing that reports staleness; if it cannot be
  // reached we cannot claim the data is current.
  if (health === null) {
    return { tone: 'warning', messageKey: 'unreachable', lagBlocks: 0 }
  }

  switch (health.status) {
    case 'stalled':
      return { tone: 'danger', messageKey: 'stalled', lagBlocks: health.lagBlocks }
    case 'unknown':
      return { tone: 'warning', messageKey: 'unknown', lagBlocks: health.lagBlocks }
    case 'lagging':
      return health.lagBlocks >= LAGGING_BANNER_THRESHOLD
        ? { tone: 'warning', messageKey: 'lagging', lagBlocks: health.lagBlocks }
        : null
    default:
      return null
  }
}
