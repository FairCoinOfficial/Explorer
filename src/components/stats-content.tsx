import {
  Activity,
  AlertTriangle,
  Clock,
  Coins,
  Database,
  Flame,
  Hash,
  Link2,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { useStats } from '@/hooks/use-stats'
import { computeSupplyInfo } from '@/lib/supply'
import { formatBytes, formatNumber } from '@/lib/format'
import { DetailHeader } from '@/components/detail/detail-header'
import { SectionCard } from '@/components/detail/section-card'
import { StatTile, StatTileGrid } from '@/components/detail/stat-tile'
import { InfoGrid, InfoRow } from '@/components/detail/info-row'
import { HashCell } from '@/components/detail/hash-cell'
import { RelativeTime } from '@/components/detail/relative-time'
import { ProgressBar } from '@/components/detail/progress-bar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export function StatsContent() {
  const t = useTranslations('stats')
  const common = useTranslations('common')
  const { data: stats, isLoading, isError, error, refetch, isFetching } = useStats()

  if (isLoading) {
    return <StatsSkeleton />
  }

  if (isError || !stats) {
    return (
      <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
        <DetailHeader
          title={t('title')}
          subtitle={t('subtitle')}
          onRefresh={() => void refetch()}
          isRefreshing={isFetching}
        />
        <SectionCard>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="size-6" />
            </span>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : t('error')}
            </p>
            <Button variant="outline" onClick={() => void refetch()}>
              {common('tryAgain')}
            </Button>
          </div>
        </SectionCard>
      </div>
    )
  }

  const supply = computeSupplyInfo(stats.blockHeight)
  const phaseLabel = t('phase', { phase: stats.phase })

  return (
    <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
      <DetailHeader
        title={t('title')}
        subtitle={t('subtitle')}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching}
        action={
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <Activity className="size-3" />
            {phaseLabel}
          </span>
        }
      />

      {/* Primary metrics */}
      <StatTileGrid>
        <StatTile
          icon={Database}
          label={t('blockHeight')}
          value={formatNumber(stats.blockHeight)}
          hint={t('currentBlockchainHeight')}
        />
        <StatTile
          icon={Coins}
          label={t('circulatingSupply')}
          value={`${formatNumber(supply.circulating)} FAIR`}
          hint={t('supplyProgress', { percentage: (supply.fraction * 100).toFixed(2) })}
          accent
        />
        <StatTile
          icon={Clock}
          label={t('blockTime')}
          value={`${Math.round(stats.avgBlockTime)}s`}
          hint={t('averageBlockTime')}
        />
        <StatTile
          icon={Link2}
          label={t('connections')}
          value={formatNumber(stats.connections)}
          hint={t('peerConnections')}
        />
      </StatTileGrid>

      {/* Supply economics */}
      <SectionCard title={t('supplyEconomics')} icon={Coins}>
        <div className="space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium">{t('mintedSupply')}</span>
            <span className="text-sm font-semibold tabular-nums">
              {formatNumber(supply.circulating)} / {formatNumber(supply.max)} FAIR
            </span>
          </div>
          <ProgressBar value={supply.fraction} label={t('supplyEconomics')} />
          <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
            <span>0 FAIR</span>
            <span>
              {t('supplyProgress', { percentage: (supply.fraction * 100).toFixed(2) })}
            </span>
            <span>
              {formatNumber(supply.max)} FAIR ({t('max')})
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1 sm:grid-cols-4">
            <SupplyMetric
              icon={Coins}
              label={t('blockReward')}
              value={`${supply.currentReward} FAIR`}
            />
            <SupplyMetric icon={Flame} label={t('halvings')} value={formatNumber(supply.halvings)} />
            <SupplyMetric
              icon={TrendingUp}
              label={t('nextHalving')}
              value={`#${formatNumber(supply.nextHalvingHeight)}`}
            />
            <SupplyMetric
              icon={Clock}
              label={t('blocksRemaining')}
              value={formatNumber(supply.blocksToNextHalving)}
            />
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Network information */}
        <SectionCard title={t('networkInformation')} icon={Database}>
          <InfoGrid columns={2}>
            <InfoRow label={t('difficulty')} value={stats.difficulty.toFixed(6)} mono />
            <InfoRow label={t('hashRate')} value={formatHashrate(stats.hashrate, t)} mono />
            <InfoRow label={t('masternodes')} value={formatNumber(stats.masternodeCount)} />
            <InfoRow label={t('connections')} value={formatNumber(stats.connections)} />
          </InfoGrid>
        </SectionCard>

        {/* Transaction statistics */}
        <SectionCard title={t('transactionStatistics')} icon={Hash}>
          <InfoGrid columns={2}>
            <InfoRow label={t('totalTransactions')} value={formatNumber(stats.totalTransactions)} />
            <InfoRow
              label={t('avgTxPerBlock')}
              value={stats.avgTransactionsPerBlock.toFixed(1)}
            />
            <InfoRow label={t('mempool')} value={formatNumber(stats.memPoolSize)} />
            <InfoRow label={t('stakingRewards')} value={`${stats.stakingRewards} FAIR`} />
          </InfoGrid>
        </SectionCard>
      </div>

      {/* Latest block */}
      <SectionCard title={t('latestBlock')} icon={Shield}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Database className="size-4" />
            </span>
            <div className="min-w-0">
              <HashCell
                value={String(stats.lastBlock.height)}
                to="block"
                hideCopy
                textClassName="font-semibold"
              />
              <HashCell
                value={stats.lastBlock.hash}
                to="block"
                textClassName="text-xs text-muted-foreground"
              />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" />
              {formatBytes(stats.lastBlock.size)}
            </span>
            <RelativeTime timestamp={stats.lastBlock.time} />
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

function SupplyMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Coins
  label: string
  value: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-muted/40 px-3 py-2.5">
      <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      <span className="truncate text-sm font-semibold tabular-nums">{value}</span>
    </div>
  )
}

function formatHashrate(
  hashrate: number,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (!Number.isFinite(hashrate) || hashrate <= 0) return t('hashrateIdle')
  if (hashrate >= 1e12) return `${(hashrate / 1e12).toFixed(2)} TH/s`
  if (hashrate >= 1e9) return `${(hashrate / 1e9).toFixed(2)} GH/s`
  if (hashrate >= 1e6) return `${(hashrate / 1e6).toFixed(2)} MH/s`
  if (hashrate >= 1e3) return `${(hashrate / 1e3).toFixed(2)} KH/s`
  return `${hashrate.toFixed(0)} H/s`
}

function StatsSkeleton() {
  return (
    <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-44 w-full rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  )
}
