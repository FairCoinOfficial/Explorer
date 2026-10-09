import { DetailHeader } from '@/components/detail/detail-header'
import { PageLoading } from '@/components/page-loading'
import { TransactionRow } from '@/components/transaction-row'
import { usePageParam } from '@/hooks/use-page-param'
import { useRecentTransactions } from '@/hooks/use-recent-transactions'
import { useExplorerNavigate as useNavigate } from '@/lib/explorer-navigation'
import { formatNumber } from '@/lib/format'
import { useTranslations } from '@/lib/i18n'
import { Button } from '@oxy.so/bloom/button'
import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@oxy.so/bloom/card'
import { EmptyState } from '@oxy.so/bloom/empty-state'
import { Pagination } from '@oxy.so/bloom/pagination'
import { TextFieldInput as Input } from '@oxy.so/bloom/text-field'
import { AlertTriangle, Inbox, Search } from 'lucide-react'
import { useState } from 'react'
import { View } from 'react-native'

const TXS_PER_PAGE = 25

export function TransactionsContent() {
  const t = useTranslations('transactions')
  const common = useTranslations('common')
  const navigate = useNavigate()
  const [page, setPage] = usePageParam()
  const [lookup, setLookup] = useState('')
  const offset = (page - 1) * TXS_PER_PAGE

  const { data, isLoading, isError, error, refetch, isFetching } =
    useRecentTransactions(TXS_PER_PAGE, offset, true)

  const transactions = data?.transactions ?? []
  const total = data?.total ?? 0

  const handleLookup = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = lookup.trim()
    if (value) navigate(`/tx/${value}`)
  }

  if (isLoading && !data) {
    return <PageLoading />
  }

  if (isError) {
    return (
      <View style={{ gap: 16 }}>
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
    <View style={{ gap: 16 }}>
      <DetailHeader
        title={t('title')}
        subtitle={t('subtitle')}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('lookupTitle')}</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleLookup} className="flex flex-col gap-3">
            <Input
              label={t('searchPlaceholder')}
              value={lookup}
              onValueChange={(value) => setLookup(value)}
              placeholder={t('lookupPlaceholder')}
              aria-label={t('lookupPlaceholder')}
            />
            <Button type="submit" disabled={!lookup.trim()}>
              <Search className="size-4" />
              {t('lookupButton')}
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('recentTitle')}</CardTitle>
          {
            <span className="text-xs tabular-nums text-muted-foreground">
              {t('feedHint', { total: formatNumber(total) })}
            </span>
          }
        </CardHeader>
        <CardBody style={{ padding: 0 }}>
          {transactions.length === 0 ? (
            <EmptyState
              variant="compact"
              title={t('empty')}
              description={t('emptyDescription')}
              illustration={<Inbox size={28} />}
            />
          ) : (
            <>
              <ul className="divide-y">
                {transactions.map((tx) => (
                  <TransactionRow
                    key={`${tx.txid}-${tx.blockHeight ?? 'mempool'}`}
                    tx={tx}
                  />
                ))}
              </ul>
            </>
          )}
        </CardBody>
        <CardFooter>
          <Pagination
            page={page}
            totalPages={Math.ceil(total / TXS_PER_PAGE)}
            onChange={setPage}
            previousLabel={common('previous')}
            nextLabel={common('next')}
            getPageLabel={(page) => t('page', { page })}
          />
        </CardFooter>
      </Card>
    </View>
  )
}
