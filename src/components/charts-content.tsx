import { DetailHeader } from '@/components/detail/detail-header'
import { useNetwork } from '@/contexts/network-context'
import { usePriceHistory } from '@/hooks/use-coin-price'
import { useStatsHistory } from '@/hooks/use-stats-history'
import {
  compareHalves,
  observedBlocks,
  preparePrices,
  prepareStats,
} from '@/lib/chart-data'
import { useLocale, useTranslations } from '@/lib/i18n'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@oxy.so/bloom/accordion'
import { Admonition } from '@oxy.so/bloom/admonition'
import { Button } from '@oxy.so/bloom/button'
import {
  ActivityRingsCard,
  AgentsChartCard,
  AreaChartCard,
  BarListCard,
  ChartCardSurface,
  ChartHeader,
  ComboChartCard,
  ContributionsCard,
  EarningsChartCard,
  FunnelChartCard,
  HeatmapChartCard,
  LineChartCard,
  MostActiveDaysCard,
  OrdersChartCard,
  RadarChartCard,
  RadialChartCard,
  RevenueChartCard,
  SankeyChartCard,
  ScatterChartCard,
  SleepScoreCard,
  Sparkline,
  StageBarsCard,
  StepsCard,
  TokensChartCard,
  contributionCellsFromDays,
} from '@oxy.so/bloom/chart-cards'
import { DataTable } from '@oxy.so/bloom/data-table'
import { Dialog, useDialogControl } from '@oxy.so/bloom/dialog'
import { EmptyState } from '@oxy.so/bloom/empty-state'
import { useContainerWidth } from '@oxy.so/bloom/hooks'
import {
  SegmentedControl,
  SegmentedControlItem,
  SegmentedControlItemText,
} from '@oxy.so/bloom/segmented-control'
import { Box } from '@oxy.so/bloom/skeleton'
import { StatCards } from '@oxy.so/bloom/stat-cards'
import { BREAKPOINTS } from '@oxy.so/bloom/styles'
import { Muted, Text } from '@oxy.so/bloom/typography'
import { MAX_SUPPLY } from '@shared/supply'
import { BarChart3, Blocks, Clock, Network, RefreshCw } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { View } from 'react-native'
import { useSearchParams } from 'react-router-dom'

type PricePeriod = '24h' | '7d' | '30d' | '1y' | 'all'
const PRICE_PERIODS: PricePeriod[] = ['24h', '7d', '30d', '1y', 'all']
const GROUPS = ['all', 'network', 'distribution', 'activity', 'market'] as const
type Group = (typeof GROUPS)[number]

export function ChartsContent() {
  const t = useTranslations('charts')
  const { width: measuredWidth, onLayout } = useContainerWidth()
  const width = measuredWidth ?? 0
  const calendar = useDialogControl()
  const common = useTranslations('common')
  const locale = useLocale()
  const { currentNetwork } = useNetwork()
  const mainnet = currentNetwork === 'mainnet'
  const [params, setParams] = useSearchParams()
  const pricePeriod =
    PRICE_PERIODS.find((period) => period === params.get('period')) ?? '7d'
  const group = GROUPS.find((group) => group === params.get('group')) ?? 'all'
  const setFilter = (key: string, value: string, defaultValue: string) => {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        if (value === defaultValue) next.delete(key)
        else next.set(key, value)
        return next
      },
      { replace: true },
    )
  }
  const setPricePeriod = (period: PricePeriod) =>
    setFilter('period', period, '7d')
  const setGroup = (group: Group) => setFilter('group', group, 'all')
  const [supplyIndex, setSupplyIndex] = useState<number | null>(null)
  const [comboIndex, setComboIndex] = useState<number | null>(null)
  const [expanded, setExpanded] = useState<string | string[] | undefined>()
  const stats = useStatsHistory({ network: currentNetwork })
  const prices = usePriceHistory(pricePeriod)
  // Explicitly gate cached and manually-refetched mainnet data on network changes.
  const rows = useMemo(
    () => (mainnet ? prepareStats(stats.data ?? []) : []),
    [stats.data, mainnet],
  )
  const priceRows = useMemo(
    () => preparePrices(prices.data ?? []),
    [prices.data],
  )
  const blocks = useMemo(() => observedBlocks(rows), [rows])
  const number = (value: number) =>
    value.toLocaleString(locale, { maximumFractionDigits: 2 })
  const compact = (value: number) =>
    value.toLocaleString(locale, {
      notation: 'compact',
      maximumFractionDigits: 2,
    })
  const usd = (value: number) =>
    value.toLocaleString(locale, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 6,
    })
  const fair = (value: number) => `${compact(value)} FAIR`
  const stamp = (time: number) =>
    new Date(time).toLocaleString(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    })
  const last = rows.at(-1)
  const count = rows.length
  const period = count
    ? `${stamp(rows[0].time)} – ${stamp(last!.time)} UTC`
    : t('noHistory')
  const data = rows.map((row) => ({ ...row, label: stamp(row.time) }))
  const series = (
    key: 'difficulty' | 'connections' | 'mempoolSize' | 'supply',
  ) => data.map((row) => ({ label: row.label, value: row[key] }))
  const supplyParts = last
    ? [
        { label: t('supply'), value: last.supply },
        { label: t('remainingSupply'), value: MAX_SUPPLY - last.supply },
      ]
    : []
  const mempoolBuckets = [
    {
      label: t('emptyMempool'),
      value: rows.filter((row) => row.mempoolSize === 0).length,
    },
    {
      label: t('smallMempool'),
      value: rows.filter((row) => row.mempoolSize > 0 && row.mempoolSize <= 5)
        .length,
    },
    {
      label: t('largeMempool'),
      value: rows.filter((row) => row.mempoolSize > 5).length,
    },
  ]
  const sampledTx = blocks.map((row) => ({
    label: `#${number(row.height)}`,
    value: row.lastBlockTxCount,
  }))
  const txTotal = sampledTx.reduce((sum, row) => sum + row.value, 0)
  const comparisons = compareHalves(sampledTx)
  const issuance = blocks.slice(1).flatMap((row, index) => {
    const previous = blocks[index]
    // A reorg is not negative issuance; a gap is explicitly an observed height interval.
    return row.height > previous.height
      ? [
          {
            label: `#${previous.height}–${row.height}`,
            value: row.supply - previous.supply,
          },
        ]
      : []
  })
  const issuanceComparison = compareHalves(issuance)
  const dayCounts = new Map<string, number>()
  for (const block of blocks) {
    const day = new Date(block.time).toISOString().slice(0, 10)
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1)
  }
  const days = [...dayCounts].map(([date, value]) => ({
    date,
    label: date,
    value,
  }))
  const year = last
    ? new Date(last.time).getUTCFullYear()
    : new Date().getUTCFullYear()
  const peakDay = Math.max(1, ...days.map((day) => day.value))
  const thresholds = [0, 1, 4, 8].map((min) => ({
    label: min ? t('atLeastPeers', { count: min }) : t('samples'),
    value: rows.filter((row) => row.connections >= min).length,
  }))
  const comparisonProps = {
    currentLabel: t('laterHalf'),
    previousLabel: t('earlierHalf'),
    totalComparisonLabel: t('earlierHalf'),
    pointComparisonLabel: t('earlierHalf'),
    getPointTitle: (point: { label: string }) => point.label,
  }
  const ready = count >= 2
  const refresh = () => {
    if (mainnet) void stats.refetch()
    void prices.refetch()
  }
  const show = (section: Group) => group === 'all' || group === section

  const chart = (
    title: string,
    child: ReactNode,
    enough = ready,
    source: 'stats' | 'price' = 'stats',
  ) => {
    const query = source === 'price' ? prices : stats
    const loading =
      source === 'price' ? prices.isLoading : mainnet && stats.isLoading
    const error = query.isError && (source === 'price' || mainnet)
    return (
      <View
        testID="chart-widget"
        style={{ minWidth: 0, width: '100%', flexGrow: 1, flexShrink: 1 }}
        key={title}
      >
        {enough && !error ? (
          child
        ) : (
          <ChartCardSurface style={{ flexGrow: 1 }}>
            {loading ? (
              <>
                <Text variant="body-medium">{title}</Text>
                <Box width={'100%'} height={240} />
              </>
            ) : (
              <EmptyState
                variant="compact"
                title={title}
                illustration={<BarChart3 size={28} />}
                description={
                  error
                    ? t(source === 'price' ? 'priceError' : 'statsError')
                    : t(source === 'price' ? 'noPriceHistory' : 'noHistory')
                }
                action={{
                  label: common('tryAgain'),
                  onPress: () => void query.refetch(),
                }}
              />
            )}
          </ChartCardSurface>
        )}
      </View>
    )
  }
  const section = (key: Group, hint: string, children: ReactNode) =>
    show(key) && (
      <View role="region" aria-labelledby={`charts-${key}`} style={{ gap: 16 }}>
        <View style={{ gap: 4 }}>
          <Text
            role="heading"
            aria-level={2}
            variant="title-3-medium"
            nativeID={`charts-${key}`}
          >
            {t(`group.${key}`)}
          </Text>
          <Muted>{hint}</Muted>
        </View>
        {children}
      </View>
    )

  return (
    <View onLayout={onLayout} style={{ gap: 16 }}>
      <DetailHeader
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <Button
            appearance="outline"
            size="sm"
            onPress={refresh}
            loading={stats.isFetching || prices.isFetching}
            icon={<RefreshCw className="size-4" />}
          >
            {common('refresh')}
          </Button>
        }
      />
      <StatCards
        columns={width >= BREAKPOINTS.lg ? 4 : width >= BREAKPOINTS.sm ? 2 : 1}
        stats={[
          {
            label: t('samples'),
            value: mainnet && stats.isLoading ? '…' : number(count),
            icon: (props) => (
              <Clock
                width={props.width}
                height={props.height}
                color={props.fill}
              />
            ),
            delta: '—',
            deltaColor: 'neutral',
          },
          {
            label: t('observedBlocks'),
            value: number(blocks.length),
            icon: (props) => (
              <Blocks
                width={props.width}
                height={props.height}
                color={props.fill}
              />
            ),
            delta: '—',
            deltaColor: 'neutral',
          },
          {
            label: t('height'),
            value: last ? number(last.height) : '—',
            icon: (props) => (
              <BarChart3
                width={props.width}
                height={props.height}
                color={props.fill}
              />
            ),
            delta: '—',
            deltaColor: 'neutral',
          },
          {
            label: t('connections'),
            value: last ? number(last.connections) : '—',
            icon: (props) => (
              <Network
                width={props.width}
                height={props.height}
                color={props.fill}
              />
            ),
            delta: '—',
            deltaColor: 'neutral',
          },
        ]}
      />
      <Muted>
        {t('observedWindow')} · {period} · {mainnet ? 'Mainnet' : 'Testnet'}
      </Muted>
      {!mainnet && <Admonition>{t('mainnetOnlyNote')}</Admonition>}
      <div className="max-w-full overflow-x-auto pb-1">
        <SegmentedControl
          type="radio"
          label={t('chartGroups')}
          value={group}
          onValueChange={setGroup}
        >
          {GROUPS.map((value) => (
            <SegmentedControlItem key={value} value={value}>
              <SegmentedControlItemText>
                {t(`group.${value}`)}
              </SegmentedControlItemText>
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </div>
      {section(
        'network',
        t('networkHint'),
        <>
          <View
            testID="chart-row"
            style={{
              flexDirection: width >= BREAKPOINTS.md ? 'row' : 'column',
              alignItems: 'stretch',
              gap: 16,
            }}
          >
            {chart(
              t('difficulty'),
              <LineChartCard
                style={{ flexGrow: 1 }}
                title={t('difficulty')}
                data={series('difficulty')}
                headline={last?.difficulty}
                format={number}
                formatAxisValue={compact}
                getPointTitle={(p) => p.label}
                accessibilityLabel={t('difficulty')}
              />,
            )}
            {chart(
              t('supply'),
              <AreaChartCard
                style={{ flexGrow: 1 }}
                title={t('supply')}
                activeIndex={supplyIndex ?? count - 1}
                onActiveIndexChange={setSupplyIndex}
                data={data}
                series={[{ key: 'supply', label: t('supply') }]}
                headline={last?.supply}
                format={fair}
                formatAxisValue={compact}
                accessibilityLabel={t('supply')}
              />,
            )}
          </View>
          <View
            testID="chart-row"
            style={{
              flexDirection: width >= BREAKPOINTS.md ? 'row' : 'column',
              alignItems: 'stretch',
              gap: 16,
            }}
          >
            {chart(
              t('connections'),
              <AgentsChartCard
                style={{ flexGrow: 1 }}
                title={t('connections')}
                data={series('connections')}
                headline={last?.connections ?? 0}
                format={number}
                startLabel={data[0]?.label ?? ''}
                endLabel={data.at(-1)?.label ?? ''}
                accessibilityLabel={t('connections')}
              />,
            )}
            {chart(
              t('mempool'),
              <TokensChartCard
                style={{ flexGrow: 1 }}
                title={t('mempool')}
                data={series('mempoolSize')}
                headline={last?.mempoolSize}
                format={number}
                startLabel={data[0]?.label ?? ''}
                endLabel={data.at(-1)?.label ?? ''}
                accessibilityLabel={t('mempool')}
              />,
            )}
          </View>
          <View
            testID="chart-row"
            style={{
              flexDirection: width >= BREAKPOINTS.md ? 'row' : 'column',
              alignItems: 'stretch',
              gap: 16,
            }}
          >
            {chart(
              t('networkComparison'),
              <ComboChartCard
                style={{ flexGrow: 1 }}
                title={t('networkComparison')}
                activeIndex={comboIndex ?? count - 1}
                onActiveIndexChange={setComboIndex}
                data={data}
                bar={{
                  key: 'mempoolSize',
                  label: t('mempool'),
                  format: number,
                }}
                line={{
                  key: 'connections',
                  label: t('connections'),
                  format: number,
                }}
                headline={last?.mempoolSize}
                caption={() => t('latestSample')}
                accessibilityLabel={t('networkComparison')}
              />,
            )}
            {chart(
              t('sampleProfile'),
              <RadarChartCard
                style={{ flexGrow: 1 }}
                title={t('sampleProfile')}
                data={mempoolBuckets}
                series={[{ key: 'value', label: t('samples') }]}
                max={count}
                headline={count}
                format={number}
                accessibilityLabel={t('sampleProfile')}
              />,
            )}
          </View>
        </>,
      )}
      {section(
        'distribution',
        t('distributionHint'),
        <>
          <View
            testID="chart-row"
            style={{
              flexDirection: width >= BREAKPOINTS.md ? 'row' : 'column',
              alignItems: 'stretch',
              gap: 16,
            }}
          >
            {chart(
              t('supplyFlow'),
              <SankeyChartCard
                style={{ flexGrow: 1 }}
                title={t('supplyFlow')}
                nodes={[
                  { name: t('maxSupply') },
                  ...supplyParts.map((p) => ({ name: p.label })),
                ]}
                links={supplyParts.map((p, index) => ({
                  source: 0,
                  target: index + 1,
                  value: p.value,
                }))}
                headline={MAX_SUPPLY}
                format={fair}
                axisLabels={[t('maxSupply'), t('supplySplit')]}
                accessibilityLabel={t('supplyFlow')}
              />,
            )}
          </View>
          <View
            testID="chart-row"
            style={{
              flexDirection: width >= BREAKPOINTS.lg ? 'row' : 'column',
              alignItems: 'stretch',
              gap: 16,
            }}
          >
            {chart(
              t('supplySplit'),
              <RadialChartCard
                style={{ flexGrow: 1 }}
                title={t('supplySplit')}
                data={supplyParts}
                variant="stacked"
                headline={last?.supply}
                centerCaption="FAIR"
                format={fair}
                accessibilityLabel={t('supplySplit')}
              />,
            )}
            {chart(
              t('mempoolDistribution'),
              <BarListCard
                style={{ flexGrow: 1 }}
                title={t('mempoolDistribution')}
                items={mempoolBuckets}
                metric="value"
                metricLabel={t('samples')}
                format={number}
              />,
            )}
            {chart(
              t('peerThresholds'),
              <FunnelChartCard
                style={{ flexGrow: 1 }}
                title={t('peerThresholds')}
                stages={thresholds}
                headline={count}
                format={number}
                accessibilityLabel={t('peerThresholds')}
              />,
            )}
          </View>
          <View
            testID="chart-row"
            style={{
              flexDirection: width >= BREAKPOINTS.md ? 'row' : 'column',
              alignItems: 'stretch',
              gap: 16,
            }}
          >
            {chart(
              t('sampleShare'),
              <ActivityRingsCard
                style={{ flexGrow: 1 }}
                title={t('sampleShare')}
                rings={mempoolBuckets.map((p) => ({
                  label: p.label,
                  value: `${number(p.value)} / ${number(count)}`,
                  goalPct: count ? (p.value / count) * 100 : 0,
                }))}
                accessibilityLabel={t('sampleShare')}
              />,
            )}
            {chart(
              t('sampleBreakdown'),
              <SleepScoreCard
                style={{ flexGrow: 1 }}
                title={t('sampleBreakdown')}
                scoreLabel={t('samples')}
                metrics={mempoolBuckets.map((p) => ({
                  label: p.label,
                  detail: `${number(p.value)} / ${number(count)}`,
                  score: p.value,
                  max: Math.max(count, 1),
                }))}
                accessibilityLabel={t('sampleBreakdown')}
              />,
            )}
          </View>
          <View
            testID="chart-row"
            style={{
              flexDirection: width >= BREAKPOINTS.md ? 'row' : 'column',
              alignItems: 'stretch',
              gap: 16,
            }}
          >
            {chart(
              t('peerMempool'),
              <ScatterChartCard
                style={{ flexGrow: 1 }}
                title={t('peerMempool')}
                series={[
                  {
                    label: t('samples'),
                    points: rows.map((row) => ({
                      x: row.connections,
                      y: row.mempoolSize,
                      label: stamp(row.time),
                    })),
                  },
                ]}
                axisLabels={[t('connections'), t('mempool')]}
                headline={count}
                format={number}
                formatX={number}
                accessibilityLabel={t('peerMempool')}
              />,
            )}
            {chart(
              t('recentSamples'),
              <HeatmapChartCard
                style={{ flexGrow: 1 }}
                title={t('recentSamples')}
                columns={data.slice(-16).map((row) => row.label)}
                rows={[
                  {
                    label: t('mempool'),
                    values: rows.slice(-16).map((row) => row.mempoolSize),
                  },
                ]}
                headline={last?.mempoolSize}
                format={number}
                legendLabels={[t('lower'), t('higher')]}
              />,
            )}
          </View>
        </>,
      )}
      {section(
        'activity',
        t('activityHint'),
        <>
          <View
            testID="chart-row"
            style={{
              flexDirection: width >= BREAKPOINTS.md ? 'row' : 'column',
              alignItems: 'stretch',
              gap: 16,
            }}
          >
            {chart(
              t('txVolume'),
              <StepsCard
                style={{ flexGrow: 1 }}
                title={t('txVolume')}
                data={sampledTx}
                headline={txTotal}
                format={number}
                totalSuffix={t('observedTransactions')}
                pointSuffix={t('transactions')}
                getPointTitle={(p) => p.label}
                accessibilityLabel={t('txVolume')}
              />,
              blocks.length >= 2,
            )}
            {chart(
              t('blockComparison'),
              <OrdersChartCard
                style={{ flexGrow: 1 }}
                title={t('blockComparison')}
                data={comparisons}
                {...comparisonProps}
                formatValue={number}
                formatAxisValue={compact}
                accessibilityLabel={t('blockComparison')}
              />,
              comparisons.length >= 2,
            )}
          </View>
          <View
            testID="chart-row"
            style={{
              flexDirection: width >= BREAKPOINTS.md ? 'row' : 'column',
              alignItems: 'stretch',
              gap: 16,
            }}
          >
            {chart(
              t('issuance'),
              <EarningsChartCard
                style={{ flexGrow: 1 }}
                title={t('issuance')}
                data={issuance}
                format={fair}
                formatAxisValue={compact}
                getPointTitle={(p) => p.label}
                accessibilityLabel={t('issuance')}
              />,
              issuance.length >= 2,
            )}
            {chart(
              t('issuanceComparison'),
              <RevenueChartCard
                style={{ flexGrow: 1 }}
                title={t('issuanceComparison')}
                data={issuanceComparison}
                {...comparisonProps}
                formatValue={fair}
                formatAxisValue={compact}
                accessibilityLabel={t('issuanceComparison')}
              />,
              issuanceComparison.length >= 2,
            )}
          </View>
          <View
            testID="chart-row"
            style={{
              flexDirection: width >= BREAKPOINTS.md ? 'row' : 'column',
              alignItems: 'stretch',
              gap: 16,
            }}
          >
            {chart(
              t('observedByDay'),
              <StageBarsCard
                style={{ flexGrow: 1 }}
                title={t('observedByDay')}
                stages={days}
                headline={blocks.length}
                format={number}
                showIcons={false}
                accessibilityLabel={t('observedByDay')}
              />,
            )}
            {chart(
              t('observationGrid'),
              <ContributionsCard
                style={{ flexGrow: 1 }}
                title={t('observationGrid')}
                cells={contributionCellsFromDays(
                  days.map((day) => ({ count: day.value, date: day.date })),
                  year,
                  37,
                  locale,
                )}
                total={days
                  .filter((day) => day.date.startsWith(String(year)))
                  .reduce((sum, day) => sum + day.value, 0)}
                activityLabel={t('observedBlocks')}
                format={number}
                stats={[
                  { label: t('observedDays'), value: number(days.length) },
                ]}
              />,
            )}
          </View>
        </>,
      )}
      {show('activity') && (
        <Button appearance="outline" onPress={() => calendar.open()}>
          {t('observationCalendar')}
        </Button>
      )}
      <Dialog
        control={calendar}
        title={t('observationCalendar')}
        maxWidth={640}
      >
        <MostActiveDaysCard
          title={t('observationCalendar')}
          year={year}
          initialMonth={last ? new Date(last.time).getUTCMonth() : 0}
          headline={blocks.length}
          suffix={t('observedBlocks')}
          format={number}
          rings={({ month, day }) => {
            const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const value = dayCounts.get(date)
            return value === undefined ? null : [value / peakDay, 0, 0]
          }}
          getDayLabel={({ month, day }) => {
            const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            return `${date}: ${dayCounts.get(date) ?? '—'} ${t('observedBlocks')}`
          }}
        />
      </Dialog>
      {show('market') && (
        <View role="region" aria-labelledby="charts-market" style={{ gap: 16 }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <View style={{ gap: 4 }}>
              <Text
                role="heading"
                aria-level={2}
                variant="title-3-medium"
                nativeID="charts-market"
              >
                {t('group.market')}
              </Text>
              <Muted>{t('marketHint')}</Muted>
            </View>
            <SegmentedControl
              type="radio"
              label={t('pricePeriod')}
              value={pricePeriod}
              onValueChange={setPricePeriod}
              size="sm"
            >
              {PRICE_PERIODS.map((value) => (
                <SegmentedControlItem key={value} value={value}>
                  <SegmentedControlItemText>
                    {t(`period.${value}`)}
                  </SegmentedControlItemText>
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          </div>
          {chart(
            t('price'),
            <LineChartCard
              style={{ flexGrow: 1 }}
              title={t('price')}
              data={priceRows.map((row) => ({
                label: stamp(row.time),
                value: row.price_usd,
              }))}
              headline={priceRows.at(-1)?.price_usd}
              format={usd}
              formatAxisValue={usd}
              getPointTitle={(p) => p.label}
              accessibilityLabel={t('price')}
            />,
            priceRows.length >= 2,
            'price',
          )}
        </View>
      )}
      {ready && (
        <ChartCardSurface height="auto">
          <ChartHeader
            label={t('difficultyTrend')}
            value={last!.difficulty}
            format={number}
          />
          <Sparkline data={rows.map((row) => row.difficulty)} />
        </ChartCardSurface>
      )}
      <Accordion type="single" value={expanded} onValueChange={setExpanded}>
        <AccordionItem value="source">
          <AccordionTrigger>{t('viewData')}</AccordionTrigger>
          <AccordionContent>
            <DataTable
              layout="inset"
              title={t('observedWindow')}
              summary={t('dataHint')}
              accessibilityLabel={t('observedWindow')}
              rows={rows}
              getRowId={(row) => String(row.time)}
              pageSize={10}
              minWidth={760}
              emptyState={t('noHistory')}
              columns={[
                {
                  id: 'time',
                  header: t('timestamp'),
                  accessor: (row) => row.time,
                  cell: ({ row }) => `${stamp(row.time)} UTC`,
                },
                ...(
                  [
                    'height',
                    'difficulty',
                    'connections',
                    'mempoolSize',
                    'lastBlockTxCount',
                  ] as const
                ).map((key, i) => ({
                  id: key,
                  header: t(
                    [
                      'height',
                      'difficulty',
                      'connections',
                      'mempool',
                      'txVolume',
                    ][i],
                  ),
                  accessor: (row: (typeof rows)[number]) => row[key],
                  cell: ({ row }: { row: (typeof rows)[number] }) =>
                    number(row[key]),
                })),
              ]}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </View>
  )
}
