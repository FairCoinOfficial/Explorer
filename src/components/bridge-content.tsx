import { formatUnits } from 'viem'
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
  Info,
  Link2,
  Pause,
  Play,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Vault,
  Waypoints,
} from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import {
  useWfairLiveData,
  useWfairTokenMetadata,
} from '@/hooks/use-wfair-chain-data'
import { useWfairReserves, type ReservesSnapshot } from '@/hooks/use-wfair-reserves'
import { WFAIR_CONFIG } from '@/lib/wfair'
import { formatCompactNumber } from '@/lib/format'
import { DetailHeader } from '@/components/detail/detail-header'
import { SectionCard } from '@/components/detail/section-card'
import { StatTile, StatTileGrid } from '@/components/detail/stat-tile'
import { InfoGrid, InfoRow } from '@/components/detail/info-row'
import { HashCell } from '@/components/detail/hash-cell'
import { RelativeTime } from '@/components/detail/relative-time'
import { ProgressBar } from '@/components/detail/progress-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const FAIR_DECIMALS = 8
const WFAIR_DECIMALS = 18

/** External destinations surfaced to the user; named to avoid bare magic URLs. */
const BRIDGE_LINKS = {
  buy: 'https://buy.fairco.in',
  unwrap: 'https://fairco.in/unwrap',
} as const

type PegTone = 'healthy' | 'unhealthy' | 'pending'

/** Group a bigint with thousands separators and a trimmed fractional part. */
function formatTokenAmount(value: bigint, decimals: number): string {
  const raw = formatUnits(value, decimals)
  const [whole, fraction = ''] = raw.split('.')
  const wholeFormatted = Number(whole).toLocaleString('en-US')
  const fractionTrimmed = fraction.replace(/0+$/, '').slice(0, 6)
  return fractionTrimmed ? `${wholeFormatted}.${fractionTrimmed}` : wholeFormatted
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
  const numerator = custodySats * 10n ** BigInt(WFAIR_DECIMALS - FAIR_DECIMALS) * scale
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
  const reservesUnavailable = reserves.data?.status === 'unavailable'

  const isRefreshing = live.isFetching || reserves.isFetching || metadata.isFetching
  const refresh = () => {
    void live.refetch()
    void reserves.refetch()
    void metadata.refetch()
  }

  const peg: PegState = reservesOk
    ? reservesOk.pegHealthy
      ? { tone: 'healthy', label: home('wfairPegHealthy'), icon: ShieldCheck }
      : { tone: 'unhealthy', label: home('wfairPegUnhealthy'), icon: ShieldAlert }
    : { tone: 'pending', label: home('wfairPegPending'), icon: ShieldQuestion }

  const pegBadge = (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
        peg.tone === 'healthy' && 'bg-primary/10 text-primary',
        peg.tone === 'unhealthy' && 'bg-destructive/10 text-destructive',
        peg.tone === 'pending' && 'bg-muted/70 text-muted-foreground',
      )}
    >
      <peg.icon className="size-3.5" />
      {peg.label}
    </span>
  )

  const supplyDisplay = live.data
    ? `${formatTokenAmount(live.data.totalSupply, metadata.data?.decimals ?? WFAIR_DECIMALS)} ${metadata.data?.symbol ?? 'WFAIR'}`
    : '—'

  const fraction = reservesOk ? collateralFraction(reservesOk) : null
  const collateralPercent =
    fraction === null ? null : `${(fraction * 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`

  return (
    <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
      <DetailHeader
        title={t('title')}
        subtitle={t('subtitle')}
        action={pegBadge}
        onRefresh={refresh}
        isRefreshing={isRefreshing}
      />

      {/* Peg health */}
      <SectionCard title={t('pegHealth')} icon={Gauge}>
        <div className="space-y-4">
          {reserves.isLoading ? (
            <StatTileGrid>
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-[4.5rem] rounded-xl" />
              ))}
            </StatTileGrid>
          ) : reservesOk ? (
            <StatTileGrid>
              <StatTile
                label={home('wfairCustody')}
                value={`${formatTokenCompact(BigInt(reservesOk.fairCustodySats), FAIR_DECIMALS)} FAIR`}
                hint={`${formatTokenAmount(BigInt(reservesOk.fairCustodySats), FAIR_DECIMALS)} FAIR`}
                icon={Vault}
              />
              <StatTile
                label={home('wfairSupply')}
                value={`${formatTokenCompact(BigInt(reservesOk.wfairSupplyWei), WFAIR_DECIMALS)} WFAIR`}
                hint={`${formatTokenAmount(BigInt(reservesOk.wfairSupplyWei), WFAIR_DECIMALS)} WFAIR`}
                icon={Boxes}
              />
              <DeltaTile snapshot={reservesOk} label={home('wfairDelta')} hint={t('deltaHint')} />
              <StatTile
                label={t('collateralization')}
                value={collateralPercent ?? '—'}
                hint={t('collateralHint')}
                icon={Gauge}
                accent={peg.tone === 'healthy'}
              />
            </StatTileGrid>
          ) : (
            <ReservesUnavailable t={t} />
          )}

          {reservesOk ? (
            <div className="space-y-2 rounded-xl bg-muted/50 p-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium uppercase tracking-wide text-muted-foreground">
                  {t('collateralization')}
                </span>
                <span
                  className={cn(
                    'font-semibold tabular-nums',
                    peg.tone === 'unhealthy' ? 'text-destructive' : 'text-primary',
                  )}
                >
                  {collateralPercent ?? '—'}
                </span>
              </div>
              <ProgressBar
                value={fraction ?? 0}
                label={t('collateralization')}
                className={cn(peg.tone === 'unhealthy' && '[&>div]:bg-destructive')}
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
                  {peg.tone === 'unhealthy' ? t('pegUnhealthyHint') : t('pegHealthyHint')}
                </span>
                <span className="tabular-nums">
                  {t('snapshotLabel')} <RelativeTime timestamp={Date.parse(reservesOk.at) / 1000} />
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </SectionCard>

      {/* Token contract */}
      <SectionCard title={t('contractDetails')} icon={ScrollText}>
        <div className="space-y-4">
          <InfoRow
            label={t('contractAddress')}
            value={
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/60 px-3 py-2">
                <HashCell value={WFAIR_CONFIG.address} full lead={10} tail={8} />
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
            }
          />
          <InfoGrid>
            <InfoRow
              label={t('tokenName')}
              value={metadata.isLoading ? '—' : (metadata.data?.name ?? 'Wrapped FairCoin')}
            />
            <InfoRow
              label={t('tokenSymbol')}
              value={metadata.isLoading ? '—' : (metadata.data?.symbol ?? 'WFAIR')}
            />
            <InfoRow
              label={t('tokenDecimals')}
              value={metadata.isLoading ? '—' : (metadata.data?.decimals ?? WFAIR_DECIMALS)}
              mono
            />
            <InfoRow label={common('network')} value={`${WFAIR_CONFIG.chainName} · ${WFAIR_CONFIG.chainId}`} />
            <InfoRow
              label={t('totalSupply')}
              value={live.isLoading ? '—' : supplyDisplay}
            />
            <InfoRow label={t('deployed')} value={WFAIR_CONFIG.deployedAt} mono />
          </InfoGrid>
          <StatTileGrid className="lg:grid-cols-2">
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
              tone={live.data === undefined ? 'neutral' : live.data.paused ? 'negative' : 'positive'}
            />
            <StatTile
              label={t('standard')}
              value="ERC-20"
              hint={`${WFAIR_CONFIG.chainName} · ${WFAIR_CONFIG.chainId}`}
              icon={Waypoints}
            />
          </StatTileGrid>
        </div>
      </SectionCard>

      {/* How it works */}
      <SectionCard title={t('howItWorks')} icon={Info}>
        <ol className="space-y-2">
          {[
            { icon: ArrowDownToLine, title: t('step1Title'), body: t('step1Body') },
            { icon: Coins, title: t('step2Title'), body: t('step2Body') },
            { icon: Flame, title: t('step3Title'), body: t('step3Body') },
          ].map((step, index) => (
            <li key={index} className="flex items-start gap-3 rounded-xl bg-muted/50 p-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <step.icon className="size-4" />
              </span>
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium">
                  <span className="mr-1.5 text-muted-foreground tabular-nums">{index + 1}.</span>
                  {step.title}
                </p>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </SectionCard>

      {/* Resources */}
      <SectionCard title={t('resources')} icon={Link2}>
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
      </SectionCard>
    </div>
  )
}

interface ResourceLinkProps {
  href: string
  icon: typeof ExternalLink
  title: string
  description: string
}

function ResourceLink({ href, icon: Icon, title, description }: ResourceLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="group flex items-center justify-between gap-3 rounded-xl bg-muted/50 p-3 transition-colors hover:bg-muted"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{title}</span>
          <span className="block truncate text-xs text-muted-foreground">{description}</span>
        </span>
      </span>
      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
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
 * Tone-aware sibling of {@link StatTile} that additionally supports a destructive
 * value (e.g. paused transfers, negative peg delta), matching the home WFAIR card.
 */
function ToneTile({ label, value, icon: Icon, hint, tone = 'neutral' }: ToneTileProps) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-muted/60 px-3 py-2.5 transition-colors hover:bg-muted/80">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <span
        className={cn(
          'truncate text-base font-semibold tabular-nums',
          tone === 'positive' && 'text-primary',
          tone === 'negative' && 'text-destructive',
        )}
      >
        {value}
      </span>
      {hint ? (
        <span className="truncate text-[11px] text-muted-foreground tabular-nums">{hint}</span>
      ) : null}
    </div>
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
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-muted/30 p-6 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <ShieldQuestion className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium">{t('reservesUnavailableTitle')}</p>
        <p className="text-sm text-muted-foreground">{t('reservesUnavailableBody')}</p>
      </div>
      <a
        href={WFAIR_CONFIG.repoUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        <Github className="size-3.5" />
        {t('repoTitle')}
      </a>
    </div>
  )
}
