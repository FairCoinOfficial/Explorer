import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface RelativeTimeProps {
  /** Unix timestamp in seconds (as returned by the node RPC). */
  timestamp: number
  className?: string
}

/**
 * Relative "x minutes ago" label with the absolute local timestamp in a
 * native tooltip. Replaces raw `toLocaleString()` usage across detail pages.
 */
export function RelativeTime({ timestamp, className }: RelativeTimeProps) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return <span className={cn('tabular-nums text-muted-foreground', className)}>—</span>
  }

  const date = new Date(timestamp * 1000)

  return (
    <span className={cn('tabular-nums', className)} title={date.toLocaleString()}>
      {formatDistanceToNow(date, { addSuffix: true })}
    </span>
  )
}
