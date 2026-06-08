import { useMemo } from 'react'
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

export function PriceCard() {
  const t = useTranslations('home')
  const price = useCoinPrice()
  const history = usePriceHistory('7d')

  const sparkData = useMemo<SparkPoint[]>(
    () => (history.data ?? []).map((point) => ({ value: point.price_usd })),
    [history.data],
  )

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
        <div className="space-y-2">
          <Skeleton className="h-8 w-28" />
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
        <div className="flex flex-1 flex-col">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold tracking-tight tabular-nums">
              {formatUsd(usd)}
            </span>
            <span className="text-xs text-muted-foreground">{t('priceUnit')}</span>
          </div>

          {sparkData.length > 1 ? (
            <div className="mt-2 h-12 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="priceSpark" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <YAxis hide domain={['dataMin', 'dataMax']} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#priceSpark)"
                    isAnimationActive={false}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : null}

          <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-2">
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
