import { BlockRow } from '@/components/block-row'
import { DetailHeader } from '@/components/detail/detail-header'
import { PageLoading } from '@/components/page-loading'
import { useNetwork } from '@/contexts/network-context'
import { usePageParam } from '@/hooks/use-page-param'
import { useRecentBlocks } from '@/hooks/use-recent-blocks'
import { formatNumber } from '@/lib/format'
import { useTranslations } from '@/lib/i18n'
import { Button } from '@oxy.so/bloom/button'
import { Card, CardBody, CardHeader, CardTitle } from '@oxy.so/bloom/card'
import { EmptyState } from '@oxy.so/bloom/empty-state'
import { useContainerWidth } from '@oxy.so/bloom/hooks'
import { Pagination } from '@oxy.so/bloom/pagination'
import { Search as SearchField } from '@oxy.so/bloom/search'
import { StatCards } from '@oxy.so/bloom/stat-cards'
import { BREAKPOINTS } from '@oxy.so/bloom/styles'
import {
  AlertTriangle,
  Blocks as BlocksIcon,
  Calendar,
  Layers,
  Network,
} from 'lucide-react'
import { useMemo } from 'react'
import { View } from 'react-native'
import { useSearchParams } from 'react-router-dom'

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
  const { width: measuredWidth, onLayout } = useContainerWidth()
  const width = measuredWidth ?? 0
  const t = useTranslations('blocks')
  const common = useTranslations('common')
  const { networkConfig } = useNetwork()

  const [params, setParams] = useSearchParams()
  const [page, setPage] = usePageParam()
  const searchQuery = params.get('q') ?? ''
  const timeFilter: TimeFilter =
    TIME_FILTERS.find(({ key }) => key === params.get('time'))?.key ?? 'all'
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }
  const setSearchQuery = (query: string) => update('q', query)
  const setTimeFilter = (filter: TimeFilter) =>
    update('time', filter === 'all' ? '' : filter)

  const offset = (page - 1) * BLOCKS_PER_PAGE
  const { data, isLoading, isError, error, refetch, isFetching } =
    useRecentBlocks(BLOCKS_PER_PAGE, offset)

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
          block.height.toString().includes(query) ||
          block.hash.toLowerCase().includes(query)
        if (!matches) return false
      }
      if (timeFilter !== 'all') {
        if (nowSeconds - block.time > FILTER_WINDOW_SECONDS[timeFilter])
          return false
      }
      return true
    })
  }, [blocks, searchQuery, timeFilter])

  const filterLabel = useMemo(() => {
    if (timeFilter === 'all') return t('allTime')
    return t('last', {
      period: t(
        TIME_FILTERS.find((f) => f.key === timeFilter)?.labelKey ?? 'all',
      ),
    })
  }, [timeFilter, t])

  if (isLoading && !data) {
    return <PageLoading />
  }

  if (isError) {
    return (
      <View onLayout={onLayout} style={{ gap: 16 }}>
        <DetailHeader
          title={t('title')}
          subtitle={t('subtitle')}
          onRefresh={() => void refetch()}
          isRefreshing={isFetching}
        />
        <Card>
          <CardBody>
            <EmptyState
              variant="compact"
              title={common('error')}
              description={error instanceof Error ? error.message : t('error')}
              illustration={<AlertTriangle size={28} />}
              action={{
                label: common('tryAgain'),
                onPress: () => void refetch(),
              }}
            />
          </CardBody>
        </Card>
      </View>
    )
  }

  return (
    <View onLayout={onLayout} style={{ gap: 16 }}>
      <DetailHeader
        title={t('title')}
        subtitle={t('subtitle')}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching}
      />

      {/* Summary tiles — same language as the home stat strip. */}
      {width >= BREAKPOINTS.md && (
        <StatCards
          stats={[
            {
              label: t('currentHeight'),
              value: formatNumber(height),
              icon: (props) => (
                <Layers
                  width={props.width}
                  height={props.height}
                  color={props.fill}
                />
              ),
              delta: '—',
              deltaColor: 'neutral',
              hint: t('latestBlockHeight'),
            },
            {
              label: t('blocksShown'),
              value: formatNumber(filteredBlocks.length),
              icon: (props) => (
                <BlocksIcon
                  width={props.width}
                  height={props.height}
                  color={props.fill}
                />
              ),
              delta: '—',
              deltaColor: 'neutral',
              hint: undefined,
            },
            {
              label: t('timeFilter'),
              value: filterLabel,
              icon: (props) => (
                <Calendar
                  width={props.width}
                  height={props.height}
                  color={props.fill}
                />
              ),
              delta: '—',
              deltaColor: 'neutral',
              hint: undefined,
            },
            {
              label: t('network'),
              value: networkConfig.displayName,
              icon: (props) => (
                <Network
                  width={props.width}
                  height={props.height}
                  color={props.fill}
                />
              ),
              delta: '—',
              deltaColor: 'neutral',
              hint: undefined,
            },
          ]}
        />
      )}

      <View style={{ gap: 12 }}>
        <SearchField
          label={t('searchPlaceholder')}
          value={searchQuery}
          onValueChange={setSearchQuery}
          onClearText={() => setSearchQuery('')}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TIME_FILTERS.map(({ key, labelKey }) => (
            <Button
              key={key}
              appearance={timeFilter === key ? 'solid' : 'outline'}
              size="sm"
              onPress={() => setTimeFilter(key)}
              accessibilityHint={t('filterPageOnly')}
            >
              {t(labelKey)}
            </Button>
          ))}
        </View>
      </View>

      {/* Blocks list */}
      <Card>
        <CardHeader>
          <CardTitle>{t('recentBlocks')}</CardTitle>
          {
            <span className="text-xs tabular-nums text-muted-foreground">
              {t('blocksCount', { count: filteredBlocks.length })}
            </span>
          }
        </CardHeader>
        <CardBody style={{ padding: 0 }}>
          {filteredBlocks.length > 0 ? (
            <ul className="divide-y">
              {filteredBlocks.map((block) => (
                <BlockRow key={block.height} block={block} />
              ))}
            </ul>
          ) : (
            <EmptyState
              variant="compact"
              illustration={<BlocksIcon size={24} />}
              title={common('noResults')}
            />
          )}

          {totalPages > 1 ? (
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={(next) => {
                if (!isFetching) setPage(next)
              }}
              accessibilityLabel={t('pageOf', {
                current: page,
                total: totalPages,
                count: total,
              })}
              previousLabel={common('previous')}
              nextLabel={common('next')}
            />
          ) : null}
        </CardBody>
      </Card>
    </View>
  )
}
