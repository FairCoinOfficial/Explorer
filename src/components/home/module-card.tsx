import { Link } from 'react-router-dom'
import { ArrowUpRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModuleCardProps {
  title: string
  icon: LucideIcon
  /** Optional element rendered on the right of the header (badge, change, etc.). */
  action?: React.ReactNode
  /** Internal route or external URL that the footer "more" link points to. */
  href?: string
  external?: boolean
  footerLabel?: string
  className?: string
  children: React.ReactNode
}

/**
 * Light bento-style container used for every home dashboard module.
 * Uses a muted surface instead of a hard Card to match the sidebar aesthetic.
 */
export function ModuleCard({
  title,
  icon: Icon,
  action,
  href,
  external,
  footerLabel,
  className,
  children,
}: ModuleCardProps) {
  return (
    <section
      className={cn(
        'flex h-full flex-col rounded-2xl border bg-muted/30 p-4 transition-colors hover:bg-muted/40',
        className,
      )}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        </div>
        {action}
      </header>

      <div className="flex flex-1 flex-col">{children}</div>

      {href && footerLabel ? (
        external ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary transition-opacity hover:opacity-80"
          >
            {footerLabel}
            <ArrowUpRight className="size-3" />
          </a>
        ) : (
          <Link
            to={href}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary transition-opacity hover:opacity-80"
          >
            {footerLabel}
            <ArrowUpRight className="size-3" />
          </Link>
        )
      ) : null}
    </section>
  )
}
