import { RelativeTime } from '@/components/detail/relative-time'
import { usePageParam } from '@/hooks/use-page-param'
import { useRecentTransactions } from '@/hooks/use-recent-transactions'
import { ExplorerLink } from '@/lib/explorer-navigation'
import { formatFair, formatNumber, shortHash } from '@/lib/format'
import { useTranslations } from '@/lib/i18n'
import { Button } from '@oxy.so/bloom/button'
import { DataTable } from '@oxy.so/bloom/data-table'
import { Box } from '@oxy.so/bloom/skeleton'

export function LatestTxList({ max = 20 }: { max?: number }) {
  const [page, setPage] = usePageParam('txPage')
  const t = useTranslations('home')
  const labels = useTranslations('common')
  const { data, isLoading, isError } = useRecentTransactions(max)
  if (isLoading) return <Box width="100%" height={320} />
  return (
    <DataTable
      layout="inset"
      title={t('latestTransactions')}
      accessibilityLabel={t('latestTransactions')}
      rows={data?.transactions ?? []}
      getRowId={(row) => row.txid}
      pageSize={5}
      page={page}
      onPageChange={setPage}
      minWidth={700}
      emptyState={t(isError ? 'txUnavailable' : 'txEmpty')}
      toolbar={
        <Button appearance="plain" asChild>
          <ExplorerLink to="/tx">{t('viewAll')}</ExplorerLink>
        </Button>
      }
      columns={[
        {
          id: 'txid',
          header: labels('hash'),
          accessor: (row) => row.txid,
          cell: ({ row }) => (
            <Button appearance="plain" size="sm" asChild>
              <ExplorerLink to={`/tx/${row.txid}`}>
                {shortHash(row.txid)}
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
          id: 'amount',
          header: 'FAIR',
          accessor: (row) => row.amount,
          cell: ({ row }) =>
            typeof row.amount === 'number' ? formatFair(row.amount) : '—',
        },
        {
          id: 'block',
          header: labels('block'),
          accessor: (row) => row.blockHeight,
          cell: ({ row }) => (
            <Button appearance="plain" size="sm" asChild>
              <ExplorerLink
                to={
                  row.blockHeight == null
                    ? '/mempool'
                    : `/block/${row.blockHeight}`
                }
              >
                {row.blockHeight == null
                  ? 'Mempool'
                  : `#${formatNumber(row.blockHeight)}`}
              </ExplorerLink>
            </Button>
          ),
        },
      ]}
    />
  )
}
