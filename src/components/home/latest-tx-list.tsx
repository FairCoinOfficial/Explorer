import { Link } from 'react-router-dom'
import { Receipt } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { useRecentTransactions } from '@/hooks/use-recent-transactions'
import { Skeleton } from '@/components/ui/skeleton'
import { CopyButton } from '@/components/copy-button'
import { RelativeTime } from '@/components/detail/relative-time'
import { shortHash } from '@/lib/format'

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
              <li
                key={`${tx.txid}-${tx.blockHeight ?? 'mempool'}`}
                className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Link
                    to={`/tx/${tx.txid}`}
                    className="truncate font-mono text-sm font-medium text-primary hover:underline"
                  >
                    {shortHash(tx.txid, 10, 8)}
                  </Link>
                  <CopyButton
                    text={tx.txid}
                    className="size-6 shrink-0 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                  />
                </div>

                <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs">
                  {typeof tx.amount === 'number' ? (
                    <span className="font-semibold tabular-nums text-foreground">
                      {tx.amount.toLocaleString(undefined, { maximumFractionDigits: 8 })} FAIR
                    </span>
                  ) : null}
                  {tx.blockHeight !== null ? (
                    <Link
                      to={`/block/${tx.blockHeight}`}
                      className="font-medium text-muted-foreground tabular-nums hover:text-foreground"
                    >
                      #{tx.blockHeight.toLocaleString()}
                    </Link>
                  ) : (
                    <span className="font-medium text-amber-700 dark:text-amber-300">
                      {t('mempool')}
                    </span>
                  )}
                  <RelativeTime timestamp={tx.time} className="text-muted-foreground" />
                </div>
              </li>
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
