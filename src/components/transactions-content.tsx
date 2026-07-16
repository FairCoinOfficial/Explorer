import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ChevronLeft, ChevronRight, Clock, Inbox, Search } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { useRecentTransactions } from '@/hooks/use-recent-transactions'
import { formatNumber } from '@/lib/format'
import { DetailHeader } from '@/components/detail/detail-header'
import { SectionCard } from '@/components/detail/section-card'
import { TransactionRow } from '@/components/transaction-row'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

const TXS_PER_PAGE = 25

export function TransactionsContent() {
  const t = useTranslations('transactions')
  const common = useTranslations('common')
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [lookup, setLookup] = useState('')
  const offset = (page - 1) * TXS_PER_PAGE

  const { data, isLoading, isError, error, refetch, isFetching } = useRecentTransactions(
    TXS_PER_PAGE,
    offset,
    true,
  )

  const transactions = data?.transactions ?? []
  const hasMore = data?.hasMore ?? false
  const total = data?.total ?? 0

  const handleLookup = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = lookup.trim()
    if (value) navigate(`/tx/${value}`)
  }

  if (isLoading && !data) {
    return <TransactionsSkeleton />
  }

  if (isError) {
    return (
      <div className="flex-1 space-y-4">
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
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : t('error')}
            </p>
            <Button variant="outline" onClick={() => void refetch()}>
              {common('tryAgain')}
            </Button>
          </div>
        </SectionCard>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4">
      <DetailHeader
        title={t('title')}
        subtitle={t('subtitle')}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching}
      />

      <SectionCard title={t('lookupTitle')} icon={Search}>
        <form onSubmit={handleLookup} className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={lookup}
            onChange={(event) => setLookup(event.target.value)}
            placeholder={t('lookupPlaceholder')}
            className="font-mono text-sm"
            aria-label={t('lookupPlaceholder')}
          />
          <Button type="submit" disabled={!lookup.trim()} className="shrink-0">
            <Search className="size-4" />
            {t('lookupButton')}
          </Button>
        </form>
      </SectionCard>

      <SectionCard
        title={t('recentTitle')}
        icon={Clock}
        flush
        action={
          <span className="text-xs tabular-nums text-muted-foreground">
            {t('feedHint', { total: formatNumber(total) })}
          </span>
        }
      >
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary ring-8 ring-primary/5">
              <Inbox className="size-6" />
            </span>
            <p className="text-sm font-semibold">{t('empty')}</p>
            <p className="text-sm text-muted-foreground">{t('emptyDescription')}</p>
          </div>
        ) : (
          <>
            <ul className="divide-y">
              {transactions.map((tx) => (
                <TransactionRow key={`${tx.txid}-${tx.blockHeight ?? 'mempool'}`} tx={tx} />
              ))}
            </ul>

            <div className="flex items-center justify-between border-t px-4 py-2.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" />
                {common('previous')}
              </Button>
              <span className="text-xs tabular-nums text-muted-foreground">
                {t('page', { page })}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasMore}
                onClick={() => setPage((p) => p + 1)}
              >
                {common('next')}
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  )
}

function TransactionsSkeleton() {
  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-80 rounded-xl" />
    </div>
  )
}
