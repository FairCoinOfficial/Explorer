import { DetailHeader } from '@/components/detail/detail-header'
import { HashCell } from '@/components/detail/hash-cell'
import { RelativeTime } from '@/components/detail/relative-time'
import { PageLoading } from '@/components/page-loading'
import { useNetwork } from '@/contexts/network-context'
import { useStats } from '@/hooks/use-stats'
import { useStatsHistory } from '@/hooks/use-stats-history'
import { formatBytes, formatCompactNumber, formatNumber } from '@/lib/format'
import { useTranslations } from '@/lib/i18n'
import { Card, CardBody, CardHeader, CardTitle } from '@oxy.so/bloom/card'
import {
  ChartHeader,
  ChartStatTiles,
  Sparkline,
} from '@oxy.so/bloom/chart-cards'
import { Code } from '@oxy.so/bloom/code'
import { EmptyState } from '@oxy.so/bloom/empty-state'
import { Item } from '@oxy.so/bloom/item'
import { StatBar } from '@oxy.so/bloom/stat-bar'
import { StatCard } from '@oxy.so/bloom/stat-cards'
import { computeSupplyInfo } from '@shared/supply'
import {
  Activity,
  AlertTriangle,
  Clock,
  Coins,
  Database,
  Flame,
  Gauge,
  Link2,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useMemo } from 'react'
import { View } from 'react-native'

type Translate = (
  key: string,
  params?: Record<string, string | number>,
) => string

/** A series needs at least two points before a sparkline reads as a trend. */
const MIN_SPARK_POINTS = 2

/** Gradient fill for the supply progress bar: brand primary → bright accent. */

export function StatsContent() {
  const t = useTranslations('stats')
  const common = useTranslations('common')
  const { currentNetwork } = useNetwork()
  const {
    data: stats,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useStats()
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
    return <PageLoading />
  }

  if (isError || !stats) {
    return (
      <View style={{ gap: 16 }}>
        <DetailHeader
          title={t('title')}
          subtitle={t('subtitle')}
          onRefresh={() => void refetch()}
          isRefreshing={isFetching}
        />
        <Card>
          <CardBody>
            <EmptyState
              variant="compact"
              title={common('error')}
              description={error instanceof Error ? error.message : t('error')}
              illustration={<AlertTriangle size={28} />}
              action={{
                label: common('tryAgain'),
                onPress: () => void refetch(),
              }}
            />
          </CardBody>
        </Card>
      </View>
    )
  }

  const supply = computeSupplyInfo(stats.blockHeight)
  const phaseLabel = t('phase', { phase: stats.phase })

  return (
    <View style={{ gap: 16 }}>
      <DetailHeader
        title={t('title')}
        subtitle={t('subtitle')}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching}
        action={
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
            <Activity className="size-3 animate-pulse" />
            {phaseLabel}
          </span>
        }
      />

      {currentNetwork !== 'mainnet' ? (
        <Card clipContent>
          <div className="flex items-start gap-2 px-4 py-3 text-sm text-muted-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{t('mainnetHistoryOnly')}</span>
          </div>
        </Card>
      ) : null}

      <SupplyHero supply={supply} t={t} />

      {/* Primary metrics — height + the time-varying tiles get ambient sparklines. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          stat={{
            label: t('blockHeight'),
            value: formatNumber(stats.blockHeight),
            icon: (props) => (
              <Database
                width={props.width}
                height={props.height}
                color={props.fill}
              />
            ),
            delta: '—',
            deltaColor: 'neutral',
            hint: t('currentBlockchainHeight'),
          }}
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
        <StatCard
          stat={{
            label: t('blockTime'),
            value: `${Math.round(stats.avgBlockTime)}s`,
            icon: (props) => (
              <Clock
                width={props.width}
                height={props.height}
                color={props.fill}
              />
            ),
            delta: '—',
            deltaColor: 'neutral',
            hint: t('averageBlockTime'),
          }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Network information */}
        <Card>
          <CardHeader>
            <CardTitle>{t('networkInformation')}</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <Item
                density="compact"
                title={t('difficulty')}
                subtitle={<Code>{stats.difficulty.toFixed(6)}</Code>}
              />
              <Item
                density="compact"
                title={t('hashRate')}
                subtitle={<Code>{formatHashrate(stats.hashrate, t)}</Code>}
              />
              <Item
                density="compact"
                title={t('masternodes')}
                subtitle={formatNumber(stats.masternodeCount)}
              />
              <Item
                density="compact"
                title={t('connections')}
                subtitle={formatNumber(stats.connections)}
              />
            </div>
          </CardBody>
        </Card>

        {/* Transaction statistics */}
        <Card>
          <CardHeader>
            <CardTitle>{t('transactionStatistics')}</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <Item
                density="compact"
                title={t('totalTransactionsEstimated')}
                subtitle={formatNumber(stats.totalTransactions)}
              />
              <Item
                density="compact"
                title={t('avgTxPerBlock')}
                subtitle={stats.avgTransactionsPerBlock.toFixed(1)}
              />
              <Item
                density="compact"
                title={t('mempool')}
                subtitle={formatNumber(stats.memPoolSize)}
              />
              <Item
                density="compact"
                title={t('stakingRewards')}
                subtitle={`${stats.stakingRewards} FAIR`}
              />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Latest block */}
      <Card>
        <CardHeader>
          <CardTitle>{t('latestBlock')}</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center text-primary">
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
        </CardBody>
      </Card>
    </View>
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

  const subStats: {
    key: string
    icon: LucideIcon
    label: string
    value: string
  }[] = [
    {
      key: 'reward',
      icon: Coins,
      label: t('blockReward'),
      value: `${supply.currentReward} FAIR`,
    },
    {
      key: 'halvings',
      icon: Flame,
      label: t('halvings'),
      value: formatNumber(supply.halvings),
    },
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
    <Card clipContent contentStyle={{ padding: 20, gap: 20 }}>
      <ChartHeader
        label={t('supplyEconomics')}
        value={supply.circulating}
        format={formatNumber}
      />
      <StatBar
        label={t('supplyProgress', { percentage: percent.toFixed(2) })}
        value={supply.circulating}
        max={supply.max}
        minLabel="0 FAIR"
        maxLabel={`${formatCompactNumber(supply.max)} FAIR`}
      />
      <ChartStatTiles items={subStats} />
    </Card>
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
 * A Bloom StatCard with a non-interactive
 * background sparkline for values that change over time (Difficulty, Connections).
 * Falls back to a clean tile until enough history has accumulated.
 */
function MetricTile({
  icon: Icon,
  label,
  value,
  hint,
  spark,
}: MetricTileProps) {
  return (
    <StatCard
      stat={{
        label,
        value,
        icon: (props) => (
          <Icon width={props.width} height={props.height} color={props.fill} />
        ),
        delta: '—',
        hint,
        deltaColor: 'neutral',
        accessory:
          spark && spark.length >= MIN_SPARK_POINTS ? (
            <Sparkline data={spark} width={80} height={28} />
          ) : undefined,
      }}
    />
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
