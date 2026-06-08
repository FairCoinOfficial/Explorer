import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Receipt } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { useLatestTransactions, type RecentBlock } from '@/hooks/use-recent-blocks'
import { Skeleton } from '@/components/ui/skeleton'
import { CopyButton } from '@/components/copy-button'
import { shortHash } from '@/lib/format'

interface LatestTxListProps {
  blocks: RecentBlock[] | undefined
  isLoading: boolean
  isError: boolean
  max?: number
}

export function LatestTxList({ blocks, isLoading, isError, max = 20 }: LatestTxListProps) {
  const t = useTranslations('home')
  const transactions = useLatestTransactions(blocks, max)

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
                key={tx.txid}
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
                    className="size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </div>

                <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs">
                  <Link
                    to={`/block/${tx.blockHeight}`}
                    className="font-medium text-muted-foreground tabular-nums hover:text-foreground"
                  >
                    #{tx.blockHeight.toLocaleString()}
                  </Link>
                  <span className="text-muted-foreground tabular-nums">
                    {formatDistanceToNow(new Date(tx.blockTime * 1000), { addSuffix: true })}
                  </span>
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
