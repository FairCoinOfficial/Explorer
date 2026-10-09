import { RelativeTime } from '@/components/detail/relative-time'
import { usePageParam } from '@/hooks/use-page-param'
import type { RecentBlock } from '@/hooks/use-recent-blocks'
import { ExplorerLink } from '@/lib/explorer-navigation'
import { formatBytes, formatNumber } from '@/lib/format'
import { useTranslations } from '@/lib/i18n'
import { Button } from '@oxy.so/bloom/button'
import { DataTable } from '@oxy.so/bloom/data-table'
import { Box } from '@oxy.so/bloom/skeleton'

interface RecentBlocksListProps {
  blocks: RecentBlock[] | undefined
  isLoading: boolean
  isError: boolean
}

export function RecentBlocksList({
  blocks,
  isLoading,
  isError,
}: RecentBlocksListProps) {
  const [page, setPage] = usePageParam('blocksPage')
  const t = useTranslations('home')
  const labels = useTranslations('common')
  if (isLoading) return <Box width="100%" height={320} />
  return (
    <DataTable
      layout="inset"
      title={t('recentBlocks')}
      accessibilityLabel={t('recentBlocks')}
      rows={blocks ?? []}
      getRowId={(row) => row.hash}
      pageSize={5}
      page={page}
      onPageChange={setPage}
      minWidth={600}
      emptyState={t(isError ? 'blocksUnavailable' : 'blocksEmpty')}
      toolbar={
        <Button appearance="plain" asChild>
          <ExplorerLink to="/blocks">{t('viewAll')}</ExplorerLink>
        </Button>
      }
      columns={[
        {
          id: 'height',
          header: labels('height'),
          accessor: (row) => row.height,
          cell: ({ row }) => (
            <Button appearance="plain" size="sm" asChild>
              <ExplorerLink to={`/block/${row.height}`}>
                #{formatNumber(row.height)}
              </ExplorerLink>
            </Button>
          ),
        },
        {
          id: 'time',
          header: labels('time'),
          accessor: (row) => row.time,
          cell: ({ row }) => <RelativeTime timestamp={row.time} />,
        },
        {
          id: 'tx',
          header: labels('transactions'),
          accessor: (row) => row.nTx,
          cell: ({ row }) => formatNumber(row.nTx),
        },
        {
          id: 'size',
          header: labels('size'),
          accessor: (row) => row.size,
          cell: ({ row }) => formatBytes(row.size),
        },
      ]}
    />
  )
}
