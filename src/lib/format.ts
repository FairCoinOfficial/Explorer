// Compact, locale-aware formatters shared across the home dashboard.

/** Abbreviate large numbers (e.g. 1.23M, 4.5K) with a sensible precision. */
export function formatCompactNumber(value: number, maximumFractionDigits = 2): string {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits,
  }).format(value)
}

/** Full grouped integer/decimal formatting (e.g. 11,790). */
export function formatNumber(value: number, maximumFractionDigits = 0): string {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value)
}

/** Human-readable byte sizes (e.g. 462 B, 1.2 KB, 3.4 MB). */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  return `${value.toFixed(value >= 100 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

/** Shorten a hash/txid for compact display (e.g. 49036643…e468e713). */
export function shortHash(hash: string, lead = 8, tail = 6): string {
  if (hash.length <= lead + tail + 1) return hash
  return `${hash.slice(0, lead)}…${hash.slice(-tail)}`
}

/** Format a USD price with adaptive precision for sub-dollar values. */
export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return '—'
  const fractionDigits = value > 0 && value < 1 ? 4 : 2
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}
