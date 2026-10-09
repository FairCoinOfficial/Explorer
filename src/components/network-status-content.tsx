import { DetailHeader } from '@/components/detail/detail-header'
import { PageLoading } from '@/components/page-loading'
import { useNetwork } from '@/contexts/network-context'
import { useNodeStatus } from '@/hooks/use-node-status'
import { useStatsHistory } from '@/hooks/use-stats-history'
import { formatCompactNumber, formatNumber } from '@/lib/format'
import { useTranslations } from '@/lib/i18n'
import { Card, CardBody, CardHeader, CardTitle } from '@oxy.so/bloom/card'
import { Sparkline } from '@oxy.so/bloom/chart-cards'
import { Chip } from '@oxy.so/bloom/chip'
import { Code } from '@oxy.so/bloom/code'
import { EmptyState } from '@oxy.so/bloom/empty-state'
import { Item } from '@oxy.so/bloom/item'
import { StatCard } from '@oxy.so/bloom/stat-cards'
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Gauge,
  Link2,
  XCircle,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useMemo } from 'react'
import { View } from 'react-native'

type Translate = (
  key: string,
  params?: Record<string, string | number>,
) => string

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
  const {
    data: status,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useNodeStatus()
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
    return <PageLoading />
  }

  const online = !isError && Boolean(status)

  return (
    <View style={{ gap: 16 }}>
      <DetailHeader
        title={t('title')}
        subtitle={t('subtitle')}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching}
        action={
          <Chip size="sm" tone={online ? 'success' : 'danger'}>
            {online ? t('online') : t('offline')}
          </Chip>
        }
      />

      {isError || !status ? (
        <Card>
          <CardBody>
            <EmptyState
              variant="compact"
              title={common('error')}
              description={
                error instanceof Error ? error.message : t('offline')
              }
              illustration={<AlertTriangle size={28} />}
              action={{
                label: common('tryAgain'),
                onPress: () => void refetch(),
              }}
            />
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              stat={{
                label: t('blockHeight'),
                value: formatNumber(status.blockHeight),
                icon: (props) => (
                  <Database
                    width={props.width}
                    height={props.height}
                    color={props.fill}
                  />
                ),
                delta: '—',
                deltaColor: 'neutral',
                hint: t('currentBlockHeight'),
              }}
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
              value={
                status.difficulty > 0
                  ? formatCompactNumber(status.difficulty)
                  : '0'
              }
              hint={t('networkDifficulty')}
              spark={sparks.difficulty}
            />
            <StatCard
              stat={{
                label: t('hashrate'),
                value: formatHashrate(status.hashrate, t('hashrateIdle')),
                icon: (props) => (
                  <Zap
                    width={props.width}
                    height={props.height}
                    color={props.fill}
                  />
                ),
                delta: '—',
                deltaColor: 'neutral',
                hint: t('networkHashrate'),
              }}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Node information */}
            <Card>
              <CardHeader>
                <CardTitle>{t('nodeInformation')}</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <Item
                    density="compact"
                    title={t('version')}
                    subtitle={<Code>{status.subversion || t('unknown')}</Code>}
                  />
                  <Item
                    density="compact"
                    title={t('networkLabel')}
                    subtitle={currentNetwork}
                  />
                  <Item
                    density="compact"
                    title={t('protocolVersion')}
                    subtitle={
                      <Code>{formatNumber(status.protocolVersion)}</Code>
                    }
                  />
                  <Item
                    density="compact"
                    title={t('chain')}
                    subtitle={status.chain}
                  />
                  <Item
                    density="compact"
                    title={t('mempool')}
                    subtitle={t('transactionsCount', {
                      count: status.pooledTx,
                    })}
                  />
                  <Item
                    density="compact"
                    title={t('relayFee')}
                    subtitle={<Code>{`${status.relayFee} FAIR`}</Code>}
                  />
                </div>
              </CardBody>
            </Card>

            {/* Status indicators */}
            <Card>
              <CardHeader>
                <CardTitle>{t('statusIndicators')}</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="space-y-2.5">
                  <StatusIndicator
                    ok={online}
                    label={t('nodeConnection')}
                    t={t}
                  />
                  <StatusIndicator
                    ok={status.connections > 0}
                    label={t('peerConnections')}
                    t={t}
                  />
                  <StatusIndicator
                    ok={status.blockHeight > 0}
                    label={t('blockchainSync')}
                    t={t}
                  />
                </div>
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </View>
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

function MetricTile({
  icon: Icon,
  label,
  value,
  hint,
  spark,
}: MetricTileProps) {
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
        deltaColor: 'neutral',
        accessory:
          spark && spark.length >= MIN_SPARK_POINTS ? (
            <Sparkline data={spark} width={80} height={28} />
          ) : undefined,
      }}
    />
  )
}

function StatusIndicator({
  ok,
  label,
  t,
}: {
  ok: boolean
  label: string
  t: Translate
}) {
  return (
    <Card>
      <Item
        title={label}
        leading={ok ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
        trailing={
          <Chip size="sm" tone={ok ? 'success' : 'danger'}>
            {ok ? t('connected') : t('disconnected')}
          </Chip>
        }
      />
    </Card>
  )
}
