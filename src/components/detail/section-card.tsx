import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SectionCardProps {
  /** Optional section title rendered with an icon chip. */
  title?: string
  icon?: LucideIcon
  /** Optional element rendered on the right of the header (badge, count, action). */
  action?: React.ReactNode
  /** Render the body without inner padding (e.g. for full-bleed lists/tables). */
  flush?: boolean
  className?: string
  bodyClassName?: string
  children: React.ReactNode
}

/**
 * Flat rounded surface that replaces shadcn <Card> across detail/list pages.
 * Matches the home dashboard language: `rounded-xl border bg-muted/40`.
 */
export function SectionCard({
  title,
  icon: Icon,
  action,
  flush = false,
  className,
  bodyClassName,
  children,
}: SectionCardProps) {
  const hasHeader = Boolean(title || action)

  return (
    <section className={cn('rounded-xl border bg-muted/40', flush ? '' : 'p-4', className)}>
      {hasHeader ? (
        <header
          className={cn(
            'flex items-center justify-between gap-2',
            flush ? 'border-b px-4 py-3' : 'mb-3',
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            {Icon ? (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="size-4" />
              </span>
            ) : null}
            {title ? <h3 className="truncate text-sm font-semibold tracking-tight">{title}</h3> : null}
          </div>
          {action}
        </header>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}
