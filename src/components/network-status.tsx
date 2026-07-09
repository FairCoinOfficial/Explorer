import { Badge } from '@/components/ui/badge'
import { useNetwork } from '@/contexts/network-context'
import { useStats } from '@/hooks/use-stats'
import { Wifi, WifiOff } from 'lucide-react'

/**
 * Compact network pill (name + tip height) used in page headers.
 * Reads from the shared `useStats` React Query cache — no separate poll.
 */
export function NetworkStatus() {
  const { networkConfig } = useNetwork()
  const { data: stats, isError, isSuccess } = useStats()

  const isConnected = isSuccess && !isError
  const blockCount = stats?.blockHeight

  return (
    <Badge
      variant="outline"
      className={`rounded-full bg-secondary/10 text-secondary-foreground border-secondary/20 ${
        isConnected ? 'border-green-500/30' : 'border-red-500/30'
      }`}
    >
      {isConnected ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
      {networkConfig.displayName}
      {typeof blockCount === 'number' && blockCount > 0 ? (
        <span className="ml-1 text-xs opacity-70">#{blockCount.toLocaleString()}</span>
      ) : null}
    </Badge>
  )
}
