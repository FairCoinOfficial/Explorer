import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Blocks as BlocksIcon,
  Calendar,
  Clock,
  Database,
  Layers,
  Network,
  Receipt,
  Ruler,
  Search,
} from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { useNetwork } from '@/contexts/network-context'
import { useRecentBlocks, type RecentBlock } from '@/hooks/use-recent-blocks'
import { formatBytes, formatNumber } from '@/lib/format'
import { ListHeader } from '@/components/detail/list-header'
import { SectionCard } from '@/components/detail/section-card'
import { StatTile, StatTileGrid } from '@/components/detail/stat-tile'
import { HashCell } from '@/components/detail/hash-cell'
import { RelativeTime } from '@/components/detail/relative-time'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const BLOCKS_PER_PAGE = 20

type TimeFilter = 'all' | '1h' | '24h' | '7d'

const TIME_FILTERS: { key: TimeFilter; labelKey: string }[] = [
  { key: 'all', labelKey: 'all' },
  { key: '1h', labelKey: 'filter1h' },
  { key: '24h', labelKey: 'filter24h' },
  { key: '7d', labelKey: 'filter7d' },
]

const FILTER_WINDOW_SECONDS: Record<Exclude<TimeFilter, 'all'>, number> = {
  '1h': 3_600,
  '24h': 86_400,
  '7d': 604_800,
}

export function BlocksContent() {
  const t = useTranslations('blocks')
  const common = useTranslations('common')
  const { networkConfig } = useNetwork()

  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')

  const offset = (page - 1) * BLOCKS_PER_PAGE
  const { data, isLoading, isError, error, refetch, isFetching } = useRecentBlocks(
    BLOCKS_PER_PAGE,
    offset,
  )

  const blocks = data?.blocks
  const height = data?.height ?? 0
  const total = data?.total ?? height + 1
  const totalPages = Math.max(1, Math.ceil(total / BLOCKS_PER_PAGE))

  // Search/time filters operate on the currently loaded page only — server-side
  // filtering would require an indexed historical store, which the explorer
  // intentionally doesn't depend on.
  const filteredBlocks = useMemo(() => {
    if (!blocks) return []
    const query = searchQuery.trim().toLowerCase()
    const nowSeconds = Date.now() / 1000
    return blocks.filter((block) => {
      if (query) {
        const matches =
          block.height.toString().includes(query) || block.hash.toLowerCase().includes(query)
        if (!matches) return false
      }
      if (timeFilter !== 'all') {
        if (nowSeconds - block.time > FILTER_WINDOW_SECONDS[timeFilter]) return false
      }
      return true
    })
  }, [blocks, searchQuery, timeFilter])

  const filterLabel = useMemo(() => {
    if (timeFilter === 'all') return t('allTime')
    return t('last', { period: t(TIME_FILTERS.find((f) => f.key === timeFilter)?.labelKey ?? 'all') })
  }, [timeFilter, t])

  if (isLoading && !data) {
    return <BlocksSkeleton />
  }

  if (isError) {
    return (
      <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
        <ListHeader
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
    <div className="w-full flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
      <ListHeader
        title={t('title')}
        subtitle={t('subtitle')}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching}
        badge={
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
            <Database className="size-3" />
            {t('height', { height: formatNumber(height) })}
          </span>
        }
      />

      {/* Summary tiles — same language as the home stat strip. */}
      <StatTileGrid>
        <StatTile
          label={t('currentHeight')}
          value={formatNumber(height)}
          icon={Layers}
          accent
          hint={t('latestBlockHeight')}
        />
        <StatTile
          label={t('blocksShown')}
          value={formatNumber(filteredBlocks.length)}
          icon={BlocksIcon}
        />
        <StatTile label={t('timeFilter')} value={filterLabel} icon={Calendar} />
        <StatTile label={t('network')} value={networkConfig.displayName} icon={Network} />
      </StatTileGrid>

      {/* Search + time filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="size-4 shrink-0 text-muted-foreground" />
          <span className="hidden text-sm text-muted-foreground sm:inline">{t('filter')}</span>
          <div className="flex gap-1">
            {TIME_FILTERS.map(({ key, labelKey }) => (
              <Button
                key={key}
                variant={timeFilter === key ? 'default' : 'outline'}
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={() => setTimeFilter(key)}
              >
                {t(labelKey)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Blocks list */}
      <SectionCard
        title={t('recentBlocks')}
        icon={BlocksIcon}
        flush
        action={
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {t('blocksCount', { count: filteredBlocks.length })}
          </span>
        }
      >
        {filteredBlocks.length > 0 ? (
          <>
            {/* Column header — aligns the row columns and adds list legibility. */}
            <div className="hidden items-center gap-3 border-b px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:flex">
              <span className="flex-1">{common('height')}</span>
              <span className="inline-flex w-24 items-center justify-end gap-1">
                <Receipt className="size-3" />
                {common('transactions')}
              </span>
              <span className="inline-flex w-28 items-center justify-end gap-1">
                <Clock className="size-3" />
                {common('time')}
              </span>
              <span className="inline-flex w-16 items-center justify-end gap-1">
                <Ruler className="size-3" />
                {common('size')}
              </span>
            </div>
            <ul className="divide-y">
              {filteredBlocks.map((block) => (
                <BlockRow key={block.height} block={block} t={t} />
              ))}
            </ul>
          </>
        ) : (
          <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 px-4 py-8 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <BlocksIcon className="size-5" />
            </span>
            <p className="text-sm text-muted-foreground">{common('noResults')}</p>
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
            <span className="text-xs text-muted-foreground tabular-nums">
              {t('pageOf', { current: page, total: totalPages, count: total })}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {common('previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || isFetching}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                {common('next')}
              </Button>
            </div>
          </div>
        ) : null}
      </SectionCard>
    </div>
  )
}

function BlockRow({
  block,
  t,
}: {
  block: RecentBlock
  t: (key: string, params?: Record<string, string | number>) => string
}) {
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

function BlocksSkeleton() {
  return (
    <div className="w-full flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-10 w-full max-w-md rounded-lg" />
      <div className={cn('rounded-xl border bg-muted/40')}>
        <ul className="divide-y">
          {Array.from({ length: 10 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-2.5">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-4 w-16" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
