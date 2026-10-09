import { DetailHeader } from '@/components/detail/detail-header'
import { HashCell } from '@/components/detail/hash-cell'
import { RelativeTime } from '@/components/detail/relative-time'
import { PageLoading } from '@/components/page-loading'
import { useMempool, type MempoolTransaction } from '@/hooks/use-mempool'
import { formatBytes, formatNumber } from '@/lib/format'
import { useTranslations } from '@/lib/i18n'
import { Card, CardBody, CardHeader, CardTitle } from '@oxy.so/bloom/card'
import { EmptyState } from '@oxy.so/bloom/empty-state'
import { Meter } from '@oxy.so/bloom/stat-bar'
import { StatCards } from '@oxy.so/bloom/stat-cards'
import {
  AlertTriangle,
  BarChart3,
  Database,
  Hash,
  Inbox,
  Layers,
} from 'lucide-react'
import { useMemo } from 'react'
import { View } from 'react-native'

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
    {
      key: '50+',
      label: '50+',
      count: 0,
      min: 50,
      max: Number.POSITIVE_INFINITY,
    },
  ]
  for (const tx of transactions) {
    const rate = Number.isFinite(tx.feeRate) ? tx.feeRate : 0
    const bucket =
      buckets.find((b) => rate >= b.min && rate < b.max) ??
      buckets[buckets.length - 1]
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
    return rates.length % 2 === 0
      ? (rates[mid - 1] + rates[mid]) / 2
      : rates[mid]
  }, [mempoolTxs])

  if (isLoading) {
    return <PageLoading />
  }

  if (isError || !data) {
    return (
      <View style={{ gap: 16 }}>
        <DetailHeader
          title={t('title')}
          subtitle={t('description')}
          onRefresh={() => void refetch()}
          isRefreshing={isFetching}
        />
        <Card>
          <CardBody>
            <EmptyState
              variant="compact"
              title={common('error')}
              description={
                error instanceof Error ? error.message : t('errorLoading')
              }
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

  const avgTxSize = data.size > 0 ? Math.round(data.bytes / data.size) : 0
  const transactions = data.transactions.slice(0, MAX_VISIBLE_TX)
  const maxBucketCount = Math.max(1, ...feeBuckets.map((b) => b.count))
  const nowSeconds = Date.now() / 1000
  const ages = data.transactions
    .map((tx) =>
      Number.isFinite(tx.time) && tx.time > 0 ? nowSeconds - tx.time : 0,
    )
    .filter((age) => age >= 0)
  const avgAgeSeconds =
    ages.length > 0
      ? Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length)
      : 0

  return (
    <View style={{ gap: 16 }}>
      <DetailHeader
        title={t('title')}
        subtitle={t('description')}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching}
      />

      {/* Stats */}
      <StatCards
        stats={[
          {
            label: t('pendingTransactions'),
            value: formatNumber(data.size),
            icon: (props) => (
              <Hash
                width={props.width}
                height={props.height}
                color={props.fill}
              />
            ),
            delta: '—',
            deltaColor: 'neutral',
            hint: t('unconfirmedTransactions'),
          },
          {
            label: t('memoryUsage'),
            value: formatBytes(data.bytes),
            icon: (props) => (
              <Database
                width={props.width}
                height={props.height}
                color={props.fill}
              />
            ),
            delta: '—',
            deltaColor: 'neutral',
            hint: t('bytesValue', { bytes: formatNumber(data.bytes) }),
          },
          {
            label: t('avgTxSize'),
            value: formatBytes(avgTxSize),
            icon: (props) => (
              <Layers
                width={props.width}
                height={props.height}
                color={props.fill}
              />
            ),
            delta: '—',
            deltaColor: 'neutral',
            hint: t('bytesPerTransaction'),
          },
          {
            label: t('medianFeeRate'),
            value: t('feeRateValue', { rate: medianFeeRate.toFixed(1) }),
            icon: (props) => (
              <BarChart3
                width={props.width}
                height={props.height}
                color={props.fill}
              />
            ),
            delta: '—',
            deltaColor: 'neutral',
            hint: t('avgAge', { seconds: formatNumber(avgAgeSeconds) }),
          },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('feeHistogram')}</CardTitle>
        </CardHeader>
        <CardBody>
          {data.transactions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t('emptyDescription')}
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {t('feeHistogramHint')}
              </p>
              <ul className="space-y-2">
                {feeBuckets.map((bucket) => (
                  <li
                    key={bucket.key}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="w-14 shrink-0 tabular-nums text-muted-foreground">
                      {bucket.label}
                    </span>
                    <Meter
                      value={bucket.count}
                      max={maxBucketCount}
                      accessibilityLabel={bucket.label}
                      style={{ flex: 1 }}
                    />
                    <span className="w-8 shrink-0 text-right tabular-nums font-medium">
                      {bucket.count}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Pending transactions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('recentTransactions')}</CardTitle>
          {
            <span className="text-xs tabular-nums text-muted-foreground">
              {t('pendingCount', { count: data.transactions.length })}
            </span>
          }
        </CardHeader>
        <CardBody style={{ padding: 0 }}>
          {transactions.length > 0 ? (
            <ul className="divide-y">
              {transactions.map((tx) => (
                <MempoolRow key={tx.txid} tx={tx} t={t} />
              ))}
            </ul>
          ) : (
            <EmptyState
              variant="compact"
              title={t('empty')}
              description={t('emptyDescription')}
              illustration={<Inbox size={28} />}
            />
          )}
        </CardBody>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle>{t('mempoolTips')}</CardTitle>
        </CardHeader>
        <CardBody>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {TIP_KEYS.map((key) => (
              <li key={key} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </View>
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
        <HashCell
          value={tx.txid}
          to="tx"
          fill
          hideCopy
          textClassName="font-medium"
        />
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
        <span className="font-medium tabular-nums text-primary">
          {t('feeRateValue', { rate: tx.feeRate.toFixed(1) })}
        </span>
      </div>
    </li>
  )
}
