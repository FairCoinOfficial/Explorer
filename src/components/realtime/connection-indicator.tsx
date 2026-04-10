// Connection Indicator Component for WebSocket Status

import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Activity, WifiOff, Loader2 } from 'lucide-react'
import { useBlockchain } from '@/contexts/blockchain-context'

interface ConnectionIndicatorProps {
  showText?: boolean
  variant?: 'default' | 'minimal'
}

export function ConnectionIndicator({ showText = true, variant = 'default' }: ConnectionIndicatorProps) {
  const { isConnected, isLoading } = useBlockchain()

  const getStatus = () => {
    if (isLoading) {
      return {
        label: 'CONNECTING',
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        icon: <Loader2 className="w-3 h-3 mr-1 animate-spin" />
      }
    }

    if (isConnected) {
      return {
        label: 'LIVE',
        color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        icon: <Activity className="w-3 h-3 mr-1 animate-pulse" />
      }
    }

    return {
      label: 'OFFLINE',
      color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      icon: <WifiOff className="w-3 h-3 mr-1" />
    }
  }

  const status = getStatus()

  if (variant === 'minimal') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center">
              {status.icon}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{status.label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`${status.color} border-transparent font-medium text-xs`}
          >
            {status.icon}
            {showText && status.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-semibold">WebSocket Status</p>
            <p className="text-xs">
              {isConnected && 'Connected - receiving live updates'}
              {isLoading && 'Connecting to server...'}
              {!isConnected && !isLoading && 'Disconnected - using polling fallback'}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
