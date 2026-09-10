import { Link } from 'react-router-dom'
import { Receipt } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { useRecentTransactions } from '@/hooks/use-recent-transactions'
import { Skeleton } from '@/components/ui/skeleton'
import { TransactionRow } from '@/components/transaction-row'

interface LatestTxListProps {
  max?: number
}

export function LatestTxList({ max = 20 }: LatestTxListProps) {
  const t = useTranslations('home')
  // Use the recent-transactions feed (includes the total output amount) rather
  // than deriving bare txids from recent blocks, so each row can show a value.
  const { data, isLoading, isError } = useRecentTransactions(max)
  const transactions = data?.transactions ?? []

  return (
    <div className="flex h-full flex-col rounded-2xl border bg-muted/30">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Receipt className="size-4" />
          </span>
          <h3 className="text-sm font-semibold tracking-tight">{t('latestTransactions')}</h3>
        </div>
        <Link to="/tx" className="text-xs font-medium text-primary transition-opacity hover:opacity-80">
          {t('viewAll')}
        </Link>
      </header>

      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <ListSkeleton />
        ) : isError ? (
          <EmptyRow message={t('txUnavailable')} />
        ) : transactions.length === 0 ? (
          <EmptyRow message={t('txEmpty')} />
        ) : (
          <ul className="divide-y">
            {transactions.map((tx) => (
              <TransactionRow key={`${tx.txid}-${tx.blockHeight ?? 'mempool'}`} tx={tx} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function ListSkeleton() {
  return (
    <ul className="divide-y">
      {Array.from({ length: 8 }).map((_, i) => (
        <li key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-16" />
        </li>
      ))}
    </ul>
  )
}

function EmptyRow({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[160px] items-center justify-center px-4 py-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}
