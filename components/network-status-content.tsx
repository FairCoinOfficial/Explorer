"use client"

import { useState, useEffect, useCallback } from "react"
import { useNetwork } from "@/contexts/network-context"
import { Activity, Wifi, WifiOff, CheckCircle, XCircle, Clock, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

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
    const [status, setStatus] = useState<NetworkStatus | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

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
                    lastBlockTime: Date.now(), // Will get from getblock later
                    mempool: 0, // Will get from getmempoolinfo
                    version: networkData.subversion || networkData.version || "Unknown"
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
                    version: "Unknown"
                })
            }
        } catch (error) {
            console.error("Failed to fetch network status:", error)
            setStatus({
                isOnline: false,
                latency: 0,
                blockHeight: 0,
                connections: 0,
                difficulty: 0,
                hashrate: "0 H/s",
                lastBlockTime: 0,
                mempool: 0,
                version: "Unknown"
            })
        } finally {
            setIsLoading(false)
            setLastUpdate(new Date())
        }
    }, [currentNetwork])

    useEffect(() => {
        fetchNetworkStatus()

        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchNetworkStatus, 30000)

        return () => clearInterval(interval)
    }, [fetchNetworkStatus])

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
        if (!timestamp) return "Unknown"
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
                    <h1 className="text-2xl font-bold">Network Status</h1>
                    <Badge variant="outline">{currentNetwork.toUpperCase()}</Badge>
                </div>
                <div className="text-center py-8">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50 animate-spin" />
                    <p className="text-muted-foreground">Loading network status...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                <h1 className="text-2xl font-bold">Network Status</h1>
                <Badge variant="outline">{currentNetwork.toUpperCase()}</Badge>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            {status?.isOnline ? (
                                <Wifi className="h-4 w-4 text-green-600" />
                            ) : (
                                <WifiOff className="h-4 w-4 text-red-600" />
                            )}
                            Connection Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Badge className={getStatusColor(status?.isOnline || false)}>
                                {status?.isOnline ? "Online" : "Offline"}
                            </Badge>
                            <div className="text-sm text-muted-foreground">
                                <p className={getLatencyColor(status?.latency || 0)}>
                                    Latency: {status?.latency || 0}ms
                                </p>
                                <p>Last update: {lastUpdate.toLocaleTimeString()}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <CheckCircle className="h-4 w-4" />
                            Block Height
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <p className="text-2xl font-bold">{status?.blockHeight?.toLocaleString() || 0}</p>
                            <p className="text-sm text-muted-foreground">Current block height</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Activity className="h-4 w-4" />
                            Connections
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <p className="text-2xl font-bold">{status?.connections || 0}</p>
                            <p className="text-sm text-muted-foreground">Peer connections</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <TrendingUp className="h-4 w-4" />
                            Difficulty
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <p className="text-xl font-bold">{status?.difficulty?.toExponential(2) || "0"}</p>
                            <p className="text-sm text-muted-foreground">Network difficulty</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Activity className="h-4 w-4" />
                            Hashrate
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <p className="text-xl font-bold">{formatHashrate(status?.hashrate || "0")}</p>
                            <p className="text-sm text-muted-foreground">Network hashrate</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Clock className="h-4 w-4" />
                            Last Block
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <p className="text-sm font-mono">{formatTime(status?.lastBlockTime || 0)}</p>
                            <p className="text-sm text-muted-foreground">Last block time</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Network Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <h4 className="font-semibold">Node Information</h4>
                            <div className="text-sm space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Version:</span>
                                    <span className="font-mono">{status?.version || "Unknown"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Network:</span>
                                    <Badge variant="outline">{currentNetwork}</Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Mempool:</span>
                                    <span>{status?.mempool || 0} transactions</span>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-semibold">Status Indicators</h4>
                            <div className="text-sm space-y-1">
                                <div className="flex items-center gap-2">
                                    {status?.isOnline ? (
                                        <CheckCircle className="h-3 w-3 text-green-600" />
                                    ) : (
                                        <XCircle className="h-3 w-3 text-red-600" />
                                    )}
                                    <span>Node Connection</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {(status?.connections || 0) > 0 ? (
                                        <CheckCircle className="h-3 w-3 text-green-600" />
                                    ) : (
                                        <XCircle className="h-3 w-3 text-red-600" />
                                    )}
                                    <span>Peer Connections</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {(status?.blockHeight || 0) > 0 ? (
                                        <CheckCircle className="h-3 w-3 text-green-600" />
                                    ) : (
                                        <XCircle className="h-3 w-3 text-red-600" />
                                    )}
                                    <span>Blockchain Sync</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
