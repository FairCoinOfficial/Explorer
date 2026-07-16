import { useState } from 'react'
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
import { formatBytes, formatFair, formatNumber } from '@/lib/format'
import { DetailBreadcrumbs } from '@/components/detail/detail-breadcrumbs'
import { DetailHeader } from '@/components/detail/detail-header'
import { SectionCard } from '@/components/detail/section-card'
import { StatTile, StatTileGrid } from '@/components/detail/stat-tile'
import { InfoGrid, InfoRow } from '@/components/detail/info-row'
import { HashCell } from '@/components/detail/hash-cell'
import { RelativeTime } from '@/components/detail/relative-time'
import { ConfirmationMeter } from '@/components/detail/confirmation-meter'
import { RowIndex } from '@/components/detail/row-index'
import { EmptyState } from '@/components/detail/empty-state'
import { Pagination } from '@/components/detail/pagination'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function BlockContent({ hashOrHeight }: { hashOrHeight: string }) {
  const t = useTranslations('block')
  const common = useTranslations('common')
  const nav = useTranslations('nav')
  const { data: block, isLoading, isError, error, refetch, isFetching } = useBlock(hashOrHeight)

  if (isLoading) {
    return <BlockSkeleton />
  }

  if (isError || !block) {
    return (
      <div className="flex-1 space-y-4">
        <DetailBreadcrumbs
          items={[
            { label: nav('blocks'), to: '/blocks' },
            { label: t('notFound') },
          ]}
        />
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
    <div className="flex-1 space-y-4">
      <DetailBreadcrumbs
        items={[
          { label: nav('blocks'), to: '/blocks' },
          { label: `${t('block')} #${formatNumber(block.height)}` },
        ]}
      />
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
        <BlockTransactions txids={block.tx} txValues={block.txValues} />
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
    return <EmptyState icon={Receipt} title={t('noTransactions')} />
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
              <HashCell value={txid} to="tx" fill hideCopy className="min-w-0 flex-1" />
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
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          label={common('page', { current: page, total: totalPages })}
          prevLabel={common('previous')}
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
    <div className="flex-1 space-y-4">
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
