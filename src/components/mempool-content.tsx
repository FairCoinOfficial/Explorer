import { useMemo } from 'react'
import {
  AlertTriangle,
  BarChart3,
  Clock,
  Coins,
  Database,
  Hash,
  Inbox,
  Layers,
} from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { useMempool, type MempoolTransaction } from '@/hooks/use-mempool'
import { formatBytes, formatNumber } from '@/lib/format'
import { DetailHeader } from '@/components/detail/detail-header'
import { SectionCard } from '@/components/detail/section-card'
import { StatTile, StatTileGrid } from '@/components/detail/stat-tile'
import { HashCell } from '@/components/detail/hash-cell'
import { RelativeTime } from '@/components/detail/relative-time'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const MAX_VISIBLE_TX = 25
const SATOSHIS_PER_FAIR = 100_000_000
const TIP_KEYS = ['tip1', 'tip3', 'tip4'] as const

interface FeeBucket {
  key: string
  label: string
  count: number
  min: number
  max: number
}

function buildFeeHistogram(transactions: MempoolTransaction[]): FeeBucket[] {
  const buckets: FeeBucket[] = [
    { key: '0-1', label: '0–1', count: 0, min: 0, max: 1 },
    { key: '1-5', label: '1–5', count: 0, min: 1, max: 5 },
    { key: '5-10', label: '5–10', count: 0, min: 5, max: 10 },
    { key: '10-50', label: '10–50', count: 0, min: 10, max: 50 },
    { key: '50+', label: '50+', count: 0, min: 50, max: Number.POSITIVE_INFINITY },
  ]
  for (const tx of transactions) {
    const rate = Number.isFinite(tx.feeRate) ? tx.feeRate : 0
    const bucket = buckets.find((b) => rate >= b.min && rate < b.max) ?? buckets[buckets.length - 1]
    bucket.count += 1
  }
  return buckets
}

export default function MempoolContent() {
  const t = useTranslations('mempool')
  const common = useTranslations('common')
  const { data, isLoading, isError, error, refetch, isFetching } = useMempool()

  const mempoolTxs = data?.transactions ?? []
  const feeBuckets = useMemo(() => buildFeeHistogram(mempoolTxs), [mempoolTxs])
  const medianFeeRate = useMemo(() => {
    const rates = mempoolTxs
      .map((tx) => tx.feeRate)
      .filter((rate) => Number.isFinite(rate))
      .sort((a, b) => a - b)
    if (rates.length === 0) return 0
    const mid = Math.floor(rates.length / 2)
    return rates.length % 2 === 0 ? (rates[mid - 1] + rates[mid]) / 2 : rates[mid]
  }, [mempoolTxs])

  if (isLoading) {
    return <MempoolSkeleton />
  }

  if (isError || !data) {
    return (
      <div className="flex-1 space-y-4">
        <DetailHeader
          title={t('title')}
          subtitle={t('description')}
          onRefresh={() => void refetch()}
          isRefreshing={isFetching}
        />
        <SectionCard>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="size-6" />
            </span>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : t('errorLoading')}
            </p>
            <Button variant="outline" onClick={() => void refetch()}>
              {common('tryAgain')}
            </Button>
          </div>
        </SectionCard>
      </div>
    )
  }

  const avgTxSize = data.size > 0 ? Math.round(data.bytes / data.size) : 0
  const transactions = data.transactions.slice(0, MAX_VISIBLE_TX)
  const maxBucketCount = Math.max(1, ...feeBuckets.map((b) => b.count))
  const nowSeconds = Date.now() / 1000
  const ages = data.transactions
    .map((tx) => (Number.isFinite(tx.time) && tx.time > 0 ? nowSeconds - tx.time : 0))
    .filter((age) => age >= 0)
  const avgAgeSeconds =
    ages.length > 0 ? Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length) : 0

  return (
    <div className="flex-1 space-y-4">
      <DetailHeader
        title={t('title')}
        subtitle={t('description')}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching}
      />

      {/* Stats */}
      <StatTileGrid>
        <StatTile
          icon={Hash}
          label={t('pendingTransactions')}
          value={formatNumber(data.size)}
          hint={t('unconfirmedTransactions')}
          accent
        />
        <StatTile
          icon={Database}
          label={t('memoryUsage')}
          value={formatBytes(data.bytes)}
          hint={t('bytesValue', { bytes: formatNumber(data.bytes) })}
        />
        <StatTile
          icon={Layers}
          label={t('avgTxSize')}
          value={formatBytes(avgTxSize)}
          hint={t('bytesPerTransaction')}
        />
        <StatTile
          icon={BarChart3}
          label={t('medianFeeRate')}
          value={t('feeRateValue', { rate: medianFeeRate.toFixed(1) })}
          hint={t('avgAge', { seconds: formatNumber(avgAgeSeconds) })}
        />
      </StatTileGrid>

      <SectionCard title={t('feeHistogram')} icon={BarChart3}>
        {data.transactions.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t('emptyDescription')}</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{t('feeHistogramHint')}</p>
            <ul className="space-y-2">
              {feeBuckets.map((bucket) => (
                <li key={bucket.key} className="flex items-center gap-3 text-sm">
                  <span className="w-14 shrink-0 tabular-nums text-muted-foreground">
                    {bucket.label}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full bg-primary transition-all')}
                      style={{ width: `${(bucket.count / maxBucketCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right tabular-nums font-medium">
                    {bucket.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </SectionCard>

      {/* Pending transactions */}
      <SectionCard
        title={t('recentTransactions')}
        icon={Clock}
        flush
        action={
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {t('pendingCount', { count: data.transactions.length })}
          </span>
        }
      >
        {transactions.length > 0 ? (
          <ul className="divide-y">
            {transactions.map((tx) => (
              <MempoolRow key={tx.txid} tx={tx} t={t} />
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary ring-8 ring-primary/5">
              <Inbox className="size-6" />
            </span>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold">{t('empty')}</p>
              <p className="text-sm text-muted-foreground">{t('emptyDescription')}</p>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Tips */}
      <SectionCard title={t('mempoolTips')} icon={Coins}>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {TIP_KEYS.map((key) => (
            <li key={key} className="flex gap-2">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  )
}

function MempoolRow({
  tx,
  t,
}: {
  tx: MempoolTransaction
  t: (key: string, params?: Record<string, string | number>) => string
}) {
  const satoshis = Math.round(tx.fee * SATOSHIS_PER_FAIR)

  return (
    <li className="group flex items-center gap-4 px-4 py-2.5 transition-colors hover:bg-muted/40">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <HashCell value={tx.txid} to="tx" fill hideCopy textClassName="font-medium" />
        <span className="text-xs text-muted-foreground tabular-nums">
          <RelativeTime timestamp={tx.time} />
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-3 text-xs tabular-nums sm:gap-5">
        <span className="hidden w-16 text-right text-muted-foreground sm:inline">
          {formatBytes(tx.size)}
        </span>
        <span className="hidden w-20 text-right text-muted-foreground sm:inline">
          {t('satValue', { value: formatNumber(satoshis) })}
        </span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
          {t('feeRateValue', { rate: tx.feeRate.toFixed(1) })}
        </span>
      </div>
    </li>
  )
}

function MempoolSkeleton() {
  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="rounded-xl border bg-muted/40">
        <ul className="divide-y">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="space-y-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-16" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
