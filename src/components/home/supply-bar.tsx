import { useMemo } from 'react'
import { PieChart } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { useNetworkStats } from '@/hooks/use-network-stats'
import { computeSupplyInfo } from '@/lib/supply'
import { formatCompactNumber, formatNumber } from '@/lib/format'
import { Skeleton } from '@/components/ui/skeleton'

export function SupplyBar() {
  const t = useTranslations('home')
  const { data, isLoading, isError } = useNetworkStats()

  const supply = useMemo(
    () => (data ? computeSupplyInfo(data.blockHeight) : null),
    [data],
  )

  if (isLoading) {
    return <Skeleton className="h-[88px] rounded-2xl" />
  }

  if (isError || !supply) {
    return (
      <div className="rounded-2xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        {t('statsUnavailable')}
      </div>
    )
  }

  const percent = supply.fraction * 100

  return (
    <div className="rounded-2xl border bg-muted/30 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
            <PieChart className="size-4" />
          </span>
          <h3 className="text-sm font-semibold tracking-tight">{t('supplyTitle')}</h3>
        </div>
        <span className="text-sm font-semibold tabular-nums">
          {formatCompactNumber(supply.circulating)}
          <span className="text-muted-foreground"> / {formatCompactNumber(supply.max)} FAIR</span>
        </span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${Math.max(percent, 1)}%` }}
        />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {t('supplyMinted', { percent: percent.toFixed(2) })}
        </span>
        <span className="tabular-nums">
          {t('supplyNextHalving', {
            blocks: formatNumber(supply.blocksToNextHalving),
            reward: supply.currentReward.toString(),
          })}
        </span>
      </div>
    </div>
  )
}
