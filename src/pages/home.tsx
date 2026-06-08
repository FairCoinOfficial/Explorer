import { useRecentBlocks } from '@/hooks/use-recent-blocks'
import { HomeHeader } from '@/components/home/home-header'
import { StatStrip } from '@/components/home/stat-strip'
import { SupplyBar } from '@/components/home/supply-bar'
import { PriceCard } from '@/components/home/price-card'
import { GithubCard } from '@/components/home/github-card'
import { WfairCard } from '@/components/home/wfair-card'
import { NetworkCard } from '@/components/home/network-card'
import { RecentBlocksList } from '@/components/home/recent-blocks-list'
import { LatestTxList } from '@/components/home/latest-tx-list'

const BLOCKS_LIMIT = 20
const TX_FEED_LIMIT = 20

export default function HomePage() {
  const { data, isLoading, isError } = useRecentBlocks(BLOCKS_LIMIT)
  const blocks = data?.blocks
  const height = data?.height

  return (
    <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
      <HomeHeader />

      <StatStrip height={height} />

      <SupplyBar />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PriceCard />
        <GithubCard />
        <WfairCard />
        <NetworkCard />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <RecentBlocksList blocks={blocks} isLoading={isLoading} isError={isError} />
        <LatestTxList blocks={blocks} isLoading={isLoading} isError={isError} max={TX_FEED_LIMIT} />
      </div>
    </div>
  )
}
