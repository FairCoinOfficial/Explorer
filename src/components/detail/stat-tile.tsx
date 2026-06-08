import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatTileProps {
  label: string
  value: string
  icon: LucideIcon
  /** Optional secondary line beneath the value (e.g. raw byte count). */
  hint?: string
  /** Tint the value with the primary color (e.g. phase, fees). */
  accent?: boolean
  className?: string
}

/**
 * Summary metric tile for detail pages (tx/block/address). Standalone copy of the
 * home stat-strip tile styling so the home component can evolve independently.
 */
export function StatTile({ label, value, icon: Icon, hint, accent, className }: StatTileProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-xl bg-muted/60 px-3 py-2.5 transition-colors hover:bg-muted/80',
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <span className={cn('truncate text-base font-semibold tabular-nums', accent && 'text-primary')}>
        {value}
      </span>
      {hint ? <span className="truncate text-[11px] text-muted-foreground tabular-nums">{hint}</span> : null}
    </div>
  )
}

interface StatTileGridProps {
  className?: string
  children: React.ReactNode
}

/** Responsive grid for {@link StatTile}s; 2 cols on mobile up to 4 on desktop. */
export function StatTileGrid({ className, children }: StatTileGridProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-2 lg:grid-cols-4', className)}>{children}</div>
  )
}
