"use client"

import { useNetwork } from '@/contexts/network-context'
import { NetworkStatus } from '@/components/network-status'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
    TrendingUp,
    Coins,
    Clock,
    Activity,
    RefreshCw,
    BarChart3,
    Shield,
    Zap,
    Database,
    Network
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface NetworkStats {
    blockHeight: number
    difficulty: number
    hashrate: number
    totalSupply: number
    circulatingSupply: number
    stakingRewards: number
    avgBlockTime: number
    masternodeCount: number
    stakePercentage: number
    networkWeight: number
    connections: number
    phase: 'PoW' | 'PoS'
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
                throw new Error('Failed to fetch network statistics')
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

    const maxSupply = 53193831
    const supplyProgress = stats ? (stats.totalSupply / maxSupply) * 100 : 0
    const stakeProgress = stats?.stakePercentage || 0

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
                        {stats?.phase || 'Unknown'} Phase
                    </Badge>
                    <Button onClick={fetchStats} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Main Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Current Height</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.blockHeight.toLocaleString() || 'N/A'}</div>
                        <p className="text-xs text-muted-foreground">Latest block</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Supply</CardTitle>
                        <Coins className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats?.totalSupply.toLocaleString() || 'N/A'} FAIR
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
                        <div className="text-2xl font-bold">{stats?.avgBlockTime || 120}s</div>
                        <p className="text-xs text-muted-foreground">Average block time</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Masternodes</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.masternodeCount.toLocaleString() || 'N/A'}</div>
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

            {/* Supply and Economics */}
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
                                <span>{stats?.totalSupply.toLocaleString() || 'N/A'} FAIR</span>
                            </div>
                            <Progress value={supplyProgress} className="h-2" />
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
                                <Badge variant={stats?.phase === 'PoS' ? 'default' : 'secondary'}>
                                    Current: {stats?.phase || 'Unknown'}
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

            {/* Staking Information */}
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
                            <div className="text-2xl font-bold">{stats?.masternodeCount || 'N/A'}</div>
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
                                {stats?.stakingRewards?.toFixed(2) || 'N/A'}%
                            </div>
                            <div className="text-sm text-muted-foreground">
                                Estimated Annual Return
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
