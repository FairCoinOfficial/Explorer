import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Hash,
  Info,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslations } from '@/lib/i18n'
import { useAddress, type AddressInfo, type AddressTransaction } from '@/hooks/use-address'
import { formatNumber } from '@/lib/format'
import { DetailHeader } from '@/components/detail/detail-header'
import { SectionCard } from '@/components/detail/section-card'
import { StatTile, StatTileGrid } from '@/components/detail/stat-tile'
import { HashCell } from '@/components/detail/hash-cell'
import { RelativeTime } from '@/components/detail/relative-time'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

function formatFair(value: number): string {
  return `${value.toFixed(8)} FAIR`
}

export function AddressContent({ address }: { address: string }) {
  const t = useTranslations('address')
  const { data: info, isLoading, isError, error, refetch, isFetching } = useAddress(address)

  if (isLoading) {
    return <AddressSkeleton />
  }

  if (isError || !info) {
    return (
      <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
        <DetailHeader
          title={t('title')}
          subtitle={t('subtitle')}
          onRefresh={() => void refetch()}
          isRefreshing={isFetching}
        />
        <SectionCard>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="size-6" />
            </span>
            <div className="space-y-1">
              <p className="text-base font-semibold">{t('error')}</p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : t('notFound')}
              </p>
            </div>
            <Button variant="outline" onClick={() => void refetch()}>
              {t('tryAgain')}
            </Button>
          </div>
        </SectionCard>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
      <DetailHeader
        title={t('title')}
        subtitle={t('subtitle')}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching}
        action={
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
            <Receipt className="size-3" />
            {t('transactionsCount', { count: info.txCount })}
          </span>
        }
      />

      {/* Hero: balance as the confident primary figure + address identity. */}
      <section className="rounded-2xl border bg-muted/30 p-4 transition-colors hover:bg-muted/40 sm:p-5">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Wallet className="size-4" />
            </span>
            <h3 className="text-sm font-semibold tracking-tight">{t('addressInformation')}</h3>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium tabular-nums text-primary">
            <Hash className="size-3" />
            {t('transactionsCount', { count: info.txCount })}
          </span>
        </header>

        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight tabular-nums text-primary sm:text-4xl">
            {formatNumber(info.balance, 8)}
          </span>
          <span className="text-sm font-medium text-muted-foreground">
            FAIR · {t('currentBalance')}
          </span>
        </div>

        {/* Received / sent flow summary, inline under the hero balance. */}
        <dl className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="size-3.5 text-primary" />
            <dt className="text-muted-foreground">{t('totalReceived')}</dt>
            <dd className="font-semibold tabular-nums">{formatFair(info.totalReceived)}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingDown className="size-3.5 text-muted-foreground" />
            <dt className="text-muted-foreground">{t('totalSent')}</dt>
            <dd className="font-semibold tabular-nums">{formatFair(info.totalSent)}</dd>
          </div>
        </dl>

        <div className="mt-3">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t('address')}
          </span>
          <div className="mt-1">
            <HashCell value={info.address} full />
          </div>
        </div>
      </section>

      {/* Balance stats */}
      <StatTileGrid>
        <StatTile label={t('currentBalance')} value={formatFair(info.balance)} icon={Wallet} accent />
        <StatTile label={t('totalReceived')} value={formatFair(info.totalReceived)} icon={TrendingUp} />
        <StatTile label={t('totalSent')} value={formatFair(info.totalSent)} icon={TrendingDown} />
        <StatTile label={t('transactions')} value={formatNumber(info.txCount)} icon={Hash} />
      </StatTileGrid>

      {info.note ? (
        <div className="flex items-start gap-2 rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>{t('limitedData')}</span>
        </div>
      ) : null}

      {/* Transaction history */}
      <SectionCard
        title={t('transactionHistory')}
        icon={Receipt}
        flush
        action={
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {t('transactionsCount', { count: info.transactions?.length ?? 0 })}
          </span>
        }
      >
        <AddressTransactions info={info} t={t} />
      </SectionCard>
    </div>
  )
}

function AddressTransactions({
  info,
  t,
}: {
  info: AddressInfo
  t: (key: string, params?: Record<string, string | number>) => string
}) {
  const transactions = info.transactions ?? []

  if (transactions.length === 0) {
    return (
      <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 px-4 py-8 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Receipt className="size-5" />
        </span>
        <p className="text-sm font-medium">{t('noTransactions')}</p>
        <p className="text-xs text-muted-foreground">{t('noTransactionsDesc')}</p>
      </div>
    )
  }

  return (
    <ul className="divide-y">
      {transactions.map((tx) => (
        <AddressTransactionRow key={tx.txid} tx={tx} t={t} />
      ))}
    </ul>
  )
}

function AddressTransactionRow({
  tx,
  t,
}: {
  tx: AddressTransaction
  t: (key: string, params?: Record<string, string | number>) => string
}) {
  const received = tx.type === 'received'
  const confirmed = tx.confirmations > 0

  return (
    <li className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40">
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full',
          received ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
        )}
      >
        {received ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
      </span>

      <div className="flex min-w-0 flex-1 flex-col">
        <HashCell value={tx.txid} to="tx" lead={10} tail={8} />
        <span className="text-xs text-muted-foreground">
          <RelativeTime timestamp={tx.time} />
          {' · '}
          {confirmed ? t('conf', { count: tx.confirmations }) : t('unconfirmed')}
        </span>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span
          className={cn(
            'text-sm font-semibold tabular-nums',
            received ? 'text-primary' : 'text-foreground',
          )}
        >
          {received ? '+' : '−'}
          {Math.abs(tx.amount).toFixed(8)}
        </span>
        {tx.blockHeight ? (
          <Link
            to={`/block/${tx.blockHeight}`}
            className="text-xs text-muted-foreground tabular-nums hover:text-foreground hover:underline"
          >
            #{formatNumber(tx.blockHeight)}
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">{t('pendingBadge')}</span>
        )}
      </div>
    </li>
  )
}

function AddressSkeleton() {
  return (
    <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <Skeleton className="h-[188px] rounded-2xl" />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-56 rounded-xl" />
    </div>
  )
}
