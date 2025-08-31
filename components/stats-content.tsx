"use client"

import { useNetwork } from '@/contexts/network-context'
import { NetworkStatus } from '@/components/network-status'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    BarChart3,
    TrendingUp,
    Zap,
    Clock,
    Database,
    Hash,
    RefreshCw,
    Home,
    Coins,
    Activity,
    Shield,
    Network
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface NetworkStats {
    blockHeight: number
    difficulty: number
    hashrate: number
    totalSupply: number
    circulatingSupply: number
    avgBlockTime: number
    memPoolSize: number
    totalTransactions: number
    networkWeight: number
    avgTransactionsPerBlock: number
    masternodeCount: number
    stakingRewards: number
    stakePercentage: number
    connections: number
    phase: 'PoW' | 'PoS'
    lastBlock: {
        height: number
        hash: string
        time: number
        size: number
    }
}

export function StatsContent() {
    const { currentNetwork } = useNetwork()
    const [stats, setStats] = useState<NetworkStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchStats = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch(`/api/stats?network=${currentNetwork}`)
            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`
                try {
                    const contentType = response.headers.get('content-type')
                    if (contentType && contentType.includes('application/json')) {
                        const errorData = await response.json()
                        errorMessage = errorData.error || errorMessage
                    } else {
                        // If not JSON, read as text (likely HTML error page)
                        const errorText = await response.text()
                        errorMessage = `Server error: ${errorText.substring(0, 100)}...`
                    }
                } catch (parseError) {
                    errorMessage = `Failed to parse error response: ${parseError}`
                }
                throw new Error(errorMessage)
            }

            const data = await response.json()
            setStats(data.stats)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchStats()
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchStats, 30000)
        return () => clearInterval(interval)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentNetwork])

    if (loading) {
        return (
            <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
                <div className="flex items-center justify-center h-64">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <p className="text-lg text-muted-foreground mb-4">Error loading statistics</p>
                        <p className="text-sm text-destructive mb-4">{error}</p>
                        <Button onClick={fetchStats} variant="outline">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Try Again
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    if (!stats) {
        return (
            <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
                <div className="flex items-center justify-center h-64">
                    <p className="text-lg text-muted-foreground">No statistics available</p>
                </div>
            </div>
        )
    }

    const maxSupply = 53193831
    const supplyProgress = (stats.totalSupply / maxSupply) * 100

    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            {/* Header */}
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Network Statistics</h2>
                    <p className="text-muted-foreground">
                        FairCoin blockchain network metrics and performance
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <NetworkStatus />
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        <Activity className="w-3 h-3 mr-1" />
                        {stats.phase || 'PoS'} Phase
                    </Badge>
                    <Button onClick={fetchStats} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Block Height</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.blockHeight.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Current blockchain height</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Supply</CardTitle>
                        <Coins className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.totalSupply.toLocaleString()} FAIR
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {supplyProgress.toFixed(2)}% of max supply
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Block Time</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Math.round(stats.avgBlockTime)}s</div>
                        <p className="text-xs text-muted-foreground">Average block time</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Masternodes</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.masternodeCount?.toLocaleString() || 'N/A'}</div>
                        <p className="text-xs text-muted-foreground">Securing the network</p>
                    </CardContent>
                </Card>
            </div>

            {/* FairCoin Features Overview */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5" />
                            FastSend
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">
                            Guaranteed zero confirmation transactions for instant payments.
                        </p>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Confirmation Time</span>
                                <span className="font-mono">~0 seconds</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Security</span>
                                <span>Masternode secured</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Coin Mixing
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">
                            Anonymous transactions using advanced coin mixing technology.
                        </p>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Privacy Level</span>
                                <span>High</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Method</span>
                                <span>Masternode mixing</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            Governance
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">
                            Decentralized blockchain voting for network consensus decisions.
                        </p>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Voting Power</span>
                                <span>Masternode owners</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Consensus</span>
                                <span>Democratic</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Statistics */}
            <Tabs defaultValue="network" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="network">Network</TabsTrigger>
                    <TabsTrigger value="supply">Supply & Economics</TabsTrigger>
                    <TabsTrigger value="staking">Staking</TabsTrigger>
                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
                </TabsList>

                <TabsContent value="network" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Database className="h-5 w-5" />
                                    Network Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Network Weight</label>
                                        <p className="text-lg font-semibold">{stats.networkWeight?.toLocaleString() || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Connections</label>
                                        <p className="text-lg font-semibold">{stats.connections || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Difficulty</label>
                                        <p className="text-lg font-semibold">{stats.difficulty.toFixed(6)}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Hash Rate</label>
                                        <p className="text-lg font-semibold">{(stats.hashrate / 1000000).toFixed(2)} MH/s</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Hash className="h-5 w-5" />
                                    Latest Block
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Height</label>
                                        <p className="text-lg font-semibold">
                                            <Link href={`/block/${stats.lastBlock.height}`} className="hover:underline">
                                                #{stats.lastBlock.height.toLocaleString()}
                                            </Link>
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Hash</label>
                                        <p className="font-mono text-sm break-all">
                                            <Link href={`/block/${stats.lastBlock.hash}`} className="hover:underline">
                                                {stats.lastBlock.hash.substring(0, 32)}...
                                            </Link>
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Time</label>
                                        <p className="text-sm">{new Date(stats.lastBlock.time * 1000).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Size</label>
                                        <p className="text-sm">{(stats.lastBlock.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="supply" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Coins className="h-5 w-5" />
                                Supply & Economics
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span>Current Supply</span>
                                        <span>{stats.totalSupply.toLocaleString()} FAIR</span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-2">
                                        <div
                                            className="bg-primary h-2 rounded-full"
                                            style={{ width: `${supplyProgress}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                        <span>0 FAIR</span>
                                        <span>{maxSupply.toLocaleString()} FAIR (Max)</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-center">
                                    <div className="border rounded-lg p-3">
                                        <div className="text-lg font-bold">90%</div>
                                        <div className="text-xs text-muted-foreground">Premine</div>
                                    </div>
                                    <div className="border rounded-lg p-3">
                                        <div className="text-lg font-bold">10 FAIR</div>
                                        <div className="text-xs text-muted-foreground">Per Block</div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-3">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span>Proof of Work Phase</span>
                                            <span>Blocks 1-25,000</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Initial mining phase with Quark algorithm
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span>Proof of Stake Phase</span>
                                            <span>Blocks 25,001+</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Current phase: Energy-efficient staking
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="text-center">
                                        <Badge variant={stats.phase === 'PoS' ? 'default' : 'secondary'}>
                                            Current: {stats.phase || 'PoS'}
                                        </Badge>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-sm">Block Reward</span>
                                            <span className="text-sm font-mono">10 FAIR</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm">Block Time</span>
                                            <span className="text-sm font-mono">120 seconds</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm">Daily Blocks</span>
                                            <span className="text-sm font-mono">720</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="staking" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="h-5 w-5" />
                                    Masternode Staking
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="border rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium">Requirements</span>
                                        <Badge variant="default">Premium</Badge>
                                    </div>
                                    <div className="text-sm text-muted-foreground space-y-1">
                                        <p>• 25,000 FAIR collateral required</p>
                                        <p>• Provides network services (FastSend, Mixing)</p>
                                        <p>• Higher rewards than wallet staking</p>
                                        <p>• Enables governance voting</p>
                                    </div>
                                </div>

                                <div className="text-center">
                                    <div className="text-2xl font-bold">{stats.masternodeCount || 'N/A'}</div>
                                    <div className="text-sm text-muted-foreground">Active Masternodes</div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Coins className="h-5 w-5" />
                                    Wallet Staking
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="border rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium">Requirements</span>
                                        <Badge variant="secondary">Accessible</Badge>
                                    </div>
                                    <div className="text-sm text-muted-foreground space-y-1">
                                        <p>• Minimum 1 FAIR required</p>
                                        <p>• Stake directly from wallet</p>
                                        <p>• Lower barriers to entry</p>
                                        <p>• Helps secure the network</p>
                                    </div>
                                </div>

                                <div className="text-center">
                                    <div className="text-2xl font-bold">
                                        {stats.stakingRewards?.toFixed(2) || 'N/A'}%
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Estimated Annual Return
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="transactions" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Hash className="h-5 w-5" />
                                    Transaction Statistics
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Total Transactions</label>
                                        <p className="text-2xl font-bold">{stats.totalTransactions.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Avg TX per Block</label>
                                        <p className="text-2xl font-bold">{stats.avgTransactionsPerBlock.toFixed(1)}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Mempool</label>
                                        <p className="text-lg font-semibold">{stats.memPoolSize.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">TPS (24h avg)</label>
                                        <p className="text-lg font-semibold">
                                            {(stats.avgTransactionsPerBlock / (stats.avgBlockTime / 60)).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Button asChild variant="outline" className="w-full justify-start">
                                    <Link href="/blocks">
                                        <Database className="h-4 w-4 mr-2" />
                                        View Recent Blocks
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" className="w-full justify-start">
                                    <Link href="/masternodes">
                                        <Shield className="h-4 w-4 mr-2" />
                                        View Masternodes
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" className="w-full justify-start">
                                    <Link href="/mempool">
                                        <Clock className="h-4 w-4 mr-2" />
                                        View Mempool
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Navigation */}
            <div className="flex justify-center">
                <Button asChild variant="outline">
                    <Link href="/">
                        <Home className="h-4 w-4 mr-2" />
                        Back to Home
                    </Link>
                </Button>
            </div>
        </div>
    )
}
