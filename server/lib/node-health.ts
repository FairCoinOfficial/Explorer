/**
 * Node health — is the tip we are serving still the chain's tip?
 *
 * The explorer reads everything from one faircoind over RPC. When that node
 * stops following the chain the RPC keeps answering perfectly, so every endpoint
 * keeps returning 200 with a frozen height and nothing looks wrong. That is how
 * a node parked 80+ blocks behind went unnoticed for over an hour: the site was
 * confidently serving a stale chain.
 *
 * Two signals, with very different trust levels:
 *
 *  - `getblockchaininfo.headers` — the height of the most-WORK header our own
 *    node has validated (`pindexBestHeader`). If it is above `blocks`, a heavier
 *    chain exists and we have not connected it yet: we are genuinely behind.
 *
 *  - Peer heights from `getpeerinfo` (`startingheight`, `synced_headers`). These
 *    are only heights, not work. `startingheight` is whatever the peer chose to
 *    say in its version message, and on a PoS chain a minority fork with fewer
 *    stakers can easily be *taller* than the heavier chain. Since 2026-09-24 a
 *    public peer on such a fork (≈200 blocks taller, ~4× lower difficulty) made
 *    this endpoint report "lagging" permanently while the node was healthy and on
 *    the heavier chain — and the site showed a "catching up" banner to everyone.
 *
 * So: when the tip is fresh, only work-backed lag counts. Peer heights are kept
 * for the case they are good at — a cold tip, where the node has stopped hearing
 * about new blocks at all and its own header view is frozen too.
 */

/** A tip older than this is cold. Target spacing is 120s; this is ~7 blocks. */
export const STALE_TIP_SECONDS = 900

export interface NodeHealthInput {
  /** Height of the node's active chain. */
  nodeHeight: number
  /**
   * Height of the node's most-work validated header (`getblockchaininfo.headers`).
   * `-1` / non-finite when unavailable.
   */
  bestHeaderHeight: number
  /** Unix seconds of the tip block's timestamp. */
  tipTime: number
  /**
   * Heights peers claim (`startingheight`, `synced_headers`). Height only — not
   * work — so they may describe a different branch. `-1` (not yet known) is ignored.
   */
  peerHeights: number[]
  /** Unix seconds now. */
  now: number
}

export type NodeHealthStatus =
  /** Serving the chain tip, as far as anyone we can see knows. */
  | 'ok'
  /** Our node knows a heavier chain but has not connected it yet; tip still recent. */
  | 'lagging'
  /** Our tip is cold AND something is ahead: we have stopped following the chain. */
  | 'stalled'
  /** Tip is cold and no peer height is known, so health cannot be established. */
  | 'unknown'

export interface NodeHealth {
  status: NodeHealthStatus
  nodeHeight: number
  /** The best height we have reason to believe is the chain tip. */
  networkHeight: number
  /** How far behind `networkHeight` we are; never negative. */
  lagBlocks: number
  tipAgeSeconds: number
  /**
   * Tallest height any peer claims, for diagnostics. When it exceeds
   * `networkHeight` with a fresh tip, that peer is on another branch (or lying);
   * it is reported, not acted on.
   */
  peerReportedHeight: number
}

function knownHeights(heights: number[]): number[] {
  // Peers report -1 until the handshake settles; those carry no information.
  return heights.filter((height) => Number.isFinite(height) && height >= 0)
}

export function assessNodeHealth(input: NodeHealthInput): NodeHealth {
  const { nodeHeight, bestHeaderHeight, tipTime, peerHeights, now } = input

  const knownPeerHeights = knownHeights(peerHeights)
  const peerReportedHeight = Math.max(nodeHeight, ...knownPeerHeights)
  const headerHeight = Number.isFinite(bestHeaderHeight) ? bestHeaderHeight : -1
  // Lag our own node has validated: a heavier header chain it has not connected.
  const workLag = Math.max(0, headerHeight - nodeHeight)
  // Lag peers merely claim. Height only; may be a different branch.
  const claimedLag = Math.max(0, peerReportedHeight - nodeHeight)

  // PoS blocks are accepted with timestamps slightly ahead of local time, so a
  // fresh tip can sit in the future; a negative "age" is meaningless to report.
  const tipAgeSeconds = Math.max(0, now - tipTime)
  const tipIsCold = tipAgeSeconds > STALE_TIP_SECONDS

  const result = (status: NodeHealthStatus, lagBlocks: number): NodeHealth => ({
    status,
    nodeHeight,
    networkHeight: nodeHeight + lagBlocks,
    lagBlocks,
    tipAgeSeconds,
    peerReportedHeight,
  })

  if (!tipIsCold) {
    // The node is still receiving and connecting blocks. A taller peer with no
    // heavier header behind it is on another branch — not a reason to warn.
    return workLag > 0 ? result('lagging', workLag) : result('ok', 0)
  }

  // Cold tip: the node may have stopped hearing about blocks entirely, so its
  // own header view can be frozen too. Any sign of a longer chain means stalled.
  const lag = Math.max(workLag, claimedLag)
  if (lag > 0) {
    return result('stalled', lag)
  }

  // Nobody is ahead of us. A cold tip with no peer heights at all is the one case
  // we must not call healthy: there is simply nothing to compare against.
  if (knownPeerHeights.length === 0) {
    return result('unknown', 0)
  }

  return result('ok', 0)
}
