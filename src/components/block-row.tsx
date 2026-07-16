import { Link } from 'react-router-dom'
import { useTranslations } from '@/lib/i18n'
import type { RecentBlock } from '@/hooks/use-recent-blocks'
import { HashCell } from '@/components/detail/hash-cell'
import { RelativeTime } from '@/components/detail/relative-time'
import { formatBytes, formatNumber } from '@/lib/format'

/**
 * Canonical block feed row, shared by the `/blocks` list and the home
 * "recent blocks" card so both surfaces stay pixel-identical. Ledger style: no
 * per-row glyph — the height is the anchor, the hash fills the remaining width
 * and ellipsizes only on overflow, and tx-count · time · size trail on the
 * right. Renders as an `<li>`; the caller supplies the `<ul className="divide-y">`.
 */
export function BlockRow({ block }: { block: RecentBlock }) {
  const t = useTranslations('blocks')
  const txCount = block.nTx ?? block.tx.length

  return (
    <li className="group flex items-center gap-4 px-4 py-2.5 transition-colors hover:bg-muted/40">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Link
          to={`/block/${block.height}`}
          className="self-start text-sm font-semibold tabular-nums text-primary hover:underline"
        >
          #{formatNumber(block.height)}
        </Link>
        <HashCell
          value={block.hash}
          to="block"
          fill
          hideCopy
          textClassName="text-xs text-muted-foreground"
        />
      </div>

      <div className="flex shrink-0 items-center gap-2 text-xs tabular-nums text-muted-foreground">
        <span className="font-medium text-primary">{t('txCount', { count: txCount })}</span>
        <span aria-hidden className="opacity-40">·</span>
        <RelativeTime timestamp={block.time} />
        <span aria-hidden className="hidden opacity-40 sm:inline">·</span>
        <span className="hidden sm:inline">{formatBytes(block.size)}</span>
      </div>
    </li>
  )
}
