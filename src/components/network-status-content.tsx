import { useMemo } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Gauge,
  Link2,
  Network,
  XCircle,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { useNodeStatus } from '@/hooks/use-node-status'
import { useStatsHistory } from '@/hooks/use-stats-history'
import { useNetwork } from '@/contexts/network-context'
import { formatCompactNumber, formatNumber } from '@/lib/format'
import { DetailHeader } from '@/components/detail/detail-header'
import { SectionCard } from '@/components/detail/section-card'
import { StatTile, StatTileGrid } from '@/components/detail/stat-tile'
import { InfoGrid, InfoRow } from '@/components/detail/info-row'
import { Sparkline } from '@/components/home/sparkline'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type Translate = (key: string, params?: Record<string, string | number>) => string

/** A series needs at least two points before a sparkline reads as a trend. */
const MIN_SPARK_POINTS = 2

function formatHashrate(hashrate: number, idle: string): string {
  if (!Number.isFinite(hashrate) || hashrate <= 0) return idle
  if (hashrate >= 1e12) return `${(hashrate / 1e12).toFixed(2)} TH/s`
  if (hashrate >= 1e9) return `${(hashrate / 1e9).toFixed(2)} GH/s`
  if (hashrate >= 1e6) return `${(hashrate / 1e6).toFixed(2)} MH/s`
  if (hashrate >= 1e3) return `${(hashrate / 1e3).toFixed(2)} KH/s`
  return `${hashrate.toFixed(0)} H/s`
}

export function NetworkStatusContent() {
  const t = useTranslations('network')
  const common = useTranslations('common')
  const { currentNetwork } = useNetwork()
  const { data: status, isLoading, isError, error, refetch, isFetching } = useNodeStatus()
  const { data: statsHistory } = useStatsHistory({ network: currentNetwork })

  // Mainnet-only background series for the time-varying tiles (Connections, Difficulty).
  // Series shorter than MIN_SPARK_POINTS are dropped so the tile stays clean.
  const sparks = useMemo(() => {
    const points = statsHistory ?? []
    if (points.length < MIN_SPARK_POINTS) {
      return { connections: undefined, difficulty: undefined } as const
    }
    return {
      connections: points.map((point) => point.connections),
      difficulty: points.map((point) => point.difficulty),
    } as const
  }, [statsHistory])

  if (isLoading) {
    return <NetworkStatusSkeleton />
  }

  const online = !isError && Boolean(status)

  return (
    <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
      <DetailHeader
        title={t('title')}
        subtitle={t('subtitle')}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching}
        action={
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
              online ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive',
            )}
          >
            <span
              className={cn(
                'size-1.5 rounded-full',
                online ? 'animate-pulse bg-primary' : 'bg-destructive',
              )}
              aria-hidden
            />
            {online ? t('online') : t('offline')}
          </span>
        }
      />

      {isError || !status ? (
        <SectionCard>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="size-6" />
            </span>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : t('offline')}
            </p>
            <Button variant="outline" onClick={() => void refetch()}>
              {common('tryAgain')}
            </Button>
          </div>
        </SectionCard>
      ) : (
        <>
          <StatTileGrid>
            <StatTile
              icon={Database}
              label={t('blockHeight')}
              value={formatNumber(status.blockHeight)}
              hint={t('currentBlockHeight')}
              accent
            />
            <MetricTile
              icon={Link2}
              label={t('connections')}
              value={formatNumber(status.connections)}
              hint={t('peerConnections')}
              spark={sparks.connections}
            />
            <MetricTile
              icon={Gauge}
              label={t('difficulty')}
              value={status.difficulty > 0 ? formatCompactNumber(status.difficulty) : '0'}
              hint={t('networkDifficulty')}
              spark={sparks.difficulty}
            />
            <StatTile
              icon={Zap}
              label={t('hashrate')}
              value={formatHashrate(status.hashrate, t('hashrateIdle'))}
              hint={t('networkHashrate')}
            />
          </StatTileGrid>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Node information */}
            <SectionCard title={t('nodeInformation')} icon={Network}>
              <InfoGrid columns={2}>
                <InfoRow label={t('version')} value={status.subversion || t('unknown')} mono />
                <InfoRow label={t('networkLabel')} value={currentNetwork} />
                <InfoRow label={t('protocolVersion')} value={formatNumber(status.protocolVersion)} mono />
                <InfoRow label={t('chain')} value={status.chain} />
                <InfoRow label={t('mempool')} value={t('transactionsCount', { count: status.pooledTx })} />
                <InfoRow label={t('relayFee')} value={`${status.relayFee} FAIR`} mono />
              </InfoGrid>
            </SectionCard>

            {/* Status indicators */}
            <SectionCard title={t('statusIndicators')} icon={Activity}>
              <div className="space-y-2.5">
                <StatusIndicator ok={online} label={t('nodeConnection')} t={t} />
                <StatusIndicator ok={status.connections > 0} label={t('peerConnections')} t={t} />
                <StatusIndicator ok={status.blockHeight > 0} label={t('blockchainSync')} t={t} />
              </div>
            </SectionCard>
          </div>
        </>
      )}
    </div>
  )
}

interface MetricTileProps {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
  /** Background series for time-varying metrics; too-short series render clean. */
  spark?: number[]
}

/**
 * A {@link StatTile}-styled metric tile with a subtle, non-interactive background
 * sparkline for values that change over time (Connections, Difficulty). Falls back
 * to a clean tile until enough history has accumulated.
 */
function MetricTile({ icon: Icon, label, value, hint, spark }: MetricTileProps) {
  const hasSpark = Boolean(spark && spark.length >= MIN_SPARK_POINTS)

  return (
    <div className="relative flex flex-col gap-1 overflow-hidden rounded-xl bg-muted/60 px-3 py-2.5 transition-colors hover:bg-muted/80">
      {hasSpark && spark ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 opacity-25">
          <Sparkline data={spark} />
        </div>
      ) : null}
      <div className="relative flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <span className="relative truncate text-base font-semibold tabular-nums">{value}</span>
      {hint ? (
        <span className="relative truncate text-[11px] text-muted-foreground tabular-nums">{hint}</span>
      ) : null}
    </div>
  )
}

function StatusIndicator({ ok, label, t }: { ok: boolean; label: string; t: Translate }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2.5">
      <span className="flex items-center gap-2 text-sm">
        {ok ? (
          <CheckCircle2 className="size-4 text-primary" />
        ) : (
          <XCircle className="size-4 text-destructive" />
        )}
        {label}
      </span>
      <span
        className={cn(
          'rounded-full px-2 py-0.5 text-xs font-medium',
          ok ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive',
        )}
      >
        {ok ? t('connected') : t('disconnected')}
      </span>
    </div>
  )
}

function NetworkStatusSkeleton() {
  return (
    <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-44 w-full rounded-xl" />
      </div>
    </div>
  )
}
