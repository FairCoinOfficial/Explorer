/**
 * Node health — is the tip we are serving still the chain's tip?
 *
 * The explorer reads everything from one faircoind over RPC. When that node
 * stops following the chain the RPC keeps answering perfectly, so every endpoint
 * keeps returning 200 with a frozen height and nothing looks wrong. That is how
 * a node parked 80+ blocks behind went unnoticed for over an hour: the site was
 * confidently serving a stale chain.
 *
 * The only local signal that can catch it is the peers' own heights, which the
 * node already reports (`getpeerinfo` → `synced_headers` / `startingheight`).
 * If somebody we are connected to has more chain than we do and our tip has gone
 * cold, we are the problem — not the network.
 */

/** A tip older than this is cold. Target spacing is 120s; this is ~7 blocks. */
export const STALE_TIP_SECONDS = 900

export interface NodeHealthInput {
  /** Height of the node's active chain. */
  nodeHeight: number
  /** Unix seconds of the tip block's timestamp. */
  tipTime: number
  /** Heights reported by connected peers. `-1` (not yet known) is ignored. */
  peerHeights: number[]
  /** Unix seconds now. */
  now: number
}

export type NodeHealthStatus =
  /** Serving the chain tip, as far as anyone we can see knows. */
  | 'ok'
  /** A peer is ahead but our tip is recent — ordinary propagation delay. */
  | 'lagging'
  /** A peer is ahead AND our tip is cold: we have stopped following the chain. */
  | 'stalled'
  /** Tip is cold and no peer height is known, so health cannot be established. */
  | 'unknown'

export interface NodeHealth {
  status: NodeHealthStatus
  nodeHeight: number
  /** The best height anyone (us included) is known to have. */
  networkHeight: number
  /** How far behind `networkHeight` we are; never negative. */
  lagBlocks: number
  tipAgeSeconds: number
}

export function assessNodeHealth(input: NodeHealthInput): NodeHealth {
  const { nodeHeight, tipTime, peerHeights, now } = input

  // Peers report -1 until the handshake settles; those carry no information.
  const knownPeerHeights = peerHeights.filter((height) => Number.isFinite(height) && height >= 0)
  const networkHeight = Math.max(nodeHeight, ...knownPeerHeights)
  const lagBlocks = Math.max(0, networkHeight - nodeHeight)
  // PoS blocks are accepted with timestamps slightly ahead of local time, so a
  // fresh tip can sit in the future; a negative "age" is meaningless to report.
  const tipAgeSeconds = Math.max(0, now - tipTime)
  const tipIsCold = tipAgeSeconds > STALE_TIP_SECONDS

  if (lagBlocks > 0) {
    return { status: tipIsCold ? 'stalled' : 'lagging', nodeHeight, networkHeight, lagBlocks, tipAgeSeconds }
  }

  // Nobody is ahead of us. A cold tip with no peer heights at all is the one case
  // we must not call healthy: there is simply nothing to compare against.
  if (tipIsCold && knownPeerHeights.length === 0) {
    return { status: 'unknown', nodeHeight, networkHeight, lagBlocks, tipAgeSeconds }
  }

  return { status: 'ok', nodeHeight, networkHeight, lagBlocks, tipAgeSeconds }
}
