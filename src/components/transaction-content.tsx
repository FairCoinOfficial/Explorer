import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle,
  CheckCircle2,
  Coins,
  Database,
  FileText,
  Hammer,
  Home,
  Info,
  Receipt,
  Send,
  Sprout,
  Undo2,
  XCircle,
} from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import {
  analyzeTransaction,
  isCoinbaseInput,
  useTransaction,
  type ClassifiedOutput,
  type TransactionAnalysis,
  type TransactionInput,
} from '@/hooks/use-transaction'
import { formatNumber } from '@/lib/format'
import { DetailHeader } from '@/components/detail/detail-header'
import { SectionCard } from '@/components/detail/section-card'
import { StatTile, StatTileGrid } from '@/components/detail/stat-tile'
import { InfoGrid, InfoRow } from '@/components/detail/info-row'
import { HashCell } from '@/components/detail/hash-cell'
import { RelativeTime } from '@/components/detail/relative-time'
import { CopyButton } from '@/components/copy-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const ZERO_HASH = '0000000000000000000000000000000000000000000000000000000000000000'

type Translate = (key: string, params?: Record<string, string | number>) => string

/** Confirmations at which a transaction is treated as fully settled for the meter. */
const MATURE_CONFIRMATIONS = 100

/** Gradient fill for the confirmation meter: brand primary → bright accent. */
const PROGRESS_GRADIENT = 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))'

function formatFair(value: number): string {
  return `${value.toFixed(8)} FAIR`
}

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
function describeHero(analysis: TransactionAnalysis, t: Translate): HeroDescriptor {
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
          note: analysis.inputsResolved ? t('changeAmbiguousNote') : t('changeUnknownNote'),
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

/** A label/value pair in the hero's secondary breakdown row. */
function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="font-medium uppercase tracking-wide">{label}</dt>
      <dd className="font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  )
}

export function TransactionContent({ txid }: { txid: string }) {
  const t = useTranslations('tx')
  const common = useTranslations('common')
  const navigate = useNavigate()
  const { data: transaction, isLoading, isError, error, refetch, isFetching } = useTransaction(txid)

  if (isLoading) {
    return <TransactionSkeleton />
  }

  if (isError || !transaction) {
    return (
      <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
        <DetailHeader
          title={t('notFound')}
          subtitle={t('invalidId')}
          onRefresh={() => void refetch()}
          isRefreshing={isFetching}
        />
        <SectionCard>
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="size-6" />
            </span>
            <div className="space-y-1">
              <p className="text-base font-semibold">{t('errorLoading')}</p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : t('transactionNotFound')}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => navigate(`/block/${txid}`)}>
                <Database className="mr-2 size-4" />
                {t('viewAsBlock')}
              </Button>
              <Button variant="outline" asChild>
                <Link to="/">
                  <Home className="mr-2 size-4" />
                  {common('backToHome')}
                </Link>
              </Button>
            </div>
          </div>
        </SectionCard>
      </div>
    )
  }

  const confirmations = transaction.confirmations ?? 0
  const confirmed = confirmations > 0
  const analysis = analyzeTransaction(transaction)
  const hero = describeHero(analysis, t)
  const changeTotal = analysis.outputs
    .filter((entry) => entry.role === 'change')
    .reduce((sum, entry) => sum + entry.output.value, 0)
  const showTotalMovedStat = hero.primaryValue !== analysis.totalOutput
  const hasSecondaryStats = showTotalMovedStat || changeTotal > 0 || analysis.fee !== null

  return (
    <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
      <DetailHeader
        title={t('title')}
        subtitle={t('subtitle')}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching}
      />

      {/* Hero: the amount that actually left the sender (or the reward, for
          generation txs), with total-moved + fee broken out as secondary lines so
          change returned to the sender is never mistaken for the amount sent. */}
      <section className="rounded-2xl border bg-muted/30 p-4 transition-colors hover:bg-muted/40 sm:p-5">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              <hero.icon className="size-4" />
            </span>
            <h3 className="text-sm font-semibold tracking-tight">{hero.title}</h3>
          </div>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              confirmed ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive',
            )}
          >
            {confirmed ? <CheckCircle className="size-3" /> : <XCircle className="size-3" />}
            {confirmed ? common('confirmed') : t('unconfirmed')}
          </span>
        </header>

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
            {formatNumber(hero.primaryValue, 8)}
          </span>
          <span className="text-sm font-medium text-muted-foreground">FAIR · {hero.primaryLabel}</span>
        </div>

        {/* Secondary breakdown. "Total moved" is shown only when the headline isn't
            already the total (i.e. when the headline is "Sent"), so the same number
            never appears twice. Change-returned and fee are shown when meaningful. */}
        {hasSecondaryStats ? (
          <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            {showTotalMovedStat ? (
              <SummaryStat label={t('totalMoved')} value={formatFair(analysis.totalOutput)} />
            ) : null}
            {changeTotal > 0 ? (
              <SummaryStat label={t('changeReturned')} value={formatFair(changeTotal)} />
            ) : null}
            {analysis.fee !== null ? (
              <SummaryStat label={common('fee')} value={formatFair(analysis.fee)} />
            ) : null}
          </dl>
        ) : null}

        {hero.note ? (
          <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-muted/60 px-2.5 py-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            <span>{hero.note}</span>
          </p>
        ) : null}

        <div className="mt-3">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t('transactionId')}
          </span>
          <div className="mt-1">
            <HashCell value={transaction.txid} full />
          </div>
        </div>

        <ConfirmationMeter
          confirmations={confirmations}
          label={common('confirmations')}
          className="mt-4"
        />
      </section>

      {/* Summary tiles */}
      <StatTileGrid>
        <StatTile
          label={hero.tileLabel}
          value={formatFair(hero.primaryValue)}
          icon={hero.icon}
          accent
          hint={hero.tileHint}
        />
        <StatTile
          label={t('totalInput')}
          value={analysis.totalInput !== null ? formatFair(analysis.totalInput) : '—'}
          icon={ArrowDownLeft}
          hint={t('inputsCount', { count: transaction.vin.length })}
        />
        <StatTile
          label={common('fee')}
          value={analysis.fee !== null ? formatFair(analysis.fee) : '—'}
          icon={Receipt}
          hint={analysis.fee === null ? t('feeNotApplicable') : t('networkFeePaid')}
        />
        <StatTile
          label={t('totalOutput')}
          value={formatFair(analysis.totalOutput)}
          icon={ArrowUpRight}
          hint={t('outputsCount', { count: transaction.vout.length })}
        />
      </StatTileGrid>

      {/* Metadata */}
      <SectionCard title={t('transactionInformation')} icon={Coins}>
        <div className="space-y-4">
          <InfoGrid>
            <InfoRow
              label={t('blockTime')}
              value={
                transaction.blocktime ? (
                  <RelativeTime timestamp={transaction.blocktime} />
                ) : (
                  t('pending')
                )
              }
            />
            <InfoRow label={t('version')} value={transaction.version} mono />
            <InfoRow label={t('lockTime')} value={formatNumber(transaction.locktime)} mono />
          </InfoGrid>

          {transaction.blockhash ? (
            <InfoRow
              label={t('blockHash')}
              value={<HashCell value={transaction.blockhash} to="block" full />}
            />
          ) : null}
        </div>
      </SectionCard>

      {/* Inputs */}
      <SectionCard
        title={t('transactionInputs')}
        icon={ArrowDownLeft}
        action={
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {t('inputsCount', { count: transaction.vin.length })}
          </span>
        }
      >
        <ul className="space-y-2">
          {transaction.vin.map((input, index) => (
            <li key={index} className="rounded-xl bg-muted/60 p-3">
              <InputRow input={input} index={index} />
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* Outputs — change/reward outputs are de-emphasized and badged so the real
          recipient output(s) stand out. */}
      <SectionCard
        title={t('transactionOutputs')}
        icon={ArrowUpRight}
        action={
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium tabular-nums text-primary">
            {t('outputsCount', { count: transaction.vout.length })}
          </span>
        }
      >
        <ul className="space-y-2">
          {analysis.outputs.map((entry) => (
            <li
              key={entry.output.n}
              className={cn(
                'rounded-xl p-3',
                entry.role === 'recipient' ? 'bg-muted/60' : 'bg-muted/30',
              )}
            >
              <OutputRow entry={entry} t={t} />
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* Raw hex */}
      <SectionCard title={t('rawTransactionData')} icon={FileText}>
        <div className="flex items-center justify-between gap-2 pb-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('hex')}
          </span>
          <CopyButton text={transaction.hex} className="size-7 shrink-0" />
        </div>
        <code className="block max-h-64 overflow-auto rounded-lg bg-muted/60 p-3 font-mono text-xs break-all whitespace-pre-wrap custom-scrollbar">
          {transaction.hex}
        </code>
      </SectionCard>
    </div>
  )
}

/**
 * Gradient confirmation meter mirroring the home supply bar: a thin track that
 * fills primary→accent and caps at {@link MATURE_CONFIRMATIONS}.
 */
function ConfirmationMeter({
  confirmations,
  label,
  className,
}: {
  confirmations: number
  label: string
  className?: string
}) {
  const fraction = Math.min(Math.max(confirmations, 0) / MATURE_CONFIRMATIONS, 1)
  const fillWidth = confirmations > 0 ? Math.max(fraction * 100, 4) : 0
  const percent = Math.round(fraction * 1000) / 10

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 className="size-3" />
          {label}
        </span>
        <span className="tabular-nums">
          {formatNumber(confirmations)} / {formatNumber(MATURE_CONFIRMATIONS)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={label}
        className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="relative h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${fillWidth}%`, backgroundImage: PROGRESS_GRADIENT }}
        >
          {confirmations > 0 ? (
            <span className="absolute inset-y-0 right-0 w-1.5 rounded-full bg-accent" aria-hidden />
          ) : null}
        </div>
      </div>
    </div>
  )
}

function InputRow({ input, index }: { input: TransactionInput; index: number }) {
  const t = useTranslations('tx')

  if (isCoinbaseInput(input)) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{t('input', { index })}</span>
          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent-foreground">
            {t('coinbaseTransaction')}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{t('coinbaseDescription')}</p>
      </div>
    )
  }

  const prevTxid = input.txid
  const isNullPrev = !prevTxid || prevTxid === ZERO_HASH
  const prevAddress = input.prevout?.addresses?.[0]

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{t('input', { index })}</span>
        {input.prevout ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
            {formatFair(input.prevout.value)}
          </span>
        ) : null}
      </div>
      {isNullPrev ? (
        <span className="text-xs text-muted-foreground">{t('coinbaseTransaction')}</span>
      ) : (
        <>
          {prevAddress ? (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('fromAddress')}
              </span>
              <HashCell value={prevAddress} to="address" full />
            </div>
          ) : null}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('previousTransaction')}
            </span>
            <div className="flex items-center gap-2">
              <HashCell value={prevTxid} to="tx" />
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">#{input.vout}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/** Per-role badge styling + label key for a classified output. */
const OUTPUT_ROLE_META: Record<
  ClassifiedOutput['role'],
  { labelKey: string; variant: React.ComponentProps<typeof Badge>['variant']; icon: typeof Undo2 } | null
> = {
  recipient: null,
  change: { labelKey: 'changeBadge', variant: 'outline', icon: Undo2 },
  reward: { labelKey: 'rewardBadge', variant: 'secondary', icon: Sprout },
  marker: { labelKey: 'markerBadge', variant: 'outline', icon: Info },
}

function OutputRow({ entry, t }: { entry: ClassifiedOutput; t: Translate }) {
  const { output, role } = entry
  const address = output.scriptPubKey.addresses?.[0]
  const meta = OUTPUT_ROLE_META[role]
  const deEmphasized = role !== 'recipient'
  const Icon = meta?.icon

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-sm font-medium">{t('output', { index: output.n })}</span>
          {meta ? (
            <Badge variant={meta.variant} className="gap-1">
              {Icon ? <Icon /> : null}
              {t(meta.labelKey)}
            </Badge>
          ) : null}
        </div>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
            deEmphasized ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary',
          )}
        >
          {formatFair(output.value)}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('scriptType')}
        </span>
        <span className="font-mono text-xs">{output.scriptPubKey.type}</span>
      </div>
      {address ? (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {role === 'change' ? t('changeAddress') : t('address')}
          </span>
          <HashCell
            value={address}
            to="address"
            full
            textClassName={deEmphasized ? 'text-muted-foreground' : undefined}
          />
        </div>
      ) : null}
    </div>
  )
}

function TransactionSkeleton() {
  return (
    <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <Skeleton className="h-[188px] rounded-2xl" />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  )
}
