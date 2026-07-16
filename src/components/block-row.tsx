import { Blocks as BlocksIcon } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import type { RecentBlock } from '@/hooks/use-recent-blocks'
import { HashCell } from '@/components/detail/hash-cell'
import { RelativeTime } from '@/components/detail/relative-time'
import { formatBytes } from '@/lib/format'

/**
 * Canonical block feed row, shared by the `/blocks` list and the home
 * "recent blocks" card so both surfaces stay pixel-identical: a leading glyph,
 * the height over its hash on the left, then fixed-width tx-count / time / size
 * columns a header can align to. Renders as an `<li>`; the caller provides the
 * surrounding `<ul className="divide-y">`.
 */
export function BlockRow({ block }: { block: RecentBlock }) {
  const t = useTranslations('blocks')
  const txCount = block.nTx ?? block.tx.length

  return (
    <li className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <BlocksIcon className="size-4" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col">
        <HashCell
          value={String(block.height)}
          to="block"
          hideCopy
          textClassName="text-sm font-semibold tabular-nums"
        />
        <HashCell value={block.hash} to="block" textClassName="text-xs text-muted-foreground" />
      </div>

      <span className="hidden w-24 shrink-0 justify-end text-right sm:flex">
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium tabular-nums text-primary">
          {t('txCount', { count: txCount })}
        </span>
      </span>

      <RelativeTime
        timestamp={block.time}
        className="w-28 shrink-0 text-right text-xs text-muted-foreground"
      />

      <span className="hidden w-16 shrink-0 text-right text-xs text-muted-foreground tabular-nums sm:inline">
        {formatBytes(block.size)}
      </span>
    </li>
  )
}
