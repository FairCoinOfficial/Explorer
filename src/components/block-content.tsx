import { ConfirmationMeter } from '@/components/detail/confirmation-meter'
import { DetailBreadcrumbs } from '@/components/detail/detail-breadcrumbs'
import { DetailHeader } from '@/components/detail/detail-header'
import { HashCell } from '@/components/detail/hash-cell'
import { RelativeTime } from '@/components/detail/relative-time'
import { RowIndex } from '@/components/detail/row-index'
import { PageLoading } from '@/components/page-loading'
import { useBlock } from '@/hooks/use-block'
import { ExplorerLink } from '@/lib/explorer-navigation'
import { formatBytes, formatFair, formatNumber } from '@/lib/format'
import { useTranslations } from '@/lib/i18n'
import { Button } from '@oxy.so/bloom/button'
import { Card, CardBody, CardHeader, CardTitle } from '@oxy.so/bloom/card'
import { Chip } from '@oxy.so/bloom/chip'
import { Code } from '@oxy.so/bloom/code'
import { EmptyState } from '@oxy.so/bloom/empty-state'
import { useContainerWidth } from '@oxy.so/bloom/hooks'
import { Item } from '@oxy.so/bloom/item'
import { Pagination } from '@oxy.so/bloom/pagination'
import { StatCards } from '@oxy.so/bloom/stat-cards'
import { BREAKPOINTS } from '@oxy.so/bloom/styles'
import { Muted, Text } from '@oxy.so/bloom/typography'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Blocks,
  Layers,
  Receipt,
  Ruler,
} from 'lucide-react'
import { useState } from 'react'
import { View } from 'react-native'

export function BlockContent({ hashOrHeight }: { hashOrHeight: string }) {
  const { width: measuredWidth, onLayout } = useContainerWidth()
  const width = measuredWidth ?? 0
  const t = useTranslations('block')
  const common = useTranslations('common')
  const nav = useTranslations('nav')
  const {
    data: block,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useBlock(hashOrHeight)

  if (isLoading) {
    return <PageLoading />
  }

  if (isError || !block) {
    return (
      <View onLayout={onLayout} style={{ gap: 16 }}>
        <DetailHeader
          breadcrumb={
            <DetailBreadcrumbs
              items={[
                { label: nav('blocks'), to: '/blocks' },
                { label: t('notFound') },
              ]}
            />
          }
          title={t('notFound')}
          subtitle={t('details')}
          onRefresh={() => void refetch()}
          isRefreshing={isFetching}
        />
        <Card>
          <CardBody>
            <EmptyState
              variant="compact"
              title={common('error')}
              description={
                error instanceof Error ? error.message : t('notFound')
              }
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

  const txCount = block.nTx ?? block.tx.length
  const confirmations = block.confirmations

  return (
    <View onLayout={onLayout} style={{ gap: 16 }}>
      <DetailHeader
        breadcrumb={
          <DetailBreadcrumbs
            items={[
              { label: nav('blocks'), to: '/blocks' },
              { label: `${t('block')} #${formatNumber(block.height)}` },
            ]}
          />
        }
        title={`${t('block')} #${formatNumber(block.height)}`}
        subtitle={t('details')}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching}
      />

      {/* Hero: block height + hash as the confident primary identity. */}
      <Card>
        <CardHeader>
          <CardTitle>{t('blockInformation')}</CardTitle>
          <ConfirmationPill
            confirmations={confirmations}
            label={common('confirmations')}
          />
        </CardHeader>
        <CardBody>
          <View style={{ gap: 16 }}>
            <Text
              variant={
                width >= BREAKPOINTS.md ? 'display-4-bold' : 'title-1-bold'
              }
            >
              #{formatNumber(block.height)}
            </Text>
            <Muted>{t('blockHeight')}</Muted>
            <Item
              density="compact"
              title={t('blockHash')}
              subtitle={<HashCell value={block.hash} full />}
            />
            <ConfirmationMeter
              confirmations={confirmations}
              label={common('confirmations')}
            />
          </View>
        </CardBody>
      </Card>

      <StatCards
        columns={width >= BREAKPOINTS.lg ? 4 : width >= 480 ? 2 : 1}
        stats={[
          {
            label: t('blockHeight'),
            value: formatNumber(block.height),
            icon: (props) => (
              <Blocks
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
            label: common('transactions'),
            value: formatNumber(txCount),
            icon: (props) => (
              <Receipt
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
            label: t('blockSize'),
            value: formatBytes(block.size),
            icon: (props) => (
              <Ruler
                width={props.width}
                height={props.height}
                color={props.fill}
              />
            ),
            delta: '—',
            deltaColor: 'neutral',
            hint: `${formatNumber(block.size)} ${t('bytes')}`,
          },
          {
            label: common('confirmations'),
            value: formatNumber(confirmations),
            icon: (props) => (
              <Layers
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

      {/* Block metadata */}
      <Card>
        <CardHeader>
          <CardTitle>{t('blockInformation')}</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
              <View
                style={{
                  flexBasis: 220,
                  flexGrow: 1,
                  flexShrink: 1,
                  minWidth: 0,
                }}
              >
                <Item
                  density="compact"
                  title={t('timestamp')}
                  subtitle={<RelativeTime timestamp={block.time} />}
                />
              </View>
              <View
                style={{
                  flexBasis: 220,
                  flexGrow: 1,
                  flexShrink: 1,
                  minWidth: 0,
                }}
              >
                <Item
                  density="compact"
                  title={t('difficulty')}
                  subtitle={<Code>{block.difficulty.toFixed(6)}</Code>}
                />
              </View>
              <View
                style={{
                  flexBasis: 220,
                  flexGrow: 1,
                  flexShrink: 1,
                  minWidth: 0,
                }}
              >
                <Item
                  density="compact"
                  title={t('nonce')}
                  subtitle={<Code>{formatNumber(block.nonce)}</Code>}
                />
              </View>
              <View
                style={{
                  flexBasis: 220,
                  flexGrow: 1,
                  flexShrink: 1,
                  minWidth: 0,
                }}
              >
                <Item
                  density="compact"
                  title={t('version')}
                  subtitle={<Code>{block.version}</Code>}
                />
              </View>
              <View
                style={{
                  flexBasis: 220,
                  flexGrow: 1,
                  flexShrink: 1,
                  minWidth: 0,
                }}
              >
                <Item
                  density="compact"
                  title={t('bits')}
                  subtitle={<Code>{block.bits}</Code>}
                />
              </View>
              <View
                style={{
                  flexBasis: 220,
                  flexGrow: 1,
                  flexShrink: 1,
                  minWidth: 0,
                }}
              >
                <Item
                  density="compact"
                  title={t('weight')}
                  subtitle={
                    <Code>
                      {block.weight ? formatNumber(block.weight) : '—'}
                    </Code>
                  }
                />
              </View>
            </View>

            <Item
              density="compact"
              title={t('merkleRoot')}
              subtitle={<HashCell value={block.merkleroot} full />}
            />

            {block.previousblockhash ? (
              <Item
                density="compact"
                title={t('previousBlock')}
                subtitle={
                  <HashCell value={block.previousblockhash} to="block" full />
                }
              />
            ) : null}
            {block.nextblockhash ? (
              <Item
                density="compact"
                title={t('nextBlock')}
                subtitle={
                  <HashCell value={block.nextblockhash} to="block" full />
                }
              />
            ) : null}
          </div>
        </CardBody>
      </Card>

      {/* Prev / next pill navigation */}
      <div className="flex items-center justify-between gap-2">
        <NavPill
          to={
            block.previousblockhash ? `/block/${block.height - 1}` : undefined
          }
          direction="prev"
          label={t('previousBlock')}
        />
        <NavPill
          to={block.nextblockhash ? `/block/${block.height + 1}` : undefined}
          direction="next"
          label={t('nextBlock')}
        />
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('transactionsList')}</CardTitle>
          {
            <span className="text-xs tabular-nums text-muted-foreground">
              {formatNumber(txCount)} {common('transactions')}
            </span>
          }
        </CardHeader>
        <CardBody style={{ padding: 0 }}>
          <BlockTransactions txids={block.tx} txValues={block.txValues} />
        </CardBody>
      </Card>
    </View>
  )
}

/**
 * Compact confirmation status pill. Shows a check + count once the block has any
 * confirmations, or a muted "0" state while it is still tip-of-chain/pending.
 */
function ConfirmationPill({
  confirmations,
  label,
}: {
  confirmations: number
  label: string
}) {
  return (
    <Chip size="sm" tone={confirmations > 0 ? 'success' : 'neutral'}>
      {formatNumber(confirmations)} {label}
    </Chip>
  )
}

const TXS_PER_PAGE = 25

/** Paginated list of a block's transactions with per-tx total-output values. */
function BlockTransactions({
  txids,
  txValues,
}: {
  txids: string[]
  txValues?: Array<number | null>
}) {
  const t = useTranslations('block')
  const common = useTranslations('common')
  const [page, setPage] = useState(1)

  if (txids.length === 0) {
    return (
      <EmptyState
        variant="compact"
        illustration={<Receipt size={24} />}
        title={t('noTransactions')}
      />
    )
  }

  const totalPages = Math.max(1, Math.ceil(txids.length / TXS_PER_PAGE))
  const start = (page - 1) * TXS_PER_PAGE
  const pageTx = txids.slice(start, start + TXS_PER_PAGE)

  return (
    <>
      <ul className="divide-y">
        {pageTx.map((txid, i) => {
          const index = start + i
          const value = txValues?.[index]
          return (
            <li
              key={txid}
              className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40"
            >
              <RowIndex n={index} />
              <HashCell
                value={txid}
                to="tx"
                fill
                hideCopy
                className="min-w-0 flex-1"
              />
              {typeof value === 'number' ? (
                <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                  {formatFair(value)}
                </span>
              ) : null}
            </li>
          )
        })}
      </ul>
      {totalPages > 1 ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          onChange={setPage}
          accessibilityLabel={common('page', {
            current: page,
            total: totalPages,
          })}
          previousLabel={common('previous')}
          nextLabel={common('next')}
        />
      ) : null}
    </>
  )
}

function NavPill({
  to,
  direction,
  label,
}: {
  to: string | undefined
  direction: 'prev' | 'next'
  label: string
}) {
  return (
    <Button
      appearance="outline"
      size="sm"
      disabled={!to}
      icon={
        direction === 'prev' ? (
          <ArrowLeft size={16} />
        ) : (
          <ArrowRight size={16} />
        )
      }
      iconPosition={direction === 'prev' ? 'left' : 'right'}
      asChild={Boolean(to)}
    >
      {to ? <ExplorerLink to={to}>{label}</ExplorerLink> : label}
    </Button>
  )
}
