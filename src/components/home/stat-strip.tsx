import { useMemo } from 'react'
import {
  Blocks,
  Coins,
  Gauge,
  Network,
  Layers,
  Shield,
  Activity,
  type LucideIcon,
} from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { useNetworkStats } from '@/hooks/use-network-stats'
import { useStatsHistory } from '@/hooks/use-stats-history'
import { computeCirculatingSupply } from '@/lib/supply'
import { formatCompactNumber, formatNumber } from '@/lib/format'
import { Sparkline } from '@/components/home/sparkline'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const POS_PHASE_HEIGHT = 10_000

/** A series needs at least two points before a sparkline reads as a trend. */
const MIN_SPARK_POINTS = 2

interface StatTile {
  key: string
  label: string
  /** Resolved display value, or null while the underlying source is still loading. */
  value: string | null
  icon: LucideIcon
  accent?: boolean
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
  const { data, isError } = useNetworkStats()
  const { data: statsHistory } = useStatsHistory()

  const hasHeight = typeof height === 'number' && height > 0
  const hasStats = Boolean(data)

  // Derive the per-tile background series from the sampled history. Supply is
  // computed from the height series with the same schedule the tile value uses,
  // so the line and the number always agree. Series shorter than
  // MIN_SPARK_POINTS are dropped so the tile renders clean.
  const sparks = useMemo(() => {
    const points = statsHistory ?? []
    if (points.length < MIN_SPARK_POINTS) {
      return { difficulty: undefined, supply: undefined, connections: undefined } as const
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
    const effectiveHeight = data?.blockHeight ?? (hasHeight ? height : undefined)
    const supply =
      typeof effectiveHeight === 'number' ? computeCirculatingSupply(effectiveHeight) : null
    const phase: string | null =
      data?.phase ??
      (typeof effectiveHeight === 'number'
        ? effectiveHeight > POS_PHASE_HEIGHT
          ? 'PoS'
          : 'PoW'
        : null)

    return [
      {
        key: 'height',
        label: t('statHeight'),
        value: typeof effectiveHeight === 'number' ? formatNumber(effectiveHeight) : null,
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
      {
        key: 'mempool',
        label: t('statMempool'),
        value: data ? formatNumber(data.memPoolSize) : null,
        icon: Layers,
      },
      {
        key: 'masternodes',
        label: t('statMasternodes'),
        value: data ? formatNumber(data.masternodeCount) : null,
        icon: Shield,
      },
      {
        key: 'phase',
        label: t('statPhase'),
        value: phase,
        icon: Activity,
        accent: true,
      },
    ]
  }, [data, hasHeight, height, sparks, t])

  // Only surface the error state when there is nothing at all to show — if the
  // fast height is known we still render the strip with the height-derived tiles.
  if (isError && !hasStats && !hasHeight) {
    return (
      <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        {t('statsUnavailable')}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
      {tiles.map((tile) => {
        const Icon = tile.icon
        const hasSpark = Boolean(tile.spark && tile.spark.length >= MIN_SPARK_POINTS)
        return (
          <div
            key={tile.key}
            className="relative flex flex-col gap-1 overflow-hidden rounded-xl bg-muted/60 px-3 py-2.5 transition-colors hover:bg-muted/80"
          >
            {/* Subtle background micro-sparkline for time-varying tiles only.
                Non-interactive, low-opacity, behind the value. Renders nothing
                until enough history has accumulated, keeping the strip clean. */}
            {hasSpark && tile.spark ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 opacity-25">
                <Sparkline data={tile.spark} />
              </div>
            ) : null}
            <div className="relative flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <Icon className="size-3.5" />
              <span className="truncate">{tile.label}</span>
            </div>
            {tile.value === null ? (
              <Skeleton className="relative h-4 w-12" />
            ) : (
              <span
                className={cn(
                  'relative truncate text-base font-semibold tabular-nums',
                  tile.accent && 'text-primary',
                )}
              >
                {tile.value}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
