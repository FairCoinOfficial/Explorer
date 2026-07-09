import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts'
import { AlertTriangle, BarChart3, Coins, Gauge, Link2, TrendingUp } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { useNetwork } from '@/contexts/network-context'
import { useStatsHistory } from '@/hooks/use-stats-history'
import { usePriceHistory } from '@/hooks/use-coin-price'
import { computeCirculatingSupply } from '@shared/supply'
import { formatCompactNumber, formatNumber } from '@/lib/format'
import { DetailHeader } from '@/components/detail/detail-header'
import { SectionCard } from '@/components/detail/section-card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type PricePeriod = '24h' | '7d' | '30d' | '1y' | 'all'

const PRICE_PERIODS: PricePeriod[] = ['24h', '7d', '30d', '1y', 'all']

function formatAxisTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ChartsContent() {
  const t = useTranslations('charts')
  const common = useTranslations('common')
  const { currentNetwork } = useNetwork()
  const [pricePeriod, setPricePeriod] = useState<PricePeriod>('7d')

  const {
    data: statsHistory,
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats,
    isFetching: statsFetching,
  } = useStatsHistory({ network: currentNetwork })

  const {
    data: priceHistory,
    isLoading: priceLoading,
    isError: priceError,
    refetch: refetchPrice,
    isFetching: priceFetching,
  } = usePriceHistory(pricePeriod)

  const chartRows = useMemo(() => {
    const points = statsHistory ?? []
    return points.map((point) => ({
      timestamp: point.timestamp,
      label: formatAxisTime(point.timestamp),
      difficulty: point.difficulty,
      connections: point.connections,
      supply: computeCirculatingSupply(point.height),
      mempoolSize: point.mempoolSize,
      txVolume: point.lastBlockTxCount,
      height: point.height,
    }))
  }, [statsHistory])

  const priceRows = useMemo(() => {
    return (priceHistory ?? []).map((point) => ({
      timestamp: point.timestamp,
      label: formatAxisTime(point.timestamp),
      price: point.price_usd,
    }))
  }, [priceHistory])

  const difficultyConfig = {
    difficulty: { label: t('difficulty'), color: 'hsl(var(--primary))' },
  } satisfies ChartConfig
  const supplyConfig = {
    supply: { label: t('supply'), color: 'hsl(var(--accent))' },
  } satisfies ChartConfig
  const connectionsConfig = {
    connections: { label: t('connections'), color: 'hsl(var(--primary))' },
  } satisfies ChartConfig
  const mempoolConfig = {
    mempoolSize: { label: t('mempool'), color: 'hsl(var(--accent))' },
  } satisfies ChartConfig
  const txVolumeConfig = {
    txVolume: { label: t('txVolume'), color: 'hsl(var(--primary))' },
  } satisfies ChartConfig
  const priceConfig = {
    price: { label: t('price'), color: 'hsl(var(--primary))' },
  } satisfies ChartConfig

  const isRefreshing = statsFetching || priceFetching
  const handleRefresh = () => {
    void refetchStats()
    void refetchPrice()
  }

  if (statsLoading && priceLoading) {
    return <ChartsSkeleton />
  }

  return (
    <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
      <DetailHeader
        title={t('title')}
        subtitle={t('subtitle')}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {currentNetwork !== 'mainnet' ? (
        <div className="flex items-start gap-2 rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>{t('mainnetOnlyNote')}</span>
        </div>
      ) : null}

      {statsError ? (
        <SectionCard>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">{t('statsError')}</p>
            <Button variant="outline" onClick={() => void refetchStats()}>
              {common('tryAgain')}
            </Button>
          </div>
        </SectionCard>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <HistoryChart
          title={t('difficulty')}
          icon={Gauge}
          empty={t('noHistory')}
          config={difficultyConfig}
          data={chartRows}
          dataKey="difficulty"
          valueFormatter={(v) => formatCompactNumber(v)}
        />
        <HistoryChart
          title={t('supply')}
          icon={Coins}
          empty={t('noHistory')}
          config={supplyConfig}
          data={chartRows}
          dataKey="supply"
          valueFormatter={(v) => `${formatCompactNumber(v)} FAIR`}
        />
        <HistoryChart
          title={t('connections')}
          icon={Link2}
          empty={t('noHistory')}
          config={connectionsConfig}
          data={chartRows}
          dataKey="connections"
          valueFormatter={(v) => formatNumber(v)}
        />
        <HistoryChart
          title={t('mempool')}
          icon={BarChart3}
          empty={t('noHistory')}
          config={mempoolConfig}
          data={chartRows}
          dataKey="mempoolSize"
          valueFormatter={(v) => formatNumber(v)}
        />
        <HistoryChart
          title={t('txVolume')}
          icon={TrendingUp}
          empty={t('noHistory')}
          config={txVolumeConfig}
          data={chartRows}
          dataKey="txVolume"
          valueFormatter={(v) => formatNumber(v)}
          hint={t('txVolumeHint')}
        />

        <SectionCard
          title={t('price')}
          icon={TrendingUp}
          action={
            <div className="flex flex-wrap gap-1">
              {PRICE_PERIODS.map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setPricePeriod(period)}
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium transition-colors cursor-pointer',
                    pricePeriod === period
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t(`period.${period}`)}
                </button>
              ))}
            </div>
          }
        >
          {priceError ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('priceError')}</p>
          ) : priceLoading ? (
            <Skeleton className="h-[220px] w-full rounded-lg" />
          ) : priceRows.length < 2 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('noPriceHistory')}</p>
          ) : (
            <ChartContainer config={priceConfig} className="aspect-auto h-[220px] w-full">
              <AreaChart data={priceRows} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={32} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(v: number) => `$${v.toFixed(v < 1 ? 4 : 2)}`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) =>
                        typeof value === 'number' ? `$${value.toFixed(6)}` : String(value)
                      }
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="var(--color-price)"
                  fill="var(--color-price)"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </SectionCard>
      </div>
    </div>
  )
}

function HistoryChart({
  title,
  icon: Icon,
  empty,
  config,
  data,
  dataKey,
  valueFormatter,
  hint,
}: {
  title: string
  icon: typeof Gauge
  empty: string
  config: ChartConfig
  data: Array<Record<string, string | number>>
  dataKey: string
  valueFormatter: (value: number) => string
  hint?: string
}) {
  return (
    <SectionCard title={title} icon={Icon}>
      {hint ? <p className="mb-3 text-xs text-muted-foreground">{hint}</p> : null}
      {data.length < 2 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ChartContainer config={config} className="aspect-auto h-[220px] w-full">
          <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={32} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(v: number) => formatCompactNumber(v)}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    typeof value === 'number' ? valueFormatter(value) : String(value)
                  }
                />
              }
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={`var(--color-${dataKey})`}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      )}
    </SectionCard>
  )
}

function ChartsSkeleton() {
  return (
    <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[280px] rounded-xl" />
        ))}
      </div>
    </div>
  )
}
