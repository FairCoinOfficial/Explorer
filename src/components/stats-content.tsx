import { useMemo } from 'react'
import {
  Activity,
  AlertTriangle,
  Clock,
  Coins,
  Database,
  Flame,
  Gauge,
  Hash,
  Link2,
  PieChart,
  Shield,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { useStats } from '@/hooks/use-stats'
import { useStatsHistory } from '@/hooks/use-stats-history'
import { useNetwork } from '@/contexts/network-context'
import { computeSupplyInfo } from '@/lib/supply'
import { formatBytes, formatCompactNumber, formatNumber } from '@/lib/format'
import { DetailHeader } from '@/components/detail/detail-header'
import { SectionCard } from '@/components/detail/section-card'
import { StatTile, StatTileGrid } from '@/components/detail/stat-tile'
import { InfoGrid, InfoRow } from '@/components/detail/info-row'
import { HashCell } from '@/components/detail/hash-cell'
import { RelativeTime } from '@/components/detail/relative-time'
import { Sparkline } from '@/components/home/sparkline'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

type Translate = (key: string, params?: Record<string, string | number>) => string

/** A series needs at least two points before a sparkline reads as a trend. */
const MIN_SPARK_POINTS = 2

/** Gradient fill for the supply progress bar: brand primary → bright accent. */
const SUPPLY_BAR_GRADIENT = 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))'

export function StatsContent() {
  const t = useTranslations('stats')
  const common = useTranslations('common')
  const { currentNetwork } = useNetwork()
  const { data: stats, isLoading, isError, error, refetch, isFetching } = useStats()
  const { data: statsHistory } = useStatsHistory({ network: currentNetwork })

  // Per-metric background series from the mainnet-only sampled history. Series shorter than
  // MIN_SPARK_POINTS are dropped so the tile renders clean (never a placeholder).
  const sparks = useMemo(() => {
    const points = statsHistory ?? []
    if (points.length < MIN_SPARK_POINTS) {
      return { difficulty: undefined, connections: undefined } as const
    }
    return {
      difficulty: points.map((point) => point.difficulty),
      connections: points.map((point) => point.connections),
    } as const
  }, [statsHistory])

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
            <Activity className="size-3 animate-pulse" />
            {phaseLabel}
          </span>
        }
      />

      {/* Supply hero — premium gradient bar + halving sub-stats, ambient line. */}
      <SupplyHero supply={supply} t={t} />

      {/* Primary metrics — height + the time-varying tiles get ambient sparklines. */}
      <StatTileGrid>
        <StatTile
          icon={Database}
          label={t('blockHeight')}
          value={formatNumber(stats.blockHeight)}
          hint={t('currentBlockchainHeight')}
        />
        <MetricTile
          icon={Gauge}
          label={t('difficulty')}
          value={formatCompactNumber(stats.difficulty)}
          hint={stats.difficulty.toFixed(6)}
          spark={sparks.difficulty}
        />
        <MetricTile
          icon={Link2}
          label={t('connections')}
          value={formatNumber(stats.connections)}
          hint={t('peerConnections')}
          spark={sparks.connections}
        />
        <StatTile
          icon={Clock}
          label={t('blockTime')}
          value={`${Math.round(stats.avgBlockTime)}s`}
          hint={t('averageBlockTime')}
        />
      </StatTileGrid>

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

/**
 * Premium supply panel mirroring the home `SupplyBar`: an ambient supply-growth
 * sparkline behind a hero figure, a thick gradient progress bar with a bright
 * accent leading edge, and a responsive grid of halving sub-stats.
 */
function SupplyHero({
  supply,
  t,
}: {
  supply: ReturnType<typeof computeSupplyInfo>
  t: Translate
}) {
  const percent = supply.fraction * 100
  // Keep the fill visible even at very low fractions so the bar never reads empty.
  const fillWidth = Math.min(Math.max(percent, 1.5), 100)

  const subStats: { key: string; icon: LucideIcon; label: string; value: string }[] = [
    { key: 'reward', icon: Coins, label: t('blockReward'), value: `${supply.currentReward} FAIR` },
    { key: 'halvings', icon: Flame, label: t('halvings'), value: formatNumber(supply.halvings) },
    {
      key: 'nextHalving',
      icon: TrendingUp,
      label: t('nextHalving'),
      value: `#${formatNumber(supply.nextHalvingHeight)}`,
    },
    {
      key: 'blocksRemaining',
      icon: Clock,
      label: t('blocksRemaining'),
      value: formatNumber(supply.blocksToNextHalving),
    },
  ]

  return (
    <section className="relative overflow-hidden rounded-xl border bg-muted/40 p-4 transition-colors hover:bg-muted/50 sm:p-5">
      <header className="relative mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
            <PieChart className="size-4" />
          </span>
          <h3 className="text-sm font-semibold tracking-tight">{t('supplyEconomics')}</h3>
        </div>
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium tabular-nums text-primary">
          {t('supplyProgress', { percentage: percent.toFixed(2) })}
        </span>
      </header>

      {/* Hero figure: precise circulating supply against the compact hard cap. */}
      <div className="relative flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
          {formatNumber(supply.circulating)}
        </span>
        <span className="text-sm font-medium text-muted-foreground">
          / {formatCompactNumber(supply.max)} FAIR {t('max')}
        </span>
      </div>

      {/* Thicker gradient progress bar with a bright accent leading edge. */}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent * 10) / 10}
        aria-label={t('supplyEconomics')}
        className="relative mt-3 h-3 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="relative h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${fillWidth}%`, backgroundImage: SUPPLY_BAR_GRADIENT }}
        >
          <span className="absolute inset-y-0 right-0 w-1.5 rounded-full bg-accent" aria-hidden />
        </div>
      </div>

      <div className="relative mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
        <span>0 FAIR</span>
        <span>
          {formatNumber(supply.max)} FAIR ({t('max')})
        </span>
      </div>

      {/* Sub-stats grid: stat-strip tile look, responsive 2 → 4 columns. */}
      <dl className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {subStats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.key}
              className="flex flex-col gap-1 rounded-xl bg-muted/60 px-3 py-2.5 transition-colors hover:bg-muted/80"
            >
              <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <Icon className="size-3.5 shrink-0" />
                <span className="truncate">{stat.label}</span>
              </dt>
              <dd className="truncate text-base font-semibold tabular-nums">{stat.value}</dd>
            </div>
          )
        })}
      </dl>
    </section>
  )
}

interface MetricTileProps {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
  /** Background series for time-varying metrics; too-short series render clean. */
  spark?: number[]
}

/**
 * A {@link StatTile}-styled metric tile that paints a subtle, non-interactive
 * background sparkline for values that change over time (Difficulty, Connections).
 * Falls back to a clean tile until enough history has accumulated.
 */
function MetricTile({ icon: Icon, label, value, hint, spark }: MetricTileProps) {
  const hasSpark = Boolean(spark && spark.length >= MIN_SPARK_POINTS)

  return (
    <div className="relative flex flex-col gap-1 overflow-hidden rounded-xl bg-muted/60 px-3 py-2.5 transition-colors hover:bg-muted/80">
      {hasSpark && spark ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 opacity-25">
          <Sparkline data={spark} />
        </div>
      ) : null}
      <div className="relative flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <span className="relative truncate text-base font-semibold tabular-nums">{value}</span>
      {hint ? (
        <span className="relative truncate text-[11px] text-muted-foreground tabular-nums">{hint}</span>
      ) : null}
    </div>
  )
}

function formatHashrate(hashrate: number, t: Translate): string {
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
      <Skeleton className="h-52 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  )
}
