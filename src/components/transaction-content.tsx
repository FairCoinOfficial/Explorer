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
  Home,
  Layers,
  Ruler,
  XCircle,
} from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import {
  isCoinbaseInput,
  useTransaction,
  type TransactionInput,
  type TransactionOutput,
} from '@/hooks/use-transaction'
import { formatBytes, formatNumber } from '@/lib/format'
import { DetailHeader } from '@/components/detail/detail-header'
import { SectionCard } from '@/components/detail/section-card'
import { StatTile, StatTileGrid } from '@/components/detail/stat-tile'
import { InfoGrid, InfoRow } from '@/components/detail/info-row'
import { HashCell } from '@/components/detail/hash-cell'
import { RelativeTime } from '@/components/detail/relative-time'
import { CopyButton } from '@/components/copy-button'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const ZERO_HASH = '0000000000000000000000000000000000000000000000000000000000000000'

/** Confirmations at which a transaction is treated as fully settled for the meter. */
const MATURE_CONFIRMATIONS = 100

/** Gradient fill for the confirmation meter: brand primary → bright accent. */
const PROGRESS_GRADIENT = 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))'

function formatFair(value: number): string {
  return `${value.toFixed(8)} FAIR`
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
  const totalOutput = transaction.vout.reduce((sum, output) => sum + output.value, 0)

  return (
    <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
      <DetailHeader
        title={t('title')}
        subtitle={t('subtitle')}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching}
      />

      {/* Hero: total value moved + transaction id + settlement status. */}
      <section className="rounded-2xl border bg-muted/30 p-4 transition-colors hover:bg-muted/40 sm:p-5">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Coins className="size-4" />
            </span>
            <h3 className="text-sm font-semibold tracking-tight">{t('transactionInformation')}</h3>
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

        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
            {formatNumber(totalOutput, 8)}
          </span>
          <span className="text-sm font-medium text-muted-foreground">FAIR · {t('totalOutput')}</span>
        </div>

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
          label={common('status')}
          value={confirmed ? common('confirmed') : t('unconfirmed')}
          icon={confirmed ? CheckCircle : XCircle}
          accent={confirmed}
        />
        <StatTile
          label={common('confirmations')}
          value={formatNumber(confirmations)}
          icon={Layers}
        />
        <StatTile
          label={t('totalOutput')}
          value={formatFair(totalOutput)}
          icon={ArrowUpRight}
          hint={t('outputsCount', { count: transaction.vout.length })}
        />
        <StatTile
          label={common('size')}
          value={transaction.size ? formatBytes(transaction.size) : '—'}
          icon={Ruler}
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

      {/* Outputs */}
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
          {transaction.vout.map((output) => (
            <li key={output.n} className="rounded-xl bg-muted/60 p-3">
              <OutputRow output={output} t={t} />
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

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{t('input', { index })}</span>
      {isNullPrev ? (
        <span className="text-xs text-muted-foreground">{t('coinbaseTransaction')}</span>
      ) : (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('previousTransaction')}
          </span>
          <div className="flex items-center gap-2">
            <HashCell value={prevTxid} to="tx" />
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">#{input.vout}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function OutputRow({
  output,
  t,
}: {
  output: TransactionOutput
  t: (key: string, params?: Record<string, string | number>) => string
}) {
  const address = output.scriptPubKey.addresses?.[0]

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{t('output', { index: output.n })}</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-primary">
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
            {t('address')}
          </span>
          <HashCell value={address} to="address" full />
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
