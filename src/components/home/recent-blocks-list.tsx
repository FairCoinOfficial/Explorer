import { Link } from 'react-router-dom'
import { Blocks } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import type { RecentBlock } from '@/hooks/use-recent-blocks'
import { Skeleton } from '@/components/ui/skeleton'
import { BlockRow } from '@/components/block-row'

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
              <BlockRow key={block.height} block={block} />
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
