import { useMemo } from 'react'
import {
  Blocks,
  Coins,
  Gauge,
  Network,
  Layers,
  Shield,
  Activity,
  type LucideIcon,
} from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { useNetworkStats } from '@/hooks/use-network-stats'
import { computeCirculatingSupply } from '@/lib/supply'
import { formatCompactNumber, formatNumber } from '@/lib/format'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const POS_PHASE_HEIGHT = 10_000

interface StatTile {
  key: string
  label: string
  /** Resolved display value, or null while the underlying source is still loading. */
  value: string | null
  icon: LucideIcon
  accent?: boolean
}

interface StatStripProps {
  /**
   * Block height sourced from the recent-blocks query, available almost
   * instantly. Lets height-derived tiles render before `/api/stats` resolves.
   */
  height?: number
}

export function StatStrip({ height }: StatStripProps) {
  const t = useTranslations('home')
  const { data, isError } = useNetworkStats()

  const hasHeight = typeof height === 'number' && height > 0
  const hasStats = Boolean(data)

  const tiles = useMemo<StatTile[]>(() => {
    // Prefer the authoritative stats height once available, otherwise fall
    // back to the fast height from recent blocks for early-paint tiles.
    const effectiveHeight = data?.blockHeight ?? (hasHeight ? height : undefined)
    const supply =
      typeof effectiveHeight === 'number' ? computeCirculatingSupply(effectiveHeight) : null
    const phase: string | null =
      data?.phase ??
      (typeof effectiveHeight === 'number'
        ? effectiveHeight > POS_PHASE_HEIGHT
          ? 'PoS'
          : 'PoW'
        : null)

    return [
      {
        key: 'height',
        label: t('statHeight'),
        value: typeof effectiveHeight === 'number' ? formatNumber(effectiveHeight) : null,
        icon: Blocks,
      },
      {
        key: 'supply',
        label: t('statSupply'),
        value: supply !== null ? `${formatCompactNumber(supply)} FAIR` : null,
        icon: Coins,
      },
      {
        key: 'difficulty',
        label: t('statDifficulty'),
        value: data ? formatCompactNumber(data.difficulty) : null,
        icon: Gauge,
      },
      {
        key: 'connections',
        label: t('statConnections'),
        value: data ? formatNumber(data.connections) : null,
        icon: Network,
      },
      {
        key: 'mempool',
        label: t('statMempool'),
        value: data ? formatNumber(data.memPoolSize) : null,
        icon: Layers,
      },
      {
        key: 'masternodes',
        label: t('statMasternodes'),
        value: data ? formatNumber(data.masternodeCount) : null,
        icon: Shield,
      },
      {
        key: 'phase',
        label: t('statPhase'),
        value: phase,
        icon: Activity,
        accent: true,
      },
    ]
  }, [data, hasHeight, height, t])

  // Only surface the error state when there is nothing at all to show — if the
  // fast height is known we still render the strip with the height-derived tiles.
  if (isError && !hasStats && !hasHeight) {
    return (
      <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        {t('statsUnavailable')}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
      {tiles.map((tile) => {
        const Icon = tile.icon
        return (
          <div
            key={tile.key}
            className="flex flex-col gap-1 rounded-xl bg-muted/60 px-3 py-2.5 transition-colors hover:bg-muted/80"
          >
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <Icon className="size-3.5" />
              <span className="truncate">{tile.label}</span>
            </div>
            {tile.value === null ? (
              <Skeleton className="h-4 w-12" />
            ) : (
              <span
                className={cn(
                  'truncate text-base font-semibold tabular-nums',
                  tile.accent && 'text-primary',
                )}
              >
                {tile.value}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
