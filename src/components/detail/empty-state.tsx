import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  /** Optional secondary line under the title. */
  description?: string
  /** Optional action (e.g. a retry button) rendered under the text. */
  action?: React.ReactNode
  /**
   * Chip tint. `primary` (default) is the finished empty look (ringed brand
   * chip); `muted` is calmer; `destructive` is for error states.
   */
  tone?: 'primary' | 'muted' | 'destructive'
  className?: string
}

const TONE: Record<NonNullable<EmptyStateProps['tone']>, string> = {
  primary: 'bg-primary/10 text-primary ring-8 ring-primary/5',
  muted: 'bg-muted text-muted-foreground',
  destructive: 'bg-destructive/10 text-destructive',
}

/**
 * Canonical empty/placeholder state for list bodies and cards: a chip icon over
 * a title and optional description, with an optional action. One shape so
 * "nothing here" reads the same on every surface.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = 'primary',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[160px] flex-col items-center justify-center gap-3 px-4 py-10 text-center',
        className,
      )}
    >
      <span className={cn('flex size-14 items-center justify-center rounded-full', TONE[tone])}>
        <Icon className="size-6" />
      </span>
      <div className="space-y-0.5">
        <p className="text-sm font-semibold">{title}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
