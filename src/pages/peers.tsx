import { DetailHeader } from '@/components/detail/detail-header'
import { PageLoading } from '@/components/page-loading'
import { usePeers } from '@/hooks/use-peers'
import { formatNumber } from '@/lib/format'
import { useTranslations } from '@/lib/i18n'
import { Card, CardBody } from '@oxy.so/bloom/card'
import { EmptyState } from '@oxy.so/bloom/empty-state'
import { StatCards } from '@oxy.so/bloom/stat-cards'
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Info,
  Users,
} from 'lucide-react'
import { View } from 'react-native'

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
    return <PageLoading />
  }

  if (isError || !data) {
    return (
      <View style={{ gap: 16 }}>
        <DetailHeader
          title={t('title')}
          subtitle={t('subtitle')}
          onRefresh={() => void refetch()}
          isRefreshing={isFetching}
        />
        <Card>
          <CardBody>
            <EmptyState
              variant="compact"
              title={common('error')}
              description={error instanceof Error ? error.message : t('error')}
              illustration={<AlertTriangle size={28} />}
              action={{
                label: common('tryAgain'),
                onPress: () => void refetch(),
              }}
            />
          </CardBody>
        </Card>
      </View>
    )
  }

  return (
    <View style={{ gap: 16 }}>
      <DetailHeader
        title={t('title')}
        subtitle={t('subtitle')}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching}
      />

      <StatCards
        stats={[
          {
            label: t('totalPeers'),
            value: formatNumber(data.total),
            icon: (props) => (
              <Users
                width={props.width}
                height={props.height}
                color={props.fill}
              />
            ),
            delta: '—',
            deltaColor: 'neutral',
            hint: t('connectedNodes'),
          },
          {
            label: t('inbound'),
            value: formatNumber(data.inbound),
            icon: (props) => (
              <ArrowDownLeft
                width={props.width}
                height={props.height}
                color={props.fill}
              />
            ),
            delta: '—',
            deltaColor: 'neutral',
            hint: t('peersConnectingToUs'),
          },
          {
            label: t('outbound'),
            value: formatNumber(data.outbound),
            icon: (props) => (
              <ArrowUpRight
                width={props.width}
                height={props.height}
                color={props.fill}
              />
            ),
            delta: '—',
            deltaColor: 'neutral',
            hint: t('peersWeConnectTo'),
          },
        ]}
      />

      {data.total === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              variant="compact"
              illustration={<Users size={24} />}
              title={t('noPeers')}
            />
          </CardBody>
        </Card>
      ) : null}

      <Card clipContent>
        <div className="flex items-start gap-2 px-4 py-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">{t('privacyTitle')}</p>
            <p>{t('privacyNote')}</p>
          </div>
        </div>
      </Card>
    </View>
  )
}
