import { ConfirmationMeter } from '@/components/detail/confirmation-meter'
import { DetailBreadcrumbs } from '@/components/detail/detail-breadcrumbs'
import { DetailHeader } from '@/components/detail/detail-header'
import { HashCell } from '@/components/detail/hash-cell'
import { RelativeTime } from '@/components/detail/relative-time'
import { RowIndex } from '@/components/detail/row-index'
import { PageLoading } from '@/components/page-loading'
import { useMempool } from '@/hooks/use-mempool'
import {
  analyzeTransaction,
  isCoinbaseInput,
  useTransaction,
  type ClassifiedOutput,
  type TransactionAnalysis,
  type TransactionInput,
} from '@/hooks/use-transaction'
import {
  ExplorerLink,
  useExplorerNavigate as useNavigate,
} from '@/lib/explorer-navigation'
import { formatFair, formatNumber } from '@/lib/format'
import { useTranslations } from '@/lib/i18n'
import { Admonition } from '@oxy.so/bloom/admonition'
import { Button } from '@oxy.so/bloom/button'
import { Card, CardBody, CardHeader, CardTitle } from '@oxy.so/bloom/card'
import { Chip } from '@oxy.so/bloom/chip'
import { Code, CodeBlock } from '@oxy.so/bloom/code'
import { EmptyState } from '@oxy.so/bloom/empty-state'
import { useContainerWidth } from '@oxy.so/bloom/hooks'
import { Item } from '@oxy.so/bloom/item'
import { StatCards } from '@oxy.so/bloom/stat-cards'
import { BREAKPOINTS } from '@oxy.so/bloom/styles'
import { Muted, Text } from '@oxy.so/bloom/typography'
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CornerDownRight,
  Database,
  Hammer,
  Home,
  Info,
  Receipt,
  Send,
  Sprout,
  Undo2,
} from 'lucide-react'
import { View } from 'react-native'

const ZERO_HASH =
  '0000000000000000000000000000000000000000000000000000000000000000'

type Translate = (
  key: string,
  params?: Record<string, string | number>,
) => string

/** The headline figure + framing the hero shows for a given transaction kind. */
interface HeroDescriptor {
  icon: typeof Send
  title: string
  primaryValue: number
  primaryLabel: string
  /** Compact label for the matching summary tile. */
  tileLabel: string
  tileHint?: string
  /** Optional caveat shown under the headline (e.g. heuristic limits). */
  note?: string
}

/**
 * Decide what the hero leads with, so the headline reflects what actually left the
 * sender rather than the gross output total (which includes change):
 *
 *  - coinbase  → "Coinbase reward" (newly minted block subsidy).
 *  - coinstake → "Stake reward" (PoS payout; the staker pays themselves).
 *  - self      → "Self-transfer" (every output returned to the sender).
 *  - standard  → "Sent" = sum of non-change outputs. When inputs could not be
 *                resolved we cannot run change detection, so we surface the total
 *                with a caveat instead of a possibly-wrong "Sent".
 */
function describeHero(
  analysis: TransactionAnalysis,
  t: Translate,
): HeroDescriptor {
  switch (analysis.kind) {
    case 'coinbase':
      return {
        icon: Hammer,
        title: t('coinbaseTitle'),
        primaryValue: analysis.totalOutput,
        primaryLabel: t('coinbaseReward'),
        tileLabel: t('coinbaseReward'),
        tileHint: t('coinbaseHint'),
      }
    case 'coinstake':
      return {
        icon: Sprout,
        title: t('stakeTitle'),
        primaryValue: analysis.totalOutput,
        primaryLabel: t('stakeReward'),
        tileLabel: t('stakeReward'),
        tileHint: t('stakeHint'),
      }
    case 'self':
      return {
        icon: Undo2,
        title: t('selfTransferTitle'),
        primaryValue: analysis.totalOutput,
        primaryLabel: t('selfTransfer'),
        tileLabel: t('selfTransfer'),
        tileHint: t('selfTransferHint'),
      }
    default: {
      // Standard spend. When the "Sent" amount is ambiguous — inputs unresolved, or
      // multiple recipients with no positively-identified change (one could be
      // change to a fresh address the heuristic can't catch) — we DON'T assert a
      // precise "Sent"; we show the total moved with a caveat so a possibly-change
      // output is never silently counted as the amount sent.
      if (!analysis.sentIsExact) {
        return {
          icon: Send,
          title: t('transferTitle'),
          primaryValue: analysis.totalOutput,
          primaryLabel: t('totalMoved'),
          tileLabel: t('totalMoved'),
          note: analysis.inputsResolved
            ? t('changeAmbiguousNote')
            : t('changeUnknownNote'),
        }
      }
      return {
        icon: Send,
        title: t('transferTitle'),
        primaryValue: analysis.sent,
        primaryLabel: t('sent'),
        tileLabel: t('sent'),
        tileHint: t('recipientsCount', { count: analysis.recipientCount }),
        note: analysis.hasDetectedChange ? t('changeDetectedNote') : undefined,
      }
    }
  }
}

type TxStatus = 'confirmed' | 'mempool' | 'unconfirmed'

function resolveTxStatus(
  transaction: { confirmations?: number; txid: string },
  mempoolTxs: { txid: string }[] | undefined,
): TxStatus {
  if ((transaction.confirmations ?? 0) > 0) return 'confirmed'
  if (mempoolTxs?.some((entry) => entry.txid === transaction.txid))
    return 'mempool'
  return 'unconfirmed'
}

function TxStatusBadge({
  status,
  t,
  confirmedLabel,
}: {
  status: TxStatus
  t: Translate
  confirmedLabel: string
}) {
  return (
    <Chip
      size="sm"
      tone={
        status === 'confirmed'
          ? 'success'
          : status === 'mempool'
            ? 'warning'
            : 'danger'
      }
    >
      {status === 'confirmed'
        ? confirmedLabel
        : status === 'mempool'
          ? t('inMempool')
          : t('unconfirmed')}
    </Chip>
  )
}

export function TransactionContent({ txid }: { txid: string }) {
  const { width: measuredWidth, onLayout } = useContainerWidth()
  const width = measuredWidth ?? 0
  const t = useTranslations('tx')
  const common = useTranslations('common')
  const nav = useTranslations('nav')
  const navigate = useNavigate()
  const {
    data: transaction,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useTransaction(txid)
  const { data: mempool } = useMempool()

  if (isLoading) {
    return <PageLoading />
  }

  if (isError || !transaction) {
    return (
      <View onLayout={onLayout} style={{ gap: 16 }}>
        <DetailHeader
          breadcrumb={
            <DetailBreadcrumbs
              items={[
                { label: nav('transactions'), to: '/tx' },
                { label: t('notFound') },
              ]}
            />
          }
          title={t('notFound')}
          subtitle={t('invalidId')}
          onRefresh={() => void refetch()}
          isRefreshing={isFetching}
        />
        <Card>
          <CardBody>
            <EmptyState
              variant="compact"
              title={t('errorLoading')}
              description={
                error instanceof Error
                  ? error.message
                  : t('transactionNotFound')
              }
              illustration={<AlertTriangle size={28} />}
              footer={
                <View
                  style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
                >
                  <Button
                    appearance="outline"
                    onPress={() => navigate(`/block/${txid}`)}
                  >
                    <Database className="mr-2 size-4" />
                    {t('viewAsBlock')}
                  </Button>
                  <Button appearance="outline" asChild>
                    <ExplorerLink to="/">
                      <Home className="mr-2 size-4" />
                      {common('backToHome')}
                    </ExplorerLink>
                  </Button>
                </View>
              }
            />
          </CardBody>
        </Card>
      </View>
    )
  }

  const confirmations = transaction.confirmations ?? 0
  const status = resolveTxStatus(transaction, mempool?.transactions)
  const analysis = analyzeTransaction(transaction)
  const hero = describeHero(analysis, t)
  const changeTotal = analysis.outputs
    .filter((entry) => entry.role === 'change')
    .reduce((sum, entry) => sum + entry.output.value, 0)
  const showTotalMovedStat = hero.primaryValue !== analysis.totalOutput
  const hasSecondaryStats =
    showTotalMovedStat || changeTotal > 0 || analysis.fee !== null

  return (
    <View onLayout={onLayout} style={{ gap: 16 }}>
      <DetailHeader
        breadcrumb={
          <DetailBreadcrumbs
            items={[
              { label: nav('transactions'), to: '/tx' },
              { label: common('transaction') },
            ]}
          />
        }
        title={t('title')}
        subtitle={t('subtitle')}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching}
      />

      {/* Hero: the amount that actually left the sender (or the reward, for
          generation txs), with total-moved + fee broken out as secondary lines so
          change returned to the sender is never mistaken for the amount sent. */}
      <Card>
        <CardHeader>
          <CardTitle>{hero.title}</CardTitle>
          <TxStatusBadge
            status={status}
            t={t}
            confirmedLabel={common('confirmed')}
          />
        </CardHeader>
        <CardBody>
          <View style={{ gap: 16 }}>
            <Text
              variant={
                width >= BREAKPOINTS.md ? 'display-4-bold' : 'title-1-bold'
              }
            >
              {formatNumber(hero.primaryValue, 8)} FAIR
            </Text>
            <Muted>{hero.primaryLabel}</Muted>
            {hasSecondaryStats && (
              <View style={{ gap: 8 }}>
                {showTotalMovedStat && (
                  <Item
                    density="compact"
                    title={t('totalMoved')}
                    trailing={<Text>{formatFair(analysis.totalOutput)}</Text>}
                  />
                )}
                {changeTotal > 0 && (
                  <Item
                    density="compact"
                    title={t('changeReturned')}
                    trailing={<Text>{formatFair(changeTotal)}</Text>}
                  />
                )}
                {analysis.fee !== null && (
                  <Item
                    density="compact"
                    title={common('fee')}
                    trailing={<Text>{formatFair(analysis.fee)}</Text>}
                  />
                )}
              </View>
            )}
            {hero.note && <Admonition type="info">{hero.note}</Admonition>}
            <Item
              density="compact"
              title={t('transactionId')}
              subtitle={<HashCell value={transaction.txid} full />}
            />
            <ConfirmationMeter
              confirmations={confirmations}
              label={common('confirmations')}
            />
          </View>
        </CardBody>
      </Card>

      {/* Summary tiles */}
      <StatCards
        columns={width >= BREAKPOINTS.lg ? 4 : width >= 480 ? 2 : 1}
        stats={[
          {
            label: hero.tileLabel,
            value: formatFair(hero.primaryValue),
            icon: (props) => (
              <hero.icon
                width={props.width}
                height={props.height}
                color={props.fill}
              />
            ),
            delta: '—',
            deltaColor: 'neutral',
            hint: hero.tileHint,
          },
          {
            label: t('totalInput'),
            value:
              analysis.totalInput !== null
                ? formatFair(analysis.totalInput)
                : '—',
            icon: (props) => (
              <ArrowDownLeft
                width={props.width}
                height={props.height}
                color={props.fill}
              />
            ),
            delta: '—',
            deltaColor: 'neutral',
            hint: t('inputsCount', { count: transaction.vin.length }),
          },
          {
            label: common('fee'),
            value: analysis.fee !== null ? formatFair(analysis.fee) : '—',
            icon: (props) => (
              <Receipt
                width={props.width}
                height={props.height}
                color={props.fill}
              />
            ),
            delta: '—',
            deltaColor: 'neutral',
            hint:
              analysis.fee === null
                ? t('feeNotApplicable')
                : t('networkFeePaid'),
          },
          {
            label: t('totalOutput'),
            value: formatFair(analysis.totalOutput),
            icon: (props) => (
              <ArrowUpRight
                width={props.width}
                height={props.height}
                color={props.fill}
              />
            ),
            delta: '—',
            deltaColor: 'neutral',
            hint: t('outputsCount', { count: transaction.vout.length }),
          },
        ]}
      />

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>{t('transactionInformation')}</CardTitle>
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
                  title={t('blockTime')}
                  subtitle={
                    transaction.blocktime ? (
                      <RelativeTime timestamp={transaction.blocktime} />
                    ) : (
                      t('pending')
                    )
                  }
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
                  subtitle={<Code>{transaction.version}</Code>}
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
                  title={t('lockTime')}
                  subtitle={<Code>{formatNumber(transaction.locktime)}</Code>}
                />
              </View>
            </View>

            {transaction.blockhash ? (
              <Item
                density="compact"
                title={t('blockHash')}
                subtitle={
                  <HashCell value={transaction.blockhash} to="block" full />
                }
              />
            ) : null}
          </div>
        </CardBody>
      </Card>

      {/* Inputs — compact divided rows: source address leads, the spent outpoint
          sits under it as a subordinate reference, value is right-aligned. */}
      <Card>
        <CardHeader>
          <CardTitle>{t('transactionInputs')}</CardTitle>
          {
            <span className="text-xs tabular-nums text-muted-foreground">
              {t('inputsCount', { count: transaction.vin.length })}
            </span>
          }
        </CardHeader>
        <CardBody style={{ padding: 0 }}>
          <ul className="divide-y">
            {transaction.vin.map((input, index) => (
              <li key={index}>
                <InputRow input={input} index={index} />
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      {/* Outputs — same compact rows; change/reward outputs are de-emphasized (muted
          value + badge) so the real recipient output(s) stand out. */}
      <Card>
        <CardHeader>
          <CardTitle>{t('transactionOutputs')}</CardTitle>
          {
            <span className="text-xs tabular-nums text-muted-foreground">
              {t('outputsCount', { count: transaction.vout.length })}
            </span>
          }
        </CardHeader>
        <CardBody style={{ padding: 0 }}>
          <ul className="divide-y">
            {analysis.outputs.map((entry) => (
              <li key={entry.output.n}>
                <OutputRow entry={entry} t={t} />
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      {/* Raw hex */}
      <Card>
        <CardHeader>
          <CardTitle>{t('rawTransactionData')}</CardTitle>
        </CardHeader>
        <CardBody>
          <CodeBlock
            code={transaction.hex}
            filename={t('hex')}
            lineNumbers={false}
            wrap
            labels={{ copy: common('copy') }}
          />
        </CardBody>
      </Card>
    </View>
  )
}

function InputRow({
  input,
  index,
}: {
  input: TransactionInput
  index: number
}) {
  const t = useTranslations('tx')
  if (isCoinbaseInput(input)) {
    return (
      <Item
        leading={<RowIndex n={index} />}
        title={t('coinbaseTransaction')}
        subtitle={t('coinbaseDescription')}
      />
    )
  }
  const prevTxid = input.txid
  const isNullPrev = !prevTxid || prevTxid === ZERO_HASH
  const prevAddress = input.prevout?.addresses?.[0]
  return (
    <Item
      leading={<RowIndex n={index} />}
      title={
        prevAddress ? (
          <HashCell value={prevAddress} to="address" lead={16} tail={8} />
        ) : isNullPrev ? (
          t('coinbaseTransaction')
        ) : (
          t('fromAddress')
        )
      }
      subtitle={
        !isNullPrev ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <CornerDownRight size={12} />
            <HashCell value={prevTxid} to="tx" lead={8} tail={6} hideCopy />
            <Muted>#{input.vout}</Muted>
          </View>
        ) : undefined
      }
      trailing={
        input.prevout ? (
          <Text variant="body-bold">{formatFair(input.prevout.value)}</Text>
        ) : undefined
      }
    />
  )
}

/** Per-role badge styling + label key for a classified output. */
const OUTPUT_ROLE_META: Record<
  ClassifiedOutput['role'],
  {
    labelKey: string
    appearance: React.ComponentProps<typeof Chip>['appearance']
    icon: typeof Undo2
  } | null
> = {
  recipient: null,
  change: { labelKey: 'changeBadge', appearance: 'outline', icon: Undo2 },
  reward: { labelKey: 'rewardBadge', appearance: 'subtle', icon: Sprout },
  marker: { labelKey: 'markerBadge', appearance: 'outline', icon: Info },
}

function OutputRow({ entry, t }: { entry: ClassifiedOutput; t: Translate }) {
  const { output, role } = entry
  const address = output.scriptPubKey.addresses?.[0]
  const meta = OUTPUT_ROLE_META[role]
  const Icon = meta?.icon
  return (
    <Item
      leading={<RowIndex n={output.n} />}
      title={
        address ? (
          <HashCell value={address} to="address" lead={16} tail={8} />
        ) : (
          output.scriptPubKey.type
        )
      }
      subtitle={
        address || meta ? (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {address ? <Code>{output.scriptPubKey.type}</Code> : null}
            {meta ? (
              <Chip appearance={meta.appearance}>
                {Icon ? <Icon size={14} /> : null}
                {t(meta.labelKey)}
              </Chip>
            ) : null}
          </View>
        ) : undefined
      }
      trailing={
        role === 'recipient' ? (
          <Text variant="body-bold">{formatFair(output.value)}</Text>
        ) : (
          <Muted>{formatFair(output.value)}</Muted>
        )
      }
    />
  )
}
