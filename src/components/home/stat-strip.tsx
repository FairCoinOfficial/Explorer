import { useNetwork } from '@/contexts/network-context'
import { useNetworkStats } from '@/hooks/use-network-stats'
import { useStatsHistory } from '@/hooks/use-stats-history'
import { formatCompactNumber, formatNumber } from '@/lib/format'
import { useTranslations } from '@/lib/i18n'
import { Admonition } from '@oxy.so/bloom/admonition'
import { Sparkline } from '@oxy.so/bloom/chart-cards'
import { useContainerWidth } from '@oxy.so/bloom/hooks'
import { StatCards } from '@oxy.so/bloom/stat-cards'
import { BREAKPOINTS } from '@oxy.so/bloom/styles'
import { computeCirculatingSupply } from '@shared/supply'
import { Blocks, Coins, Gauge, Network, type LucideIcon } from 'lucide-react'
import { useMemo } from 'react'
import { View } from 'react-native'

/** A series needs at least two points before a sparkline reads as a trend. */
const MIN_SPARK_POINTS = 2

interface StatTile {
  key: string
  label: string
  /** Resolved display value, or null while the underlying source is still loading. */
  value: string | null
  icon: LucideIcon
  /**
   * Optional background micro-sparkline series for tiles whose value varies over
   * time (Difficulty, Supply, Connections). `undefined`/too-short series render
   * no sparkline so the tile stays clean.
   */
  spark?: number[]
}

interface StatStripProps {
  /**
   * Block height sourced from the recent-blocks query, available almost
   * instantly. Lets height-derived tiles render before `/api/stats` resolves.
   */
  height?: number
}

export function StatStrip({ height }: StatStripProps) {
  const t = useTranslations('home')
  const { width: measuredWidth, onLayout } = useContainerWidth()
  const width = measuredWidth ?? 0
  const { currentNetwork } = useNetwork()
  const { data, isError } = useNetworkStats()
  const { data: statsHistory } = useStatsHistory({ network: currentNetwork })

  const hasHeight = typeof height === 'number' && height > 0
  const hasStats = Boolean(data)

  // Derive the per-tile background series from the sampled history. Supply is
  // computed from the height series with the same schedule the tile value uses,
  // so the line and the number always agree. Series shorter than
  // MIN_SPARK_POINTS are dropped so the tile renders clean.
  const sparks = useMemo(() => {
    const points = statsHistory ?? []
    if (points.length < MIN_SPARK_POINTS) {
      return {
        difficulty: undefined,
        supply: undefined,
        connections: undefined,
      } as const
    }
    return {
      difficulty: points.map((point) => point.difficulty),
      supply: points.map((point) => computeCirculatingSupply(point.height)),
      connections: points.map((point) => point.connections),
    } as const
  }, [statsHistory])

  const tiles = useMemo<StatTile[]>(() => {
    // Prefer the authoritative stats height once available, otherwise fall
    // back to the fast height from recent blocks for early-paint tiles.
    const effectiveHeight =
      data?.blockHeight ?? (hasHeight ? height : undefined)
    const supply =
      typeof effectiveHeight === 'number'
        ? computeCirculatingSupply(effectiveHeight)
        : null

    return [
      {
        key: 'height',
        label: t('statHeight'),
        value:
          typeof effectiveHeight === 'number'
            ? formatNumber(effectiveHeight)
            : null,
        icon: Blocks,
      },
      {
        key: 'supply',
        label: t('statSupply'),
        value: supply !== null ? `${formatCompactNumber(supply)} FAIR` : null,
        icon: Coins,
        spark: sparks.supply,
      },
      {
        key: 'difficulty',
        label: t('statDifficulty'),
        value: data ? formatCompactNumber(data.difficulty) : null,
        icon: Gauge,
        spark: sparks.difficulty,
      },
      {
        key: 'connections',
        label: t('statConnections'),
        value: data ? formatNumber(data.connections) : null,
        icon: Network,
        spark: sparks.connections,
      },
    ]
  }, [data, hasHeight, height, sparks, t])

  if (isError && !hasStats && !hasHeight)
    return <Admonition type="warning">{t('statsUnavailable')}</Admonition>
  return (
    <View onLayout={onLayout}>
      <StatCards
        columns={width >= BREAKPOINTS.lg ? 4 : width >= BREAKPOINTS.sm ? 2 : 1}
        stats={tiles.map(({ label, value, icon: Icon, spark }) => ({
          label,
          value: value ?? '…',
          icon: (props) => (
            <Icon
              width={props.width}
              height={props.height}
              color={props.fill}
            />
          ),
          delta: '—',
          deltaColor: 'neutral',
          accessory: spark ? (
            <Sparkline data={spark} width={80} height={28} />
          ) : undefined,
        }))}
      />
    </View>
  )
}
