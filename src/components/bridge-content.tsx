import { DetailHeader } from '@/components/detail/detail-header'
import { HashCell } from '@/components/detail/hash-cell'
import { RelativeTime } from '@/components/detail/relative-time'
import {
  useWfairLiveData,
  useWfairTokenMetadata,
} from '@/hooks/use-wfair-chain-data'
import {
  useWfairReserves,
  type ReservesSnapshot,
} from '@/hooks/use-wfair-reserves'
import { formatCompactNumber } from '@/lib/format'
import { useTranslations } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { WFAIR_CONFIG } from '@/lib/wfair'
import { Button } from '@oxy.so/bloom/button'
import { Card, CardBody, CardHeader, CardTitle } from '@oxy.so/bloom/card'
import { Chip } from '@oxy.so/bloom/chip'
import { Code } from '@oxy.so/bloom/code'
import { EmptyState } from '@oxy.so/bloom/empty-state'
import { Item } from '@oxy.so/bloom/item'
import { Box } from '@oxy.so/bloom/skeleton'
import { Meter } from '@oxy.so/bloom/stat-bar'
import { StatCard } from '@oxy.so/bloom/stat-cards'
import {
  ArrowDownToLine,
  ArrowUpRight,
  Boxes,
  Coins,
  ExternalLink,
  FileJson,
  Flame,
  Gauge,
  Github,
  Pause,
  Play,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Vault,
  Waypoints,
} from 'lucide-react'
import { View } from 'react-native'
import { formatUnits } from 'viem'

const FAIR_DECIMALS = 8
const WFAIR_DECIMALS = 18

/** External destinations surfaced to the user; named to avoid bare magic URLs. */
const BRIDGE_LINKS = {
  buy: 'https://fairco.in/buy',
  unwrap: 'https://fairco.in/unwrap',
} as const

type PegTone = 'healthy' | 'unhealthy' | 'pending'

/** Group a bigint with thousands separators and a trimmed fractional part. */
function formatTokenAmount(value: bigint, decimals: number): string {
  const raw = formatUnits(value, decimals)
  const [whole, fraction = ''] = raw.split('.')
  const wholeFormatted = Number(whole).toLocaleString('en-US')
  const fractionTrimmed = fraction.replace(/0+$/, '').slice(0, 6)
  return fractionTrimmed
    ? `${wholeFormatted}.${fractionTrimmed}`
    : wholeFormatted
}

/** Compact token amount for tiles (e.g. 1.2M FAIR). */
function formatTokenCompact(value: bigint, decimals: number): string {
  return formatCompactNumber(Number(formatUnits(value, decimals)))
}

function formatSignedSats(value: bigint): string {
  const negative = value < 0n
  const abs = negative ? -value : value
  const formatted = formatTokenAmount(abs, FAIR_DECIMALS)
  return negative ? `-${formatted}` : `+${formatted}`
}

/**
 * Collateralization fraction (custody / supply) in the 0..1+ range, computed in
 * bigint space to avoid float drift, then narrowed to a number for display.
 * Returns null when supply is zero (ratio undefined).
 */
function collateralFraction(snapshot: ReservesSnapshot): number | null {
  const custodySats = BigInt(snapshot.fairCustodySats)
  const supplyWei = BigInt(snapshot.wfairSupplyWei)
  if (supplyWei <= 0n) return null
  const scale = 10n ** 18n
  // custody (8dp) and supply (18dp) normalized to a shared 1e18 fixed point.
  const numerator =
    custodySats * 10n ** BigInt(WFAIR_DECIMALS - FAIR_DECIMALS) * scale
  const ratioFixed = numerator / supplyWei
  return Number(ratioFixed) / Number(scale)
}

interface PegState {
  tone: PegTone
  label: string
  icon: typeof ShieldCheck
}

export function BridgeContent() {
  const t = useTranslations('bridge')
  const home = useTranslations('home')
  const common = useTranslations('common')

  const metadata = useWfairTokenMetadata()
  const live = useWfairLiveData()
  const reserves = useWfairReserves()

  const reservesOk = reserves.data?.status === 'ok' ? reserves.data.data : null

  const isRefreshing =
    live.isFetching || reserves.isFetching || metadata.isFetching
  const refresh = () => {
    void live.refetch()
    void reserves.refetch()
    void metadata.refetch()
  }

  const peg: PegState = reservesOk
    ? reservesOk.pegHealthy
      ? { tone: 'healthy', label: home('wfairPegHealthy'), icon: ShieldCheck }
      : {
          tone: 'unhealthy',
          label: home('wfairPegUnhealthy'),
          icon: ShieldAlert,
        }
    : { tone: 'pending', label: home('wfairPegPending'), icon: ShieldQuestion }

  const pegBadge = (
    <Chip
      size="sm"
      tone={
        peg.tone === 'healthy'
          ? 'success'
          : peg.tone === 'unhealthy'
            ? 'danger'
            : 'neutral'
      }
    >
      {peg.label}
    </Chip>
  )

  const supplyDisplay = live.data
    ? `${formatTokenAmount(live.data.totalSupply, metadata.data?.decimals ?? WFAIR_DECIMALS)} ${metadata.data?.symbol ?? 'WFAIR'}`
    : '—'

  const fraction = reservesOk ? collateralFraction(reservesOk) : null
  const collateralPercent =
    fraction === null
      ? null
      : `${(fraction * 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`

  return (
    <View style={{ gap: 16 }}>
      <DetailHeader
        title={t('title')}
        subtitle={t('subtitle')}
        action={pegBadge}
        onRefresh={refresh}
        isRefreshing={isRefreshing}
      />

      {/* Peg health */}
      <Card>
        <CardHeader>
          <CardTitle>{t('pegHealth')}</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            {reserves.isLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Box key={index} width={'100%'} height={16} />
                ))}
              </div>
            ) : reservesOk ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  stat={{
                    label: home('wfairCustody'),
                    value: `${formatTokenCompact(BigInt(reservesOk.fairCustodySats), FAIR_DECIMALS)} FAIR`,
                    icon: (props) => (
                      <Vault
                        width={props.width}
                        height={props.height}
                        color={props.fill}
                      />
                    ),
                    delta: '—',
                    deltaColor: 'neutral',
                    hint: `${formatTokenAmount(BigInt(reservesOk.fairCustodySats), FAIR_DECIMALS)} FAIR`,
                  }}
                />
                <StatCard
                  stat={{
                    label: home('wfairSupply'),
                    value: `${formatTokenCompact(BigInt(reservesOk.wfairSupplyWei), WFAIR_DECIMALS)} WFAIR`,
                    icon: (props) => (
                      <Boxes
                        width={props.width}
                        height={props.height}
                        color={props.fill}
                      />
                    ),
                    delta: '—',
                    deltaColor: 'neutral',
                    hint: `${formatTokenAmount(BigInt(reservesOk.wfairSupplyWei), WFAIR_DECIMALS)} WFAIR`,
                  }}
                />
                <DeltaTile
                  snapshot={reservesOk}
                  label={home('wfairDelta')}
                  hint={t('deltaHint')}
                />
                <StatCard
                  stat={{
                    label: t('collateralization'),
                    value: collateralPercent ?? '—',
                    icon: (props) => (
                      <Gauge
                        width={props.width}
                        height={props.height}
                        color={props.fill}
                      />
                    ),
                    delta: '—',
                    deltaColor: 'neutral',
                    hint: t('collateralHint'),
                  }}
                />
              </div>
            ) : (
              <ReservesUnavailable t={t} />
            )}

            {reservesOk ? (
              <Card clipContent>
                <div className="space-y-2 p-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium uppercase tracking-wide text-muted-foreground">
                      {t('collateralization')}
                    </span>
                    <span
                      className={cn(
                        'font-semibold tabular-nums',
                        peg.tone === 'unhealthy'
                          ? 'text-destructive'
                          : 'text-primary',
                      )}
                    >
                      {collateralPercent ?? '—'}
                    </span>
                  </div>
                  <Meter
                    value={fraction ?? 0}
                    max={1}
                    accessibilityLabel={t('collateralization')}
                  />
                  <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <peg.icon
                        className={cn(
                          'size-3.5',
                          peg.tone === 'healthy' && 'text-primary',
                          peg.tone === 'unhealthy' && 'text-destructive',
                        )}
                      />
                      {peg.tone === 'unhealthy'
                        ? t('pegUnhealthyHint')
                        : t('pegHealthyHint')}
                    </span>
                    <span className="tabular-nums">
                      {t('snapshotLabel')}{' '}
                      <RelativeTime
                        timestamp={Date.parse(reservesOk.at) / 1000}
                      />
                    </span>
                  </div>
                </div>
              </Card>
            ) : null}
          </div>
        </CardBody>
      </Card>

      {/* Token contract */}
      <Card>
        <CardHeader>
          <CardTitle>{t('contractDetails')}</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <Item
              density="compact"
              title={t('contractAddress')}
              subtitle={
                <Card clipContent>
                  <div className="flex flex-wrap items-center gap-2 px-3 py-2">
                    <HashCell
                      value={WFAIR_CONFIG.address}
                      full
                      lead={10}
                      tail={8}
                    />
                    <a
                      href={WFAIR_CONFIG.basescanUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      {t('viewOnBasescan')}
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                </Card>
              }
            />
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <Item
                density="compact"
                title={t('tokenName')}
                subtitle={
                  metadata.isLoading
                    ? '—'
                    : (metadata.data?.name ?? 'Wrapped FairCoin')
                }
              />
              <Item
                density="compact"
                title={t('tokenSymbol')}
                subtitle={
                  metadata.isLoading ? '—' : (metadata.data?.symbol ?? 'WFAIR')
                }
              />
              <Item
                density="compact"
                title={t('tokenDecimals')}
                subtitle={
                  <Code>
                    {metadata.isLoading
                      ? '—'
                      : (metadata.data?.decimals ?? WFAIR_DECIMALS)}
                  </Code>
                }
              />
              <Item
                density="compact"
                title={common('network')}
                subtitle={`${WFAIR_CONFIG.chainName} · ${WFAIR_CONFIG.chainId}`}
              />
              <Item
                density="compact"
                title={t('totalSupply')}
                subtitle={live.isLoading ? '—' : supplyDisplay}
              />
              <Item
                density="compact"
                title={t('deployed')}
                subtitle={<Code>{WFAIR_CONFIG.deployedAt}</Code>}
              />
            </div>
            <div className={`grid gap-4 lg:grid-cols-2`}>
              <ToneTile
                label={t('transferStatus')}
                value={
                  live.data === undefined
                    ? '—'
                    : live.data.paused
                      ? t('paused')
                      : t('active')
                }
                hint={
                  live.data === undefined
                    ? t('readingState')
                    : live.data.paused
                      ? t('transfersDisabled')
                      : t('transfersEnabled')
                }
                icon={live.data?.paused ? Pause : Play}
                tone={
                  live.data === undefined
                    ? 'neutral'
                    : live.data.paused
                      ? 'negative'
                      : 'positive'
                }
              />
              <StatCard
                stat={{
                  label: t('standard'),
                  value: 'ERC-20',
                  icon: (props) => (
                    <Waypoints
                      width={props.width}
                      height={props.height}
                      color={props.fill}
                    />
                  ),
                  delta: '—',
                  deltaColor: 'neutral',
                  hint: `${WFAIR_CONFIG.chainName} · ${WFAIR_CONFIG.chainId}`,
                }}
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle>{t('howItWorks')}</CardTitle>
        </CardHeader>
        <CardBody>
          <ol className="space-y-2">
            {[
              {
                icon: ArrowDownToLine,
                title: t('step1Title'),
                body: t('step1Body'),
              },
              { icon: Coins, title: t('step2Title'), body: t('step2Body') },
              { icon: Flame, title: t('step3Title'), body: t('step3Body') },
            ].map((step, index) => (
              <li key={index}>
                <Card clipContent>
                  <div className="flex items-start gap-3 p-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <step.icon className="size-4" />
                    </span>
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-medium">
                        <span className="mr-1.5 text-muted-foreground tabular-nums">
                          {index + 1}.
                        </span>
                        {step.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {step.body}
                      </p>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>

      {/* Resources */}
      <Card>
        <CardHeader>
          <CardTitle>{t('resources')}</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid gap-2 sm:grid-cols-2">
            <ResourceLink
              href={BRIDGE_LINKS.buy}
              icon={ArrowUpRight}
              title={t('buyTitle')}
              description={t('buyDesc')}
            />
            <ResourceLink
              href={BRIDGE_LINKS.unwrap}
              icon={ArrowDownToLine}
              title={t('unwrapTitle')}
              description={t('unwrapDesc')}
            />
            <ResourceLink
              href={WFAIR_CONFIG.basescanUrl}
              icon={ExternalLink}
              title={t('basescanTitle')}
              description={t('basescanDesc')}
            />
            <ResourceLink
              href={WFAIR_CONFIG.tokenListUrl}
              icon={FileJson}
              title={t('tokenListTitle')}
              description={t('tokenListDesc')}
            />
            <ResourceLink
              href={WFAIR_CONFIG.landingUrl}
              icon={Waypoints}
              title={t('landingTitle')}
              description={t('landingDesc')}
            />
            <ResourceLink
              href={WFAIR_CONFIG.repoUrl}
              icon={Github}
              title={t('repoTitle')}
              description={t('repoDesc')}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {t('footnote', { chainId: WFAIR_CONFIG.chainId })}
          </p>
        </CardBody>
      </Card>
    </View>
  )
}

interface ResourceLinkProps {
  href: string
  icon: typeof ExternalLink
  title: string
  description: string
}

function ResourceLink({
  href,
  icon: Icon,
  title,
  description,
}: ResourceLinkProps) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener">
      <Item
        title={title}
        subtitle={description}
        leading={<Icon size={20} />}
        trailing={<ArrowUpRight size={16} />}
      />
    </a>
  )
}

type TileTone = 'neutral' | 'positive' | 'negative'

interface ToneTileProps {
  label: string
  value: string
  icon: typeof ShieldCheck
  hint?: string
  /** Tints the value: positive/negative map to primary/destructive tokens. */
  tone?: TileTone
}

/**
 * Bloom metric with a semantic status for
 * paused transfers and negative peg delta.
 */
function ToneTile({
  label,
  value,
  icon: Icon,
  hint,
  tone = 'neutral',
}: ToneTileProps) {
  return (
    <StatCard
      stat={{
        label,
        value,
        hint,
        icon: (props) => (
          <Icon width={props.width} height={props.height} color={props.fill} />
        ),
        delta: '—',
        deltaColor:
          tone === 'negative'
            ? 'rose'
            : tone === 'positive'
              ? 'lime'
              : 'neutral',
      }}
    />
  )
}

function DeltaTile({
  snapshot,
  label,
  hint,
}: {
  snapshot: ReservesSnapshot
  label: string
  hint: string
}) {
  const negative = BigInt(snapshot.deltaSats) < 0n
  return (
    <ToneTile
      label={label}
      value={`${formatSignedSats(BigInt(snapshot.deltaSats))} FAIR`}
      hint={hint}
      icon={Coins}
      tone={negative ? 'negative' : 'positive'}
    />
  )
}

function ReservesUnavailable({
  t,
}: {
  t: (key: string, params?: Record<string, string | number>) => string
}) {
  return (
    <EmptyState
      variant="compact"
      title={t('reservesUnavailableTitle')}
      description={t('reservesUnavailableBody')}
      illustration={<ShieldQuestion size={28} />}
      footer={
        <Button
          appearance="plain"
          href={WFAIR_CONFIG.repoUrl}
          target="_blank"
          rel="noreferrer"
          icon={<Github size={16} />}
        >
          {t('repoTitle')}
        </Button>
      }
    />
  )
}
