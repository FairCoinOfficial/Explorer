import {
  AlertTriangle,
  Download,
  Hash,
  Info,
  Receipt,
  Tag,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslations } from '@/lib/i18n'
import { useNetwork } from '@/contexts/network-context'
import { useAddress, useAddressTransactions, type AddressTransaction } from '@/hooks/use-address'
import { formatFair, formatNumber } from '@/lib/format'
import { downloadCsv } from '@/lib/download-csv'
import { getKnownAddressLabel } from '@/lib/known-addresses'
import { DetailBreadcrumbs } from '@/components/detail/detail-breadcrumbs'
import { DetailHeader } from '@/components/detail/detail-header'
import { SectionCard } from '@/components/detail/section-card'
import { StatTile, StatTileGrid } from '@/components/detail/stat-tile'
import { HashCell } from '@/components/detail/hash-cell'
import { RelativeTime } from '@/components/detail/relative-time'
import { EmptyState } from '@/components/detail/empty-state'
import { Pagination } from '@/components/detail/pagination'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function AddressContent({ address }: { address: string }) {
  const t = useTranslations('address')
  const common = useTranslations('common')
  const { currentNetwork } = useNetwork()
  const known = getKnownAddressLabel(address, currentNetwork)
  const { data: info, isLoading, isError, error, refetch, isFetching } = useAddress(address)

  if (isLoading) {
    return <AddressSkeleton />
  }

  if (isError || !info) {
    return (
      <div className="flex-1 space-y-4">
        <DetailBreadcrumbs
          items={[{ label: common('address') }]}
        />
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
    <div className="flex-1 space-y-4">
      <DetailBreadcrumbs items={[{ label: common('address') }]} />
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
            {known ? (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium text-foreground"
                title={known.description}
              >
                <Tag className="size-3" />
                {known.label}
              </span>
            ) : null}
          </div>
        </header>

        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight tabular-nums text-primary sm:text-4xl">
            {formatNumber(info.balance, 8)}
          </span>
          <span className="text-sm font-medium text-muted-foreground">
            FAIR · {t('currentBalance')}
          </span>
        </div>

        <div className="mt-4">
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
      <AddressTransactionsSection address={address} t={t} />
    </div>
  )
}

const TXS_PER_PAGE = 20

function AddressTransactionsSection({
  address,
  t,
}: {
  address: string
  t: (key: string, params?: Record<string, string | number>) => string
}) {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useAddressTransactions(address, page, TXS_PER_PAGE)

  const transactions = data?.transactions ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / TXS_PER_PAGE))

  const exportCsv = () => {
    downloadCsv(
      `faircoin-address-${address}-page-${page}.csv`,
      ['txid', 'type', 'amount', 'confirmations', 'blockHeight', 'time'],
      transactions.map((tx) => [
        tx.txid,
        tx.type,
        tx.amount,
        tx.confirmations,
        tx.blockHeight ?? '',
        tx.time,
      ]),
    )
  }

  return (
    <SectionCard
      title={t('transactionHistory')}
      icon={Receipt}
      flush
      action={
        <div className="flex items-center gap-2">
          {transactions.length > 0 ? (
            <Button type="button" variant="outline" size="sm" onClick={exportCsv}>
              <Download className="size-3.5" />
              {t('exportCsv')}
            </Button>
          ) : null}
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {t('transactionsCount', { count: total })}
          </span>
        </div>
      }
    >
      {isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={t('noTransactions')}
          description={t('noTransactionsDesc')}
        />
      ) : (
        <>
          <ul className="divide-y">
            {transactions.map((tx) => (
              <AddressTransactionRow key={tx.txid} tx={tx} t={t} />
            ))}
          </ul>
          {totalPages > 1 ? (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
              label={t('pageOf', { page, total: totalPages })}
              prevLabel={t('previous')}
              nextLabel={t('next')}
            />
          ) : null}
        </>
      )}
    </SectionCard>
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
    <li className="group flex items-center gap-4 px-4 py-2.5 transition-colors hover:bg-muted/40">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <HashCell value={tx.txid} to="tx" fill hideCopy textClassName="font-medium" />
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
          {formatFair(Math.abs(tx.amount))}
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
    <div className="flex-1 space-y-4">
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
