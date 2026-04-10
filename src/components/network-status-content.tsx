import { useState, useEffect, useCallback } from "react"
import { useNetwork } from "@/contexts/network-context"
import { useBlockchain } from "@/contexts/blockchain-context"
import { Activity, Wifi, WifiOff, CheckCircle, XCircle, Clock, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from 'sonner'
import { useTranslations } from "@/lib/i18n"

interface NetworkStatus {
    isOnline: boolean
    latency: number
    blockHeight: number
    connections: number
    difficulty: number
    hashrate: string
    lastBlockTime: number
    mempool: number
    version: string
}

export function NetworkStatusContent() {
    const { currentNetwork } = useNetwork()
    const { blockHeight, mempoolSize, networkStats, isConnected, subscribe, unsubscribe } = useBlockchain()
    const [status, setStatus] = useState<NetworkStatus | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
    const t = useTranslations('network')
    const tCommon = useTranslations('common')

    const fetchNetworkStatus = useCallback(async () => {
        try {
            const startTime = Date.now()

            // Fetch network info using correct FairCoin RPC commands
            const [blockcountRes, networkInfoRes, miningInfoRes] = await Promise.all([
                fetch(`/api/blockcount?network=${currentNetwork}`),
                fetch(`/api/network-info?network=${currentNetwork}`),
                fetch(`/api/mining-info?network=${currentNetwork}`)
            ])

            const latency = Date.now() - startTime

            if (blockcountRes.ok) {
                const blockcountData = await blockcountRes.json()
                let networkData: any = { connections: 0, version: "Unknown" }
                let miningData: any = { difficulty: 0, hashrate: 0, blocks: 0 }

                if (networkInfoRes.ok) {
                    networkData = await networkInfoRes.json()
                }

                if (miningInfoRes.ok) {
                    miningData = await miningInfoRes.json()
                }

                setStatus({
                    isOnline: true,
                    latency,
                    blockHeight: blockcountData.blockcount || miningData.blocks || 0,
                    connections: networkData.connections || 0,
                    difficulty: miningData.difficulty || 0,
                    hashrate: miningData.networkhashps || miningData.hashrate || "0 H/s",
                    lastBlockTime: Date.now(),
                    mempool: 0,
                    version: networkData.subversion || networkData.version || t('unknown')
                })
            } else {
                setStatus({
                    isOnline: false,
                    latency: latency,
                    blockHeight: 0,
                    connections: 0,
                    difficulty: 0,
                    hashrate: "0 H/s",
                    lastBlockTime: 0,
                    mempool: 0,
                    version: t('unknown')
                })
            }
        } catch (error) {
            console.error("Failed to fetch network status:", error)
            toast.error('Failed to load network status')
            setStatus({
                isOnline: false,
                latency: 0,
                blockHeight: 0,
                connections: 0,
                difficulty: 0,
                hashrate: "0 H/s",
                lastBlockTime: 0,
                mempool: 0,
                version: t('unknown')
            })
        } finally {
            setIsLoading(false)
            setLastUpdate(new Date())
        }
    }, [currentNetwork])

    // Initial fetch
    useEffect(() => {
        fetchNetworkStatus()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentNetwork])

    // Subscribe to WebSocket updates
    useEffect(() => {
        const handleBlockCount = (event: any) => {
            if (event.type === 'block-count' && event.network === currentNetwork) {
                setStatus(prev => prev ? { ...prev, blockHeight: event.data.height, isOnline: true } : null)
                setLastUpdate(new Date())
                setIsLoading(false)
            }
        }

        const handleNetworkStats = (event: any) => {
            if (event.type === 'network-stats' && event.network === currentNetwork) {
                setStatus(prev => prev ? {
                    ...prev,
                    connections: event.data.connections,
                    difficulty: event.data.difficulty,
                    hashrate: event.data.hashrate,
                    version: event.data.version,
                    isOnline: true
                } : null)
                setLastUpdate(new Date())
            }
        }

        const handleMempoolUpdate = (event: any) => {
            if (event.type === 'mempool-update' && event.network === currentNetwork) {
                setStatus(prev => prev ? { ...prev, mempool: event.data.size } : null)
            }
        }

        subscribe('block-count', handleBlockCount)
        subscribe('network-stats', handleNetworkStats)
        subscribe('mempool-update', handleMempoolUpdate)

        return () => {
            unsubscribe('block-count', handleBlockCount)
            unsubscribe('network-stats', handleNetworkStats)
            unsubscribe('mempool-update', handleMempoolUpdate)
        }
    }, [currentNetwork, subscribe, unsubscribe])

    // Update from context when available
    useEffect(() => {
        if (isConnected && (blockHeight > 0 || networkStats)) {
            setStatus(prev => ({
                isOnline: true,
                latency: prev?.latency || 0,
                blockHeight: blockHeight || prev?.blockHeight || 0,
                connections: networkStats?.connections || prev?.connections || 0,
                difficulty: networkStats?.difficulty || prev?.difficulty || 0,
                hashrate: networkStats?.hashrate || prev?.hashrate || "0 H/s",
                lastBlockTime: prev?.lastBlockTime || Date.now(),
                mempool: mempoolSize || prev?.mempool || 0,
                version: networkStats?.version || prev?.version || t('unknown')
            }))
            setIsLoading(false)
        }
    }, [blockHeight, mempoolSize, networkStats, isConnected])

    const getStatusColor = (isOnline: boolean) => {
        return isOnline
            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
    }

    const getLatencyColor = (latency: number) => {
        if (latency < 100) return "text-green-600"
        if (latency < 500) return "text-orange-600"
        return "text-red-600"
    }

    const formatTime = (timestamp: number) => {
        if (!timestamp) return t('unknown')
        const date = new Date(timestamp * 1000)
        return date.toLocaleString()
    }

    const formatHashrate = (hashrate: string | number) => {
        if (typeof hashrate === 'string') return hashrate

        const rate = parseFloat(hashrate.toString())
        if (rate >= 1e12) return `${(rate / 1e12).toFixed(2)} TH/s`
        if (rate >= 1e9) return `${(rate / 1e9).toFixed(2)} GH/s`
        if (rate >= 1e6) return `${(rate / 1e6).toFixed(2)} MH/s`
        if (rate >= 1e3) return `${(rate / 1e3).toFixed(2)} KH/s`
        return `${rate} H/s`
    }

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    <h1 className="text-2xl font-bold">{t('title')}</h1>
                    <Badge variant="outline">{currentNetwork.toUpperCase()}</Badge>
                </div>
                <div className="text-center py-8">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50 animate-spin" />
                    <p className="text-muted-foreground">{t('loading')}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                <h1 className="text-2xl font-bold">{t('title')}</h1>
                <Badge variant="outline">{currentNetwork.toUpperCase()}</Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                    <p className="text-xs text-muted-foreground mb-1">
                        {status?.isOnline ? (
                            <span className="inline-flex items-center gap-1"><Wifi className="h-3 w-3 text-green-600" />{t('connectionStatus')}</span>
                        ) : (
                            <span className="inline-flex items-center gap-1"><WifiOff className="h-3 w-3 text-red-600" />{t('connectionStatus')}</span>
                        )}
                    </p>
                    <div className="space-y-1">
                        <Badge className={getStatusColor(status?.isOnline || false)}>
                            {status?.isOnline ? t('online') : t('offline')}
                        </Badge>
                        <p className={`text-xs ${getLatencyColor(status?.latency || 0)}`}>
                            {t('latency')}: {status?.latency || 0}ms
                        </p>
                        <p className="text-xs text-muted-foreground">{t('lastUpdate')}: {lastUpdate.toLocaleTimeString()}</p>
                    </div>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('blockHeight')}</p>
                    <p className="text-2xl font-bold tabular-nums">{status?.blockHeight?.toLocaleString() || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('currentBlockHeight')}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('connections')}</p>
                    <p className="text-2xl font-bold tabular-nums">{status?.connections || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('peerConnections')}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('difficulty')}</p>
                    <p className="text-2xl font-bold tabular-nums">{status?.difficulty?.toExponential(2) || "0"}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('networkDifficulty')}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('hashrate')}</p>
                    <p className="text-2xl font-bold tabular-nums">{formatHashrate(status?.hashrate || "0")}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('networkHashrate')}</p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('lastBlock')}</p>
                    <p className="text-sm font-mono">{formatTime(status?.lastBlockTime || 0)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('lastBlockTime')}</p>
                </div>
            </div>

            <div className="h-px bg-border" />

            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('networkInformation')}</h3>
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                        <h4 className="font-semibold">{t('nodeInformation')}</h4>
                        <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t('version')}:</span>
                                <span className="font-mono">{status?.version || t('unknown')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{tCommon('network')}:</span>
                                <Badge variant="outline">{currentNetwork}</Badge>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">{t('mempool')}:</span>
                                <span>{status?.mempool || 0} {t('transactions')}</span>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h4 className="font-semibold">{t('statusIndicators')}</h4>
                        <div className="text-sm space-y-1">
                            <div className="flex items-center gap-2">
                                {status?.isOnline ? (
                                    <CheckCircle className="h-3 w-3 text-green-600" />
                                ) : (
                                    <XCircle className="h-3 w-3 text-red-600" />
                                )}
                                <span>{t('nodeConnection')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {(status?.connections || 0) > 0 ? (
                                    <CheckCircle className="h-3 w-3 text-green-600" />
                                ) : (
                                    <XCircle className="h-3 w-3 text-red-600" />
                                )}
                                <span>{t('peerConnections')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {(status?.blockHeight || 0) > 0 ? (
                                    <CheckCircle className="h-3 w-3 text-green-600" />
                                ) : (
                                    <XCircle className="h-3 w-3 text-red-600" />
                                )}
                                <span>{t('blockchainSync')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
