import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Blocks } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import type { RecentBlock } from '@/hooks/use-recent-blocks'
import { Skeleton } from '@/components/ui/skeleton'
import { CopyButton } from '@/components/copy-button'
import { shortHash, formatBytes } from '@/lib/format'

interface RecentBlocksListProps {
  blocks: RecentBlock[] | undefined
  isLoading: boolean
  isError: boolean
}

export function RecentBlocksList({ blocks, isLoading, isError }: RecentBlocksListProps) {
  const t = useTranslations('home')

  return (
    <div className="flex h-full flex-col rounded-2xl border bg-muted/30">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Blocks className="size-4" />
          </span>
          <h3 className="text-sm font-semibold tracking-tight">{t('recentBlocks')}</h3>
        </div>
        <Link to="/blocks" className="text-xs font-medium text-primary transition-opacity hover:opacity-80">
          {t('viewAll')}
        </Link>
      </header>

      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <ListSkeleton />
        ) : isError ? (
          <EmptyRow message={t('blocksUnavailable')} />
        ) : !blocks || blocks.length === 0 ? (
          <EmptyRow message={t('blocksEmpty')} />
        ) : (
          <ul className="divide-y">
            {blocks.map((block) => (
              <li key={block.height} className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40">
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/block/${block.height}`}
                      className="text-sm font-semibold text-primary tabular-nums hover:underline"
                    >
                      #{block.height.toLocaleString()}
                    </Link>
                    <CopyButton
                      text={block.hash}
                      className="size-6 opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </div>
                  <Link
                    to={`/block/${block.hash}`}
                    className="truncate font-mono text-xs text-muted-foreground hover:text-foreground"
                  >
                    {shortHash(block.hash)}
                  </Link>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary tabular-nums">
                    {t('txCount', { count: (block.nTx ?? block.tx.length).toString() })}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatDistanceToNow(new Date(block.time * 1000), { addSuffix: true })}
                  </span>
                </div>

                <span className="hidden w-16 shrink-0 text-right text-xs text-muted-foreground tabular-nums sm:inline">
                  {formatBytes(block.size)}
                </span>
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
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-4 w-12" />
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
