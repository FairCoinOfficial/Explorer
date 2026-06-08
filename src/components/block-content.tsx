import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Blocks,
  CheckCircle2,
  Database,
  Layers,
  Receipt,
  Ruler,
} from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { useBlock } from '@/hooks/use-block'
import { formatBytes, formatNumber } from '@/lib/format'
import { DetailHeader } from '@/components/detail/detail-header'
import { SectionCard } from '@/components/detail/section-card'
import { StatTile, StatTileGrid } from '@/components/detail/stat-tile'
import { InfoGrid, InfoRow } from '@/components/detail/info-row'
import { HashCell } from '@/components/detail/hash-cell'
import { RelativeTime } from '@/components/detail/relative-time'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** Confirmations at which a block is treated as fully matured for the progress meter. */
const MATURE_CONFIRMATIONS = 100

/** Gradient fill for confirmation/progress meters: brand primary → bright accent. */
const PROGRESS_GRADIENT = 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))'

export function BlockContent({ hashOrHeight }: { hashOrHeight: string }) {
  const t = useTranslations('block')
  const common = useTranslations('common')
  const { data: block, isLoading, isError, error, refetch, isFetching } = useBlock(hashOrHeight)

  if (isLoading) {
    return <BlockSkeleton />
  }

  if (isError || !block) {
    return (
      <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
        <DetailHeader
          title={t('notFound')}
          subtitle={t('details')}
          onRefresh={() => void refetch()}
          isRefreshing={isFetching}
        />
        <SectionCard>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="size-6" />
            </span>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : t('notFound')}
            </p>
            <Button variant="outline" onClick={() => void refetch()}>
              {common('tryAgain')}
            </Button>
          </div>
        </SectionCard>
      </div>
    )
  }

  const txCount = block.nTx ?? block.tx.length
  const confirmations = block.confirmations

  return (
    <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
      <DetailHeader
        title={`${t('block')} #${formatNumber(block.height)}`}
        subtitle={t('details')}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching}
        action={
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
            <Database className="size-3" />
            {common('transactions')}: {formatNumber(txCount)}
          </span>
        }
      />

      {/* Hero: block height + hash as the confident primary identity. */}
      <section className="rounded-2xl border bg-muted/30 p-4 transition-colors hover:bg-muted/40 sm:p-5">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Blocks className="size-4" />
            </span>
            <h3 className="text-sm font-semibold tracking-tight">{t('blockInformation')}</h3>
          </div>
          <ConfirmationPill confirmations={confirmations} label={common('confirmations')} />
        </header>

        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
            #{formatNumber(block.height)}
          </span>
          <span className="text-sm font-medium text-muted-foreground">{t('blockHeight')}</span>
        </div>

        <div className="mt-3">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t('blockHash')}
          </span>
          <div className="mt-1">
            <HashCell value={block.hash} full />
          </div>
        </div>

        <ConfirmationMeter
          confirmations={confirmations}
          label={common('confirmations')}
          className="mt-4"
        />
      </section>

      <StatTileGrid>
        <StatTile label={t('blockHeight')} value={formatNumber(block.height)} icon={Blocks} accent />
        <StatTile label={common('transactions')} value={formatNumber(txCount)} icon={Receipt} />
        <StatTile
          label={t('blockSize')}
          value={formatBytes(block.size)}
          icon={Ruler}
          hint={`${formatNumber(block.size)} ${t('bytes')}`}
        />
        <StatTile
          label={common('confirmations')}
          value={formatNumber(confirmations)}
          icon={Layers}
        />
      </StatTileGrid>

      {/* Block metadata */}
      <SectionCard title={t('blockInformation')} icon={Database}>
        <div className="space-y-4">
          <InfoGrid>
            <InfoRow label={t('timestamp')} value={<RelativeTime timestamp={block.time} />} />
            <InfoRow label={t('difficulty')} value={block.difficulty.toFixed(6)} mono />
            <InfoRow label={t('nonce')} value={formatNumber(block.nonce)} mono />
            <InfoRow label={t('version')} value={block.version} mono />
            <InfoRow label={t('bits')} value={block.bits} mono />
            <InfoRow
              label={t('weight')}
              value={block.weight ? formatNumber(block.weight) : '—'}
              mono
            />
          </InfoGrid>

          <InfoRow label={t('merkleRoot')} value={<HashCell value={block.merkleroot} full />} />

          {block.previousblockhash ? (
            <InfoRow
              label={t('previousBlock')}
              value={<HashCell value={block.previousblockhash} to="block" full />}
            />
          ) : null}
          {block.nextblockhash ? (
            <InfoRow
              label={t('nextBlock')}
              value={<HashCell value={block.nextblockhash} to="block" full />}
            />
          ) : null}
        </div>
      </SectionCard>

      {/* Prev / next pill navigation */}
      <div className="flex items-center justify-between gap-2">
        <NavPill
          to={block.previousblockhash ? `/block/${block.height - 1}` : undefined}
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
      <SectionCard
        title={t('transactionsList')}
        icon={Receipt}
        flush
        action={
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium tabular-nums text-primary">
            {formatNumber(txCount)} {common('transactions')}
          </span>
        }
      >
        {block.tx.length > 0 ? (
          <ul className="divide-y">
            {block.tx.map((txid, index) => (
              <li
                key={txid}
                className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40"
              >
                <span className="w-10 shrink-0 text-xs text-muted-foreground tabular-nums">
                  #{index}
                </span>
                <HashCell value={txid} to="tx" lead={10} tail={8} className="min-w-0 flex-1" />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex min-h-[120px] items-center justify-center px-4 py-8 text-center text-sm text-muted-foreground">
            {t('noTransactions')}
          </div>
        )}
      </SectionCard>
    </div>
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
  const confirmed = confirmations > 0

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums',
        confirmed ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
      )}
    >
      <CheckCircle2 className="size-3" />
      {formatNumber(confirmations)} {label}
    </span>
  )
}

/**
 * Gradient confirmation meter mirroring the home supply bar: a thin track that
 * fills primary→accent and caps at {@link MATURE_CONFIRMATIONS}, giving a tasteful
 * read on how deeply a block is buried without overstating tiny counts.
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
  // Keep a sliver of fill visible for any confirmed block so it never reads empty.
  const fillWidth = confirmations > 0 ? Math.max(fraction * 100, 4) : 0
  const percent = Math.round(fraction * 1000) / 10

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>{label}</span>
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

function NavPill({
  to,
  direction,
  label,
}: {
  to: string | undefined
  direction: 'prev' | 'next'
  label: string
}) {
  const content = (
    <>
      {direction === 'prev' ? <ArrowLeft className="size-4" /> : null}
      {label}
      {direction === 'next' ? <ArrowRight className="size-4" /> : null}
    </>
  )

  const classes = cn(
    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
    to
      ? 'bg-muted/40 hover:bg-muted/70'
      : 'pointer-events-none cursor-not-allowed bg-muted/20 text-muted-foreground opacity-50',
  )

  if (!to) {
    return <span className={classes}>{content}</span>
  }

  return (
    <Link to={to} className={classes}>
      {content}
    </Link>
  )
}

function BlockSkeleton() {
  return (
    <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <Skeleton className="h-[188px] rounded-2xl" />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-60 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  )
}
