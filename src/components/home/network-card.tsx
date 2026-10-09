import { useNetworkStats } from '@/hooks/use-network-stats'
import { usePeersCount } from '@/hooks/use-peers-count'
import { ExplorerLink as Link } from '@/lib/explorer-navigation'
import { formatNumber } from '@/lib/format'
import { useTranslations } from '@/lib/i18n'
import { Button } from '@oxy.so/bloom/button'
import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@oxy.so/bloom/card'
import { ChartStatTiles } from '@oxy.so/bloom/chart-cards'
import { Chip } from '@oxy.so/bloom/chip'
import { Box } from '@oxy.so/bloom/skeleton'

export function NetworkCard() {
  const t = useTranslations('home')
  const stats = useNetworkStats()
  const peers = usePeersCount()
  return (
    <Card style={{ flexGrow: 1 }}>
      <CardHeader>
        <CardTitle>{t('networkTitle')}</CardTitle>
        {stats.data?.phase && <Chip>{stats.data.phase}</Chip>}
      </CardHeader>
      <CardBody style={{ flexGrow: 1 }}>
        {stats.isLoading ? (
          <Box width="100%" height={120} />
        ) : (
          <ChartStatTiles
            items={[
              {
                label: t('networkConnections'),
                value: stats.data ? formatNumber(stats.data.connections) : '—',
              },
              {
                label: t('networkPeers'),
                value: peers.data ? formatNumber(peers.data.total) : '—',
              },
              {
                label: t('networkMasternodes'),
                value: stats.data
                  ? formatNumber(stats.data.masternodeCount)
                  : '—',
              },
              {
                label: t('statMempool'),
                value: stats.data ? formatNumber(stats.data.memPoolSize) : '—',
              },
            ]}
          />
        )}
      </CardBody>
      <CardFooter>
        <Button appearance="plain" asChild>
          <Link to="/network-status">{t('networkViewStatus')}</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
