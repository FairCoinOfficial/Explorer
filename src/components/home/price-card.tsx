import { useMemo, useState } from 'react'
import { TrendingUp, TrendingDown, LineChart, ArrowUpRight, Droplet } from 'lucide-react'
import { useTranslations, useLocale } from '@/lib/i18n'
import { useCoinPrice, usePriceHistory, type PriceHistoryPoint } from '@/hooks/use-coin-price'
import { formatUsd } from '@/lib/format'
import { WFAIR_CONFIG } from '@/lib/wfair'
import { ModuleCard } from '@/components/home/module-card'
import { Sparkline } from '@/components/home/sparkline'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** Real series needs at least two points before it reads as a chart. */
const MIN_REAL_POINTS = 2

/**
 * A near-flat, low-amplitude baseline used only when there isn't enough real
 * history yet. It is deliberately ambient (decorative gradient + a gentle resting
 * line), NOT a fabricated price movement — it gives the card the "metric card with
 * sparkline" silhouette without implying a rally. As soon as ≥{@link MIN_REAL_POINTS}
 * real samples accumulate, the chart switches to live data automatically.
 */
const PLACEHOLDER_SPARK: readonly number[] = [0.5, 0.5, 0.52, 0.51, 0.52, 0.5, 0.51, 0.5]

export function PriceCard() {
  const t = useTranslations('home')
  const locale = useLocale()
  const price = useCoinPrice()
  const history = usePriceHistory('7d')

  // Hovered point index into the *real* series, or null when not hovering.
  // Pointer-driven local state (no effect): the Sparkline reports the index, and
  // the hero price/time derive from it below.
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const realSpark = useMemo<PriceHistoryPoint[]>(() => history.data ?? [], [history.data])
  const hasRealSpark = realSpark.length >= MIN_REAL_POINTS

  const sparkValues = useMemo<readonly number[]>(
    () => (hasRealSpark ? realSpark.map((point) => point.price_usd) : PLACEHOLDER_SPARK),
    [hasRealSpark, realSpark],
  )

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [locale],
  )

  const change = price.data?.change24h ?? null
  const isUp = change !== null && change >= 0
  const latestUsd = price.data?.price ?? null

  // The hovered point only resolves on the real series; the placeholder is inert.
  const hoveredPoint =
    hasRealSpark && hoverIndex !== null && hoverIndex >= 0 && hoverIndex < realSpark.length
      ? realSpark[hoverIndex]
      : null

  // Hero shows the hovered value while hovering, otherwise the live price.
  // Stays `number | null` here; the render branch below only runs when a live
  // price exists, narrowing it to a concrete number at the call site.
  const displayUsd = hoveredPoint?.price_usd ?? latestUsd
  const hoveredTime = hoveredPoint ? timeFormatter.format(new Date(hoveredPoint.timestamp)) : null

  const action =
    change !== null ? (
      <span
        className={cn(
          'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums',
          isUp ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive',
        )}
      >
        {isUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
        {isUp ? '+' : ''}
        {change.toFixed(2)}%
      </span>
    ) : undefined

  return (
    <ModuleCard
      title={t('priceTitle')}
      icon={LineChart}
      action={action}
      href={WFAIR_CONFIG.poolUrl}
      external
      footerLabel={t('priceViewMarket')}
    >
      {price.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : latestUsd === null ? (
        <div className="flex flex-1 flex-col justify-center">
          <p className="text-lg font-semibold tracking-tight">{t('priceNoMarket')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('priceAwaitingLiquidity')}</p>
          <a
            href={WFAIR_CONFIG.buyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex w-fit items-center gap-1 text-xs font-medium text-primary transition-opacity hover:opacity-80"
          >
            {t('priceGetFair')}
            <ArrowUpRight className="size-3" />
          </a>
          <p className="mt-2 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
            {t('priceSource')}
          </p>
        </div>
      ) : (
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {/* Interactive area sparkline, behind the text. Pointer events live on
              its own overlay, so it can sit under the hero price and still track
              the cursor. */}
          <div
            className={cn(
              'absolute inset-x-0 bottom-0 h-3/5 select-none',
              hasRealSpark ? 'opacity-70' : 'opacity-40',
            )}
          >
            <Sparkline
              data={sparkValues}
              interactive={hasRealSpark}
              activeIndex={hoverIndex}
              onHoverIndex={hasRealSpark ? setHoverIndex : undefined}
            />
          </div>

          {/* Hero price (foreground). Reflects the hovered point while hovering. */}
          <div className="pointer-events-none relative flex items-baseline gap-1.5">
            <span className="text-4xl font-bold tracking-tight tabular-nums">
              {formatUsd(displayUsd ?? latestUsd)}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              {hoveredTime ?? t('priceUnit')}
            </span>
          </div>

          <div className="pointer-events-none relative mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-8">
            <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
              {t('priceSource')}
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[0.6rem] uppercase tracking-wide text-muted-foreground">
              <Droplet className="size-2.5" />
              {t('priceLowLiquidity')}
            </span>
          </div>
        </div>
      )}
    </ModuleCard>
  )
}
