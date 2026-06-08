import { useId, useMemo } from 'react'
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts'
import { TrendingUp, TrendingDown, LineChart, ArrowUpRight, Droplet } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { useCoinPrice, usePriceHistory } from '@/hooks/use-coin-price'
import { formatUsd } from '@/lib/format'
import { WFAIR_CONFIG } from '@/lib/wfair'
import { ModuleCard } from '@/components/home/module-card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface SparkPoint {
  value: number
}

/** Real series needs at least two points before it reads as a chart. */
const MIN_REAL_POINTS = 2

/**
 * A near-flat, low-amplitude baseline used only when there isn't enough real
 * history yet. It is deliberately ambient (decorative gradient + a gentle resting
 * line), NOT a fabricated price movement — it gives the card the "metric card with
 * sparkline" silhouette without implying a rally. As soon as ≥{@link MIN_REAL_POINTS}
 * real samples accumulate, the chart switches to live data automatically.
 */
const PLACEHOLDER_SPARK: readonly SparkPoint[] = [
  { value: 0.5 },
  { value: 0.5 },
  { value: 0.52 },
  { value: 0.51 },
  { value: 0.52 },
  { value: 0.5 },
  { value: 0.51 },
  { value: 0.5 },
]

/**
 * Background area sparkline. Renders behind the card text as a subtle ambient
 * layer: a thin primary-tinted line with a gradient fill fading to transparent
 * downward. Non-interactive and low-opacity so the hero price stays legible.
 */
function PriceSparkline({ data, real }: { data: readonly SparkPoint[]; real: boolean }) {
  // Unique gradient id per instance so multiple cards never collide in <defs>.
  const gradientId = useId()

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 h-3/5 select-none',
        // Real data reads clearly; the placeholder stays faint and decorative.
        real ? 'opacity-70' : 'opacity-40',
      )}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data as SparkPoint[]} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--accent))"
            strokeWidth={1.5}
            strokeOpacity={real ? 0.8 : 0.5}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            dot={false}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function PriceCard() {
  const t = useTranslations('home')
  const price = useCoinPrice()
  const history = usePriceHistory('7d')

  const realSpark = useMemo<SparkPoint[]>(
    () => (history.data ?? []).map((point) => ({ value: point.price_usd })),
    [history.data],
  )

  const hasRealSpark = realSpark.length >= MIN_REAL_POINTS
  const sparkData = hasRealSpark ? realSpark : PLACEHOLDER_SPARK

  const change = price.data?.change24h ?? null
  const isUp = change !== null && change >= 0
  const usd = price.data?.price ?? null

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
      ) : usd === null ? (
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
          {/* Background area sparkline, behind the text. */}
          <PriceSparkline data={sparkData} real={hasRealSpark} />

          {/* Hero price (foreground). */}
          <div className="relative flex items-baseline gap-1.5">
            <span className="text-4xl font-bold tracking-tight tabular-nums">{formatUsd(usd)}</span>
            <span className="text-xs font-medium text-muted-foreground">{t('priceUnit')}</span>
          </div>

          <div className="relative mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-8">
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
