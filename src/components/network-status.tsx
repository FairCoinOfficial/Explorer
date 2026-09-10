import { Badge } from '@/components/ui/badge'
import { useNetwork } from '@/contexts/network-context'
import { useLiveMode } from '@/contexts/blockchain-context'
import { useStats } from '@/hooks/use-stats'
import { useTranslations } from '@/lib/i18n'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Compact network pill (name + tip height) used in page headers.
 * Border/icon reflect WebSocket health, not just HTTP success.
 */
export function NetworkStatus() {
  const { networkConfig } = useNetwork()
  const { data: stats } = useStats()
  const mode = useLiveMode()
  const t = useTranslations('home')

  const blockCount = stats?.blockHeight
  const modeLabel =
    mode === 'live' ? t('live') : mode === 'polling' ? t('polling') : t('offline')

  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-full bg-secondary/10 text-secondary-foreground border-secondary/20',
        mode === 'live' && 'border-green-500/30',
        mode === 'polling' && 'border-amber-500/30',
        mode === 'offline' && 'border-red-500/30',
      )}
    >
      {mode === 'live' ? (
        <Wifi className="mr-1 size-3" />
      ) : mode === 'polling' ? (
        <RefreshCw className="mr-1 size-3" />
      ) : (
        <WifiOff className="mr-1 size-3" />
      )}
      {networkConfig.displayName}
      {typeof blockCount === 'number' && blockCount > 0 ? (
        <span className="ml-1 text-xs opacity-70">#{blockCount.toLocaleString()}</span>
      ) : null}
      <span className="ml-1 text-xs opacity-70">· {modeLabel}</span>
    </Badge>
  )
}
