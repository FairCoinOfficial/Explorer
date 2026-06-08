import { cn } from '@/lib/utils'

interface ProgressBarProps {
  /** Progress fraction in the 0..1 range; clamped automatically. */
  value: number
  /** Accessible label for the progress bar. */
  label?: string
  className?: string
}

/**
 * Token-colored progress bar used for supply/quota visualisations. The track is
 * a muted surface and the fill uses the primary brand color so it stays on-theme
 * in both light and dark modes.
 */
export function ProgressBar({ value, label, className }: ProgressBarProps) {
  const fraction = Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0
  const percent = Math.round(fraction * 1000) / 10

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label={label}
      className={cn('h-2.5 w-full overflow-hidden rounded-full bg-muted/40', className)}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
        style={{ width: `${fraction * 100}%` }}
      />
    </div>
  )
}
