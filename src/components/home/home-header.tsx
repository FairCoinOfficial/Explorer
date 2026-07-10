import { useTranslations } from '@/lib/i18n'
import { useNetworkStats } from '@/hooks/use-network-stats'
import { useLiveMode, type LiveMode } from '@/contexts/blockchain-context'
import { NetworkStatus } from '@/components/network-status'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

export function HomeHeader() {
  const t = useTranslations('home')
  const { data } = useNetworkStats()
  const mode = useLiveMode()

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t('title')}</h1>
          <LivePill
            mode={mode}
            phase={data?.phase}
            height={data?.blockHeight}
            label={
              mode === 'live' ? t('live') : mode === 'polling' ? t('polling') : t('offline')
            }
          />
        </div>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <NetworkStatus />
      </div>
    </div>
  )
}

interface LivePillProps {
  mode: LiveMode
  phase: string | undefined
  height: number | undefined
  label: string
}

function LivePill({ mode, phase, height, label }: LivePillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        mode === 'live' && 'bg-primary/10 text-primary',
        mode === 'polling' && 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
        mode === 'offline' && 'bg-destructive/10 text-destructive',
      )}
    >
      <span
        className={cn(
          'size-2 rounded-full',
          mode === 'live' && 'bg-primary',
          mode === 'polling' && 'bg-amber-500',
          mode === 'offline' && 'bg-destructive',
        )}
      />
      {label}
      {phase ? <span className="opacity-70">· {phase}</span> : null}
      {typeof height === 'number' ? (
        <span className="tabular-nums opacity-70">· #{formatNumber(height)}</span>
      ) : null}
    </span>
  )
}
