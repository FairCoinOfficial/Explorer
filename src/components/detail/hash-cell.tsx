import { Link } from 'react-router-dom'
import { CopyButton } from '@/components/copy-button'
import { shortHash } from '@/lib/format'
import { cn } from '@/lib/utils'

type HashLinkKind = 'tx' | 'block' | 'address'

interface HashCellProps {
  /** Full hash/txid/address string. Always the value copied to clipboard. */
  value: string
  /** Link target kind. Omit to render plain (non-link) text. */
  to?: HashLinkKind
  /** Render the full value (e.g. primary hash on a detail page) instead of truncating. */
  full?: boolean
  /** Leading chars kept when truncating. */
  lead?: number
  /** Trailing chars kept when truncating. */
  tail?: number
  /** Hide the hover copy button (e.g. inside a parent that already copies). */
  hideCopy?: boolean
  className?: string
  textClassName?: string
}

const ROUTE_PREFIX: Record<HashLinkKind, string> = {
  tx: '/tx/',
  block: '/block/',
  address: '/address/',
}

/**
 * Monospace hash display used everywhere hashes/addresses appear. Truncates with
 * `shortHash` by default, reveals a copy button on hover, and optionally links to
 * the relevant detail route.
 */
export function HashCell({
  value,
  to,
  full = false,
  lead = 8,
  tail = 6,
  hideCopy = false,
  className,
  textClassName,
}: HashCellProps) {
  const display = full ? value : shortHash(value, lead, tail)

  const textClasses = cn(
    'font-mono text-sm',
    full ? 'break-all' : 'truncate',
    to ? 'text-primary hover:underline' : 'text-foreground',
    textClassName,
  )

  const text = to ? (
    <Link to={`${ROUTE_PREFIX[to]}${value}`} className={cn('min-w-0', textClasses)} title={value}>
      {display}
    </Link>
  ) : (
    <span className={cn('min-w-0', textClasses)} title={value}>
      {display}
    </span>
  )

  return (
    <span className={cn('group/hash inline-flex min-w-0 items-center gap-1.5', className)}>
      {text}
      {hideCopy ? null : (
        <CopyButton
          text={value}
          className="size-6 shrink-0 opacity-0 transition-opacity group-hover/hash:opacity-100"
        />
      )}
    </span>
  )
}
