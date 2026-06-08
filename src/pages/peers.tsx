import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Network,
  Users,
} from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { usePeers, type Peer } from '@/hooks/use-peers'
import { formatNumber } from '@/lib/format'
import { ListHeader } from '@/components/detail/list-header'
import { SectionCard } from '@/components/detail/section-card'
import { StatTile, StatTileGrid } from '@/components/detail/stat-tile'
import { RelativeTime } from '@/components/detail/relative-time'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type Translate = (key: string, params?: Record<string, string | number>) => string

function cleanSubver(subver: string): string {
  return subver.replace(/^\/(.*)\/$/, '$1')
}

function formatLatency(pingtime: number): string {
  return pingtime > 0 ? `${(pingtime * 1000).toFixed(0)} ms` : '—'
}

export default function PeersPage() {
  const t = useTranslations('peers')
  const common = useTranslations('common')
  const { data, isLoading, isError, error, refetch, isFetching } = usePeers()

  if (isLoading) {
    return <PeersSkeleton />
  }

  if (isError || !data) {
    return (
      <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
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
    <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
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

      <StatTileGrid className="grid-cols-3 lg:grid-cols-3">
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

      <SectionCard
        title={t('title')}
        icon={Network}
        flush
        action={
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {formatNumber(data.total)}
          </span>
        }
      >
        {data.peers.length > 0 ? (
          <>
            {/* Mobile: stacked cards */}
            <ul className="divide-y lg:hidden">
              {data.peers.map((peer) => (
                <PeerCard key={peer.addr} peer={peer} t={t} />
              ))}
            </ul>

            {/* Desktop: table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">{t('tableAddress')}</th>
                    <th className="px-4 py-2.5 font-medium">{t('tableClient')}</th>
                    <th className="px-4 py-2.5 font-medium">{t('tableDirection')}</th>
                    <th className="px-4 py-2.5 text-right font-medium">{t('tableLatency')}</th>
                    <th className="px-4 py-2.5 font-medium">{t('tableConnected')}</th>
                    <th className="px-4 py-2.5 text-right font-medium">{t('tableHeight')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.peers.map((peer) => (
                    <tr key={peer.addr} className="transition-colors hover:bg-muted/40">
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-foreground">
                        {peer.addr}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted-foreground">
                        {cleanSubver(peer.subver) || t('unknown')}
                      </td>
                      <td className="px-4 py-2.5">
                        <DirectionBadge inbound={peer.inbound} t={t} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                        {formatLatency(peer.pingtime)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                        <RelativeTime timestamp={peer.conntime} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                        {formatNumber(peer.synced_headers)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Users className="size-6" />
            </span>
            <p className="text-sm font-medium">{t('noPeers')}</p>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

function DirectionBadge({ inbound, t }: { inbound: boolean; t: Translate }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        inbound ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
      )}
    >
      {inbound ? <ArrowDownLeft className="size-3" /> : <ArrowUpRight className="size-3" />}
      {inbound ? t('inboundBadge') : t('outboundBadge')}
    </span>
  )
}

function PeerCard({ peer, t }: { peer: Peer; t: Translate }) {
  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-mono text-sm">{peer.addr}</span>
        <DirectionBadge inbound={peer.inbound} t={t} />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="truncate font-mono">{cleanSubver(peer.subver) || t('unknown')}</span>
        <span className="text-right tabular-nums">{formatLatency(peer.pingtime)}</span>
        <RelativeTime timestamp={peer.conntime} />
        <span className="text-right font-mono tabular-nums">
          {t('tableHeight')}: {formatNumber(peer.synced_headers)}
        </span>
      </div>
    </li>
  )
}

function PeersSkeleton() {
  return (
    <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
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
      <div className="rounded-xl border bg-muted/40">
        <ul className="divide-y">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="flex items-center justify-between gap-3 px-4 py-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-20" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
