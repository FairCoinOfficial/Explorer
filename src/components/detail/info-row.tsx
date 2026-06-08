import { cn } from '@/lib/utils'

interface InfoRowProps {
  label: string
  /** String/number values render in tabular mono-friendly text; nodes render as-is. */
  value: React.ReactNode
  /** Render the value in a monospace face (hashes, hex, bits). */
  mono?: boolean
  className?: string
}

/**
 * A single label/value pair used in detail metadata grids. The label is an
 * uppercase muted micro-caption; the value sits directly below it.
 */
export function InfoRow({ label, value, mono = false, className }: InfoRowProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {typeof value === 'string' || typeof value === 'number' ? (
        <span className={cn('break-all text-sm tabular-nums', mono && 'font-mono')}>{value}</span>
      ) : (
        value
      )}
    </div>
  )
}

interface InfoGridProps {
  columns?: 1 | 2 | 3
  className?: string
  children: React.ReactNode
}

const GRID_COLS: Record<1 | 2 | 3, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
}

/** Responsive grid wrapper for {@link InfoRow}s inside a SectionCard. */
export function InfoGrid({ columns = 3, className, children }: InfoGridProps) {
  return <div className={cn('grid gap-x-6 gap-y-4', GRID_COLS[columns], className)}>{children}</div>
}
