import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Info,
  Network,
  Users,
} from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { usePeers } from '@/hooks/use-peers'
import { formatNumber } from '@/lib/format'
import { ListHeader } from '@/components/detail/list-header'
import { SectionCard } from '@/components/detail/section-card'
import { StatTile, StatTileGrid } from '@/components/detail/stat-tile'
import { EmptyState } from '@/components/detail/empty-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Peers page — aggregate counts only.
 *
 * `GET /api/peers` redacts IP, client, latency, and traffic. The UI shows the
 * public totals (inbound / outbound) instead of empty per-peer columns.
 */
export default function PeersPage() {
  const t = useTranslations('peers')
  const common = useTranslations('common')
  const { data, isLoading, isError, error, refetch, isFetching } = usePeers()

  if (isLoading) {
    return <PeersSkeleton />
  }

  if (isError || !data) {
    return (
      <div className="flex-1 space-y-4">
        <ListHeader
          title={t('title')}
          subtitle={t('subtitle')}
          onRefresh={() => void refetch()}
          isRefreshing={isFetching}
        />
        <SectionCard>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="size-6" />
            </span>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : t('error')}
            </p>
            <Button variant="outline" onClick={() => void refetch()}>
              {common('tryAgain')}
            </Button>
          </div>
        </SectionCard>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4">
      <ListHeader
        title={t('title')}
        subtitle={t('subtitle')}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching}
        badge={
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
            <Network className="size-3" />
            {t('totalPeers')}: {formatNumber(data.total)}
          </span>
        }
      />

      <StatTileGrid className="grid-cols-2 sm:grid-cols-3">
        <StatTile
          icon={Users}
          label={t('totalPeers')}
          value={formatNumber(data.total)}
          hint={t('connectedNodes')}
          accent
        />
        <StatTile
          icon={ArrowDownLeft}
          label={t('inbound')}
          value={formatNumber(data.inbound)}
          hint={t('peersConnectingToUs')}
        />
        <StatTile
          icon={ArrowUpRight}
          label={t('outbound')}
          value={formatNumber(data.outbound)}
          hint={t('peersWeConnectTo')}
        />
      </StatTileGrid>

      {data.total === 0 ? (
        <SectionCard>
          <EmptyState icon={Users} title={t('noPeers')} tone="muted" />
        </SectionCard>
      ) : null}

      <div className="flex items-start gap-2 rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="space-y-1">
          <p className="font-medium text-foreground">{t('privacyTitle')}</p>
          <p>{t('privacyNote')}</p>
        </div>
      </div>
    </div>
  )
}

function PeersSkeleton() {
  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-16 w-full rounded-xl" />
    </div>
  )
}
