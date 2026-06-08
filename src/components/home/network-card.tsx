import { Network, ArrowRight } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { useNetworkStats } from '@/hooks/use-network-stats'
import { usePeersCount } from '@/hooks/use-peers-count'
import { ModuleCard } from '@/components/home/module-card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber } from '@/lib/format'

export function NetworkCard() {
  const t = useTranslations('home')
  const stats = useNetworkStats()
  const peers = usePeersCount()

  const phase = stats.data?.phase ?? null
  const nextPhase = phase === 'PoW' ? 'PoS' : null

  const action = phase ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
      {phase}
      {nextPhase && (
        <>
          <ArrowRight className="size-3" />
          {nextPhase}
        </>
      )}
    </span>
  ) : undefined

  return (
    <ModuleCard
      title={t('networkTitle')}
      icon={Network}
      action={action}
      href="/network-status"
      footerLabel={t('networkViewStatus')}
    >
      {stats.isLoading ? (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : (
        <dl className="grid flex-1 grid-cols-2 gap-2">
          <NetworkStat label={t('networkConnections')} value={formatNumber(stats.data?.connections ?? 0)} />
          <NetworkStat
            label={t('networkPeers')}
            value={peers.data ? formatNumber(peers.data.total) : '—'}
            hint={peers.data ? t('networkPeersSplit', {
              in: formatNumber(peers.data.inbound),
              out: formatNumber(peers.data.outbound),
            }) : undefined}
          />
          <NetworkStat label={t('networkMasternodes')} value={formatNumber(stats.data?.masternodeCount ?? 0)} />
          <NetworkStat label={t('networkPhase')} value={phase ?? '—'} accent />
        </dl>
      )}
    </ModuleCard>
  )
}

interface NetworkStatProps {
  label: string
  value: string
  hint?: string
  accent?: boolean
}

function NetworkStat({ label, value, hint, accent }: NetworkStatProps) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-muted/50 px-3 py-2">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={`text-lg font-semibold tabular-nums ${accent ? 'text-primary' : ''}`}>{value}</dd>
      {hint && <span className="text-[11px] text-muted-foreground tabular-nums">{hint}</span>}
    </div>
  )
}
