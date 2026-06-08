import {
  AlertTriangle,
  Clock,
  Coins,
  Database,
  Hash,
  Inbox,
  Layers,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
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

const MAX_VISIBLE_TX = 25
const SATOSHIS_PER_FAIR = 100_000_000
const TIP_KEYS = ['tip1', 'tip3', 'tip4'] as const

export default function MempoolContent() {
  const t = useTranslations('mempool')
  const common = useTranslations('common')
  const { data, isLoading, isError, error, refetch, isFetching } = useMempool()

  if (isLoading) {
    return <MempoolSkeleton />
  }

  if (isError || !data) {
    return (
      <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
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

  return (
    <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
      <DetailHeader
        title={t('title')}
        subtitle={t('description')}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching}
      />

      {/* Stats */}
      <StatTileGrid className="lg:grid-cols-3">
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
      </StatTileGrid>

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
          <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Inbox className="size-6" />
            </span>
            <div>
              <p className="text-sm font-medium">{t('empty')}</p>
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
  const waiting =
    Number.isFinite(tx.time) && tx.time > 0
      ? formatDistanceToNow(new Date(tx.time * 1000), { addSuffix: true })
      : '—'

  return (
    <li className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <HashCell value={tx.txid} to="tx" textClassName="font-medium" />
        <span className="text-xs text-muted-foreground tabular-nums" title={waiting}>
          {waiting}
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
    <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
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
