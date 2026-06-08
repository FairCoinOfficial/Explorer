import { RefreshCw } from 'lucide-react'
import { NetworkStatus } from '@/components/network-status'
import { Button } from '@/components/ui/button'
import { useTranslations } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface DetailHeaderProps {
  title: string
  subtitle?: string
  /** React Query refetch handler wired to the refresh button. */
  onRefresh?: () => void
  /** Disable the refresh button + show the spinning indicator while fetching. */
  isRefreshing?: boolean
  /** Optional extra controls rendered before the refresh button (e.g. a badge). */
  action?: React.ReactNode
  className?: string
}

/**
 * Shared header for detail pages (tx/block/address): title + subtitle on the left,
 * network status, optional action, and a refresh button on the right.
 */
export function DetailHeader({
  title,
  subtitle,
  onRefresh,
  isRefreshing = false,
  action,
  className,
}: DetailHeaderProps) {
  const common = useTranslations('common')

  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <h2 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
        {subtitle ? <p className="text-sm text-muted-foreground sm:text-base">{subtitle}</p> : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 self-start sm:self-auto">
        <NetworkStatus />
        {action}
        {onRefresh ? (
          <Button
            onClick={onRefresh}
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            aria-label={common('refresh')}
            className="gap-2"
          >
            <RefreshCw className={cn('size-4', isRefreshing && 'animate-spin')} />
            <span className="hidden sm:inline">{common('refresh')}</span>
          </Button>
        ) : null}
      </div>
    </div>
  )
}
