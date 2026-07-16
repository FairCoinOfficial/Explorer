import { Link } from 'react-router-dom'
import { useTranslations } from '@/lib/i18n'
import type { RecentTransaction } from '@/hooks/use-recent-transactions'
import { HashCell } from '@/components/detail/hash-cell'
import { RelativeTime } from '@/components/detail/relative-time'
import { formatNumber } from '@/lib/format'

/**
 * Canonical transaction feed row, shared by the `/tx` list and the home
 * "latest transactions" card so both surfaces stay pixel-identical. Ledger
 * style: no per-row glyph — the txid fills the remaining width and ellipsizes
 * only on overflow over its relative time, with the moved amount over the
 * block/mempool link on the right. A pending tx is flagged by an amber badge
 * next to the time. Renders as an `<li>`; the caller supplies the `<ul>`.
 */
export function TransactionRow({ tx }: { tx: RecentTransaction }) {
  const t = useTranslations('transactions')
  const pending = tx.blockHeight === null || tx.unconfirmed

  return (
    <li className="group flex items-center gap-4 px-4 py-2.5 transition-colors hover:bg-muted/40">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <HashCell value={tx.txid} to="tx" fill hideCopy textClassName="font-medium" />
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
          <span className="text-sm font-semibold tabular-nums text-foreground">
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
