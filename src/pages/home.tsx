import { GithubCard } from '@/components/home/github-card'
import { HomeHeader } from '@/components/home/home-header'
import { LatestTxList } from '@/components/home/latest-tx-list'
import { NetworkCard } from '@/components/home/network-card'
import { PriceCard } from '@/components/home/price-card'
import { RecentBlocksList } from '@/components/home/recent-blocks-list'
import { StatStrip } from '@/components/home/stat-strip'
import { SupplyBar } from '@/components/home/supply-bar'
import { WfairCard } from '@/components/home/wfair-card'
import { useRecentBlocks } from '@/hooks/use-recent-blocks'
import { View } from 'react-native'

const BLOCKS_LIMIT = 20
const TX_FEED_LIMIT = 20

export default function HomePage() {
  const { data, isLoading, isError } = useRecentBlocks(BLOCKS_LIMIT)
  const blocks = data?.blocks
  const height = data?.height

  return (
    <View style={{ gap: 16 }}>
      <HomeHeader />

      <StatStrip height={height} />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        <View
          style={{ flexGrow: 1, flexShrink: 1, flexBasis: 400, minWidth: 0 }}
        >
          <SupplyBar />
        </View>
        <View
          style={{ flexGrow: 1, flexShrink: 1, flexBasis: 400, minWidth: 0 }}
        >
          <PriceCard />
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        <View
          style={{ flexGrow: 1, flexShrink: 1, flexBasis: 280, minWidth: 0 }}
        >
          <GithubCard />
        </View>
        <View
          style={{ flexGrow: 1, flexShrink: 1, flexBasis: 280, minWidth: 0 }}
        >
          <WfairCard />
        </View>
        <View
          style={{ flexGrow: 1, flexShrink: 1, flexBasis: 280, minWidth: 0 }}
        >
          <NetworkCard />
        </View>
      </View>

      <RecentBlocksList
        blocks={blocks}
        isLoading={isLoading}
        isError={isError}
      />
      <LatestTxList max={TX_FEED_LIMIT} />
    </View>
  )
}
