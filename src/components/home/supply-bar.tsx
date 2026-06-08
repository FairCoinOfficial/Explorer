import { useMemo } from 'react'
import { PieChart } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { useNetworkStats } from '@/hooks/use-network-stats'
import { useStatsHistory } from '@/hooks/use-stats-history'
import { computeSupplyInfo, computeCirculatingSupply } from '@/lib/supply'
import { formatCompactNumber, formatNumber } from '@/lib/format'
import { Sparkline } from '@/components/home/sparkline'
import { Skeleton } from '@/components/ui/skeleton'

/** A series needs at least two points before a sparkline reads as a trend. */
const MIN_SPARK_POINTS = 2

/** Gradient fill for the supply progress bar: brand primary → bright accent. */
const SUPPLY_BAR_GRADIENT = 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))'

interface SubStat {
  key: string
  label: string
  value: string
}

export function SupplyBar() {
  const t = useTranslations('home')
  const { data, isLoading, isError } = useNetworkStats()
  const { data: statsHistory } = useStatsHistory()

  const supply = useMemo(
    () => (data ? computeSupplyInfo(data.blockHeight) : null),
    [data],
  )

  // Supply-growth series derived from the sampled height history with the same
  // schedule the hero figure uses, so the ambient line always agrees with the
  // number. Dropped entirely when there isn't enough history to read as a trend.
  const supplySpark = useMemo<number[] | null>(() => {
    const points = statsHistory ?? []
    if (points.length < MIN_SPARK_POINTS) return null
    return points.map((point) => computeCirculatingSupply(point.height))
  }, [statsHistory])

  const subStats = useMemo<SubStat[] | null>(() => {
    if (!supply) return null
    const percent = supply.fraction * 100
    return [
      {
        key: 'minted',
        label: t('supplyMintedLabel'),
        value: `${percent.toFixed(2)}%`,
      },
      {
        key: 'nextHalving',
        label: t('supplyNextHalvingLabel'),
        value: formatNumber(supply.blocksToNextHalving),
      },
      {
        key: 'reward',
        label: t('supplyRewardLabel'),
        value: `${supply.currentReward} FAIR`,
      },
      {
        key: 'halvings',
        label: t('supplyHalvingsLabel'),
        value: formatNumber(supply.halvings),
      },
      {
        key: 'nextHalvingBlock',
        label: t('supplyNextHalvingBlock'),
        value: `#${formatNumber(supply.nextHalvingHeight)}`,
      },
    ]
  }, [supply, t])

  if (isLoading) {
    return <Skeleton className="h-[208px] rounded-2xl" />
  }

  if (isError || !supply || !subStats) {
    return (
      <div className="rounded-2xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        {t('statsUnavailable')}
      </div>
    )
  }

  const percent = supply.fraction * 100
  // Keep the fill visible even at very low fractions so the bar never reads empty.
  const fillWidth = Math.min(Math.max(percent, 1.5), 100)
  const hasSpark = supplySpark !== null

  return (
    <section className="relative overflow-hidden rounded-2xl border bg-muted/30 p-4 transition-colors hover:bg-muted/40 sm:p-5">
      {/* Ambient supply-growth sparkline, low opacity, behind the content. Only
          rendered once enough history has accumulated; never a placeholder. */}
      {hasSpark ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 top-1/3 select-none opacity-[0.18]">
          <Sparkline data={supplySpark} fill strokeWidth={1.75} />
        </div>
      ) : null}

      <header className="relative mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
            <PieChart className="size-4" />
          </span>
          <h3 className="text-sm font-semibold tracking-tight">{t('supplyTitle')}</h3>
        </div>
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium tabular-nums text-primary">
          {t('supplyMinted', { percent: percent.toFixed(2) })}
        </span>
      </header>

      {/* Hero figure: precise circulating supply against the compact hard cap. */}
      <div className="relative flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
          {formatNumber(supply.circulating)}
        </span>
        <span className="text-sm font-medium text-muted-foreground">
          {t('supplyOfMax', { max: formatCompactNumber(supply.max) })}
        </span>
      </div>

      {/* Thicker gradient progress bar with a bright accent leading edge. */}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent * 10) / 10}
        aria-label={t('supplyTitle')}
        className="relative mt-3 h-3 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="relative h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${fillWidth}%`, backgroundImage: SUPPLY_BAR_GRADIENT }}
        >
          <span className="absolute inset-y-0 right-0 w-1.5 rounded-full bg-accent" aria-hidden />
        </div>
      </div>

      {/* Sub-stats grid: stat-strip tile look, responsive 2 → 5 columns. */}
      <dl className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {subStats.map((stat) => (
          <div
            key={stat.key}
            className="flex flex-col gap-1 rounded-xl bg-muted/60 px-3 py-2.5 transition-colors hover:bg-muted/80"
          >
            <dt className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {stat.label}
            </dt>
            <dd className="truncate text-base font-semibold tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
