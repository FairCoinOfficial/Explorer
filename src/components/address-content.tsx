import { DetailBreadcrumbs } from '@/components/detail/detail-breadcrumbs'
import { DetailHeader } from '@/components/detail/detail-header'
import { HashCell } from '@/components/detail/hash-cell'
import { RelativeTime } from '@/components/detail/relative-time'
import { PageLoading } from '@/components/page-loading'
import { useNetwork } from '@/contexts/network-context'
import {
  useAddress,
  useAddressTransactions,
  type AddressTransaction,
} from '@/hooks/use-address'
import { usePageParam } from '@/hooks/use-page-param'
import { downloadCsv } from '@/lib/download-csv'
import { ExplorerLink as Link } from '@/lib/explorer-navigation'
import { formatFair, formatNumber, shortHash } from '@/lib/format'
import { useTranslations } from '@/lib/i18n'
import { getKnownAddressLabel } from '@/lib/known-addresses'
import { Button } from '@oxy.so/bloom/button'
import { Card, CardBody, CardHeader, CardTitle } from '@oxy.so/bloom/card'
import { Chip } from '@oxy.so/bloom/chip'
import { EmptyState } from '@oxy.so/bloom/empty-state'
import { useContainerWidth } from '@oxy.so/bloom/hooks'
import { Item } from '@oxy.so/bloom/item'
import { Pagination } from '@oxy.so/bloom/pagination'
import { Box } from '@oxy.so/bloom/skeleton'
import { StatCards } from '@oxy.so/bloom/stat-cards'
import { BREAKPOINTS } from '@oxy.so/bloom/styles'
import { Muted, Text } from '@oxy.so/bloom/typography'
import {
  AlertTriangle,
  Download,
  Hash,
  Info,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { View } from 'react-native'

export function AddressContent({ address }: { address: string }) {
  const { width: measuredWidth, onLayout } = useContainerWidth()
  const width = measuredWidth ?? 0
  const t = useTranslations('address')
  const common = useTranslations('common')
  const { currentNetwork } = useNetwork()
  const known = getKnownAddressLabel(address, currentNetwork)
  const {
    data: info,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useAddress(address)

  if (isLoading) {
    return <PageLoading />
  }

  if (isError || !info) {
    return (
      <View onLayout={onLayout} style={{ gap: 16 }}>
        <DetailHeader
          breadcrumb={
            <DetailBreadcrumbs items={[{ label: common('address') }]} />
          }
          title={t('title')}
          subtitle={t('subtitle')}
          onRefresh={() => void refetch()}
          isRefreshing={isFetching}
        />
        <Card>
          <CardBody>
            <EmptyState
              variant="compact"
              title={t('error')}
              description={
                error instanceof Error ? error.message : t('notFound')
              }
              illustration={<AlertTriangle size={28} />}
              action={{ label: t('tryAgain'), onPress: () => void refetch() }}
            />
          </CardBody>
        </Card>
      </View>
    )
  }

  return (
    <View onLayout={onLayout} style={{ gap: 16 }}>
      <DetailHeader
        breadcrumb={
          <DetailBreadcrumbs items={[{ label: common('address') }]} />
        }
        title={t('title')}
        subtitle={t('subtitle')}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching}
      />

      {/* Hero: balance as the confident primary figure + address identity. */}
      <Card>
        <CardHeader>
          <CardTitle>{t('addressInformation')}</CardTitle>
          {known && <Chip size="sm">{known.label}</Chip>}
        </CardHeader>
        <CardBody>
          <View style={{ gap: 16 }}>
            <Text
              variant={
                width >= BREAKPOINTS.md ? 'display-4-bold' : 'title-1-bold'
              }
            >
              {formatNumber(info.balance, 8)} FAIR
            </Text>
            <Muted>{t('currentBalance')}</Muted>
            {known && <Muted>{known.description}</Muted>}
            <Item
              density="compact"
              title={t('address')}
              subtitle={<HashCell value={info.address} full />}
            />
          </View>
        </CardBody>
      </Card>

      {/* Balance stats */}
      <StatCards
        columns={width >= BREAKPOINTS.lg ? 4 : width >= BREAKPOINTS.sm ? 2 : 1}
        stats={[
          {
            label: t('currentBalance'),
            value: formatFair(info.balance),
            icon: (props) => (
              <Wallet
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
            label: t('totalReceived'),
            value: formatFair(info.totalReceived),
            icon: (props) => (
              <TrendingUp
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
            label: t('totalSent'),
            value: formatFair(info.totalSent),
            icon: (props) => (
              <TrendingDown
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
            label: t('transactions'),
            value: formatNumber(info.txCount),
            icon: (props) => (
              <Hash
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

      {info.note ? (
        <Card clipContent>
          <div className="flex items-start gap-2 px-4 py-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{t('limitedData')}</span>
          </div>
        </Card>
      ) : null}

      {/* Transaction history */}
      <AddressTransactionsSection address={address} t={t} />
    </View>
  )
}

const TXS_PER_PAGE = 20

function AddressTransactionsSection({
  address,
  t,
}: {
  address: string
  t: (key: string, params?: Record<string, string | number>) => string
}) {
  const [page, setPage] = usePageParam()
  const { data, isLoading } = useAddressTransactions(
    address,
    page,
    TXS_PER_PAGE,
  )

  const transactions = data?.transactions ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / TXS_PER_PAGE))

  const exportCsv = () => {
    downloadCsv(
      `faircoin-address-${address}-page-${page}.csv`,
      ['txid', 'type', 'amount', 'confirmations', 'blockHeight', 'time'],
      transactions.map((tx) => [
        tx.txid,
        tx.type,
        tx.amount,
        tx.confirmations,
        tx.blockHeight ?? '',
        tx.time,
      ]),
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('transactionHistory')}</CardTitle>
        {
          <div className="flex items-center gap-2">
            {transactions.length > 0 ? (
              <Button
                type="button"
                appearance="outline"
                size="sm"
                onPress={exportCsv}
              >
                <Download className="size-3.5" />
                {t('exportCsv')}
              </Button>
            ) : null}
            <span className="text-xs tabular-nums text-muted-foreground">
              {t('transactionsCount', { count: total })}
            </span>
          </div>
        }
      </CardHeader>
      <CardBody style={{ padding: 0 }}>
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Box key={i} width={'100%'} height={48} />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            variant="compact"
            illustration={<Receipt size={24} />}
            title={t('noTransactions')}
            description={t('noTransactionsDesc')}
          />
        ) : (
          <>
            <ul className="divide-y">
              {transactions.map((tx) => (
                <AddressTransactionRow key={tx.txid} tx={tx} t={t} />
              ))}
            </ul>
            {totalPages > 1 ? (
              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={setPage}
                accessibilityLabel={t('pageOf', { page, total: totalPages })}
                previousLabel={t('previous')}
                nextLabel={t('next')}
              />
            ) : null}
          </>
        )}
      </CardBody>
    </Card>
  )
}

function AddressTransactionRow({
  tx,
  t,
}: {
  tx: AddressTransaction
  t: (key: string, params?: Record<string, string | number>) => string
}) {
  const received = tx.type === 'received'
  const confirmed = tx.confirmations > 0

  return (
    <li>
      <Item
        density="compact"
        title={<Link to={`/tx/${tx.txid}`}>{shortHash(tx.txid)}</Link>}
        subtitle={
          <Muted>
            <RelativeTime timestamp={tx.time} />
            {' · '}
            {confirmed
              ? t('conf', { count: tx.confirmations })
              : t('unconfirmed')}
          </Muted>
        }
        trailing={
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text>
              {received ? '+' : '−'}
              {formatFair(Math.abs(tx.amount))}
            </Text>
            {tx.blockHeight ? (
              <Link to={`/block/${tx.blockHeight}`}>
                <Muted>#{formatNumber(tx.blockHeight)}</Muted>
              </Link>
            ) : (
              <Muted>{t('pendingBadge')}</Muted>
            )}
          </View>
        }
      />
    </li>
  )
}
