import { Link } from 'react-router-dom'
import { Hash } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import type { RecentTransaction } from '@/hooks/use-recent-transactions'
import { HashCell } from '@/components/detail/hash-cell'
import { RelativeTime } from '@/components/detail/relative-time'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Canonical transaction feed row, shared by the `/tx` list and the home
 * "latest transactions" card so both surfaces stay pixel-identical: a leading
 * status glyph, the txid over its relative time on the left, and the moved
 * amount over the block/mempool link on the right. Renders as an `<li>`; the
 * caller provides the surrounding `<ul className="divide-y">`.
 */
export function TransactionRow({ tx }: { tx: RecentTransaction }) {
  const t = useTranslations('transactions')
  const pending = tx.blockHeight === null || tx.unconfirmed

  return (
    <li className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40">
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full',
          pending
            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
            : 'bg-primary/10 text-primary',
        )}
      >
        <Hash className="size-4" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <HashCell value={tx.txid} to="tx" lead={10} tail={8} textClassName="font-medium" />
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <RelativeTime timestamp={tx.time} />
          {pending ? (
            <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 font-medium text-amber-700 dark:text-amber-300">
              {t('unconfirmed')}
            </span>
          ) : null}
        </span>
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
            className="font-medium tabular-nums text-muted-foreground hover:text-foreground"
          >
            #{formatNumber(tx.blockHeight)}
          </Link>
        ) : (
          <Link to="/mempool" className="font-medium text-muted-foreground hover:text-foreground">
            {t('mempool')}
          </Link>
        )}
      </div>
    </li>
  )
}
