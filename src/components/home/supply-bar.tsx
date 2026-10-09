import { useNetwork } from '@/contexts/network-context'
import { useNetworkStats } from '@/hooks/use-network-stats'
import { useStatsHistory } from '@/hooks/use-stats-history'
import { formatCompactNumber, formatNumber } from '@/lib/format'
import { useTranslations } from '@/lib/i18n'
import { Admonition } from '@oxy.so/bloom/admonition'
import {
  ChartCardSurface,
  ChartHeader,
  ChartStatTiles,
  Sparkline,
} from '@oxy.so/bloom/chart-cards'
import { Box } from '@oxy.so/bloom/skeleton'
import { StatBar } from '@oxy.so/bloom/stat-bar'
import { computeCirculatingSupply, computeSupplyInfo } from '@shared/supply'
import { useMemo } from 'react'

/** A series needs at least two points before a sparkline reads as a trend. */
const MIN_SPARK_POINTS = 2

interface SubStat {
  key: string
  label: string
  value: string
}

export function SupplyBar() {
  const t = useTranslations('home')
  const { currentNetwork } = useNetwork()
  const { data, isLoading, isError } = useNetworkStats()
  const { data: statsHistory } = useStatsHistory({ network: currentNetwork })

  const supply = useMemo(
    () => (data ? computeSupplyInfo(data.blockHeight) : null),
    [data],
  )

  // Supply-growth series derived from the sampled height history with the same
  // schedule the hero figure uses, so the ambient line always agrees with the
  // number. Dropped entirely when there isn't enough history to read as a trend.
  const supplySpark = useMemo<number[] | null>(() => {
    const points = statsHistory ?? []
    if (points.length < MIN_SPARK_POINTS) return null
    return points.map((point) => computeCirculatingSupply(point.height))
  }, [statsHistory])

  const subStats = useMemo<SubStat[] | null>(() => {
    if (!supply) return null
    const percent = supply.fraction * 100
    return [
      {
        key: 'minted',
        label: t('supplyMintedLabel'),
        value: `${percent.toFixed(2)}%`,
      },
      {
        key: 'nextHalving',
        label: t('supplyNextHalvingLabel'),
        value: formatNumber(supply.blocksToNextHalving),
      },
      {
        key: 'reward',
        label: t('supplyRewardLabel'),
        value: `${supply.currentReward} FAIR`,
      },
      {
        key: 'halvings',
        label: t('supplyHalvingsLabel'),
        value: formatNumber(supply.halvings),
      },
      {
        key: 'nextHalvingBlock',
        label: t('supplyNextHalvingBlock'),
        value: `#${formatNumber(supply.nextHalvingHeight)}`,
      },
    ]
  }, [supply, t])

  if (isLoading) {
    return <Box width={'100%'} height={208} />
  }

  if (isError || !supply || !subStats)
    return <Admonition type="warning">{t('statsUnavailable')}</Admonition>
  return (
    <ChartCardSurface height="auto">
      <ChartHeader
        label={t('supplyTitle')}
        value={supply.circulating}
        format={formatNumber}
      />
      <StatBar
        label={t('supplyMinted', {
          percent: (supply.fraction * 100).toFixed(2),
        })}
        value={supply.circulating}
        max={supply.max}
        minLabel="0 FAIR"
        maxLabel={t('supplyOfMax', { max: formatCompactNumber(supply.max) })}
      />
      {supplySpark && <Sparkline data={supplySpark} />}
      <ChartStatTiles items={subStats} />
    </ChartCardSurface>
  )
}
