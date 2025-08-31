"use client"

import { useNetwork } from '@/contexts/network-context'
import { Badge } from '@/components/ui/badge'
import { Wifi, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'

export function NetworkStatus() {
    const { currentNetwork, networkConfig } = useNetwork()
    const [blockCount, setBlockCount] = useState<number | null>(null)
    const [isConnected, setIsConnected] = useState(false)

    useEffect(() => {
        const fetchBlockCount = async () => {
            try {
                const response = await fetch(`/api/blockcount?network=${currentNetwork}`)
                if (response.ok) {
                    const data = await response.json()
                    setBlockCount(data.blockCount)
                    setIsConnected(true)
                } else {
                    setIsConnected(false)
                }
            } catch (error) {
                console.error('Error fetching block count:', error)
                setIsConnected(false)
            }
        }

        fetchBlockCount()
        // Refresh every 30 seconds
        const interval = setInterval(fetchBlockCount, 30000)

        return () => clearInterval(interval)
    }, [currentNetwork])

    return (
        <Badge variant="outline" className={`bg-secondary/10 text-secondary-foreground border-secondary/20 ${isConnected ? 'border-green-500/30' : 'border-red-500/30'}`}>
            {isConnected ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
            {networkConfig.displayName}
            {blockCount && (
                <span className="ml-1 text-xs opacity-70">
                    #{blockCount.toLocaleString()}
                </span>
            )}
        </Badge>
    )
}
