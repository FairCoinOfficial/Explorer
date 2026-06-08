import { useTranslations } from '@/lib/i18n'
import { useNetworkStats } from '@/hooks/use-network-stats'
import { NetworkStatus } from '@/components/network-status'
import { formatNumber } from '@/lib/format'

export function HomeHeader() {
  const t = useTranslations('home')
  const { data } = useNetworkStats()

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t('title')}</h1>
          <LivePill phase={data?.phase} height={data?.blockHeight} label={t('live')} />
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
  phase: string | undefined
  height: number | undefined
  label: string
}

function LivePill({ phase, height, label }: LivePillProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-primary" />
      </span>
      {label}
      {phase && <span className="opacity-70">· {phase}</span>}
      {typeof height === 'number' && (
        <span className="tabular-nums opacity-70">· #{formatNumber(height)}</span>
      )}
    </span>
  )
}
