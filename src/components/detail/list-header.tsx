import { RefreshCw } from 'lucide-react'
import { NetworkStatus } from '@/components/network-status'
import { Button } from '@/components/ui/button'
import { useTranslations } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface ListHeaderProps {
  title: string
  subtitle?: string
  /** Optional badge/control rendered between the network status and refresh button. */
  badge?: React.ReactNode
  onRefresh?: () => void
  isRefreshing?: boolean
  className?: string
}

/**
 * Shared header for list pages (e.g. blocks): title + subtitle on the left, the
 * network status, an optional badge (height/count), and a refresh button.
 */
export function ListHeader({
  title,
  subtitle,
  badge,
  onRefresh,
  isRefreshing = false,
  className,
}: ListHeaderProps) {
  const common = useTranslations('common')

  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <h2 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
        {subtitle ? <p className="text-sm text-muted-foreground sm:text-base">{subtitle}</p> : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 self-start">
        <NetworkStatus />
        {badge}
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
