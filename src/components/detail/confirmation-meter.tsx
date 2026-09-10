import { CheckCircle2 } from 'lucide-react'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Confirmations at which a block/tx is treated as fully settled for the meter. */
const MATURE_CONFIRMATIONS = 100

/** Gradient fill for the meter: brand primary → bright accent. */
const PROGRESS_GRADIENT = 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))'

/**
 * Thin gradient meter mirroring the home supply bar: fills primary→accent and
 * caps at {@link MATURE_CONFIRMATIONS}, giving a tasteful read on how deeply a
 * block/tx is buried without overstating tiny counts. Shared by the block and
 * transaction detail heroes so both meters stay identical.
 */
export function ConfirmationMeter({
  confirmations,
  label,
  className,
}: {
  confirmations: number
  label: string
  className?: string
}) {
  const fraction = Math.min(Math.max(confirmations, 0) / MATURE_CONFIRMATIONS, 1)
  // Keep a sliver of fill visible for any confirmed block so it never reads empty.
  const fillWidth = confirmations > 0 ? Math.max(fraction * 100, 4) : 0
  const percent = Math.round(fraction * 1000) / 10

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 className="size-3" />
          {label}
        </span>
        <span className="tabular-nums">
          {formatNumber(confirmations)} / {formatNumber(MATURE_CONFIRMATIONS)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={label}
        className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="relative h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${fillWidth}%`, backgroundImage: PROGRESS_GRADIENT }}
        >
          {confirmations > 0 ? (
            <span className="absolute inset-y-0 right-0 w-1.5 rounded-full bg-accent" aria-hidden />
          ) : null}
        </div>
      </div>
    </div>
  )
}
