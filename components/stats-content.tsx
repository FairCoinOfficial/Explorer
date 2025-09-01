"use client"

import { useTranslations } from "next-intl"
import { useNetwork } from '@/contexts/network-context'
import { NetworkStatus } from '@/components/network-status'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SectionHeader, StatsGrid, StatsCard, EmptyState, LoadingState, InfoGrid } from '@/components/ui'
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
    Network,
    AlertTriangle
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
    const t = useTranslations('stats')
    const common = useTranslations('common')
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
                <LoadingState message={t('loadingMessage')} />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
                <EmptyState
                    icon={AlertTriangle}
                    title={t('errorTitle')}
                    description={error}
                    action={{
                        label: t('tryAgain'),
                        onClick: fetchStats,
                        variant: "outline"
                    }}
                />
            </div>
        )
    }

    if (!stats) {
        return (
            <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
                <div className="flex items-center justify-center h-64">
                    <p className="text-lg text-muted-foreground">{t('noStatsAvailable')}</p>
                </div>
            </div>
        )
    }

    const maxSupply = 53193831
    const supplyProgress = (stats.totalSupply / maxSupply) * 100

    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            {/* Header */}
            <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('title')}</h2>
                    <p className="text-sm text-muted-foreground sm:text-base">
                        {t('subtitle')}
                    </p>
                </div>
                <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
                    <div className="flex items-center space-x-2">
                        <NetworkStatus />
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                            <Activity className="w-3 h-3 mr-1" />
                            {t('phase', { phase: stats.phase || 'PoS' })}
                        </Badge>
                    </div>
                    <Button onClick={fetchStats} variant="outline" size="sm" className="w-full sm:w-auto">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {common('refresh')}
                    </Button>
                </div>
            </div>

            {/* Main Stats Grid */}
            <StatsGrid>
                <StatsCard
                    icon={Database}
                    title={t('blockHeight')}
                    value={stats.blockHeight.toLocaleString()}
                    description={t('currentBlockchainHeight')}
                />
                <StatsCard
                    icon={Coins}
                    title={t('totalSupply')}
                    value={`${stats.totalSupply.toLocaleString()} FAIR`}
                    description={t('supplyProgress', { percentage: supplyProgress.toFixed(2) })}
                />
                <StatsCard
                    icon={Clock}
                    title={t('blockTime')}
                    value={`${Math.round(stats.avgBlockTime)}s`}
                    description={t('averageBlockTime')}
                />
                <StatsCard
                    icon={Shield}
                    title={t('masternodes')}
                    value={stats.masternodeCount?.toLocaleString() || 'N/A'}
                    description={t('securingNetwork')}
                />
            </StatsGrid>

            {/* FairCoin Features Overview */}
            <StatsGrid>
                <StatsCard
                    icon={Zap}
                    title={t('fastSend')}
                    value={t('zeroSeconds')}
                    description={t('fastSendDescription')}
                />
                <StatsCard
                    icon={Shield}
                    title={t('coinMixing')}
                    value={t('highPrivacy')}
                    description={t('coinMixingDescription')}
                />
                <StatsCard
                    icon={Activity}
                    title={t('governance')}
                    value={t('democratic')}
                    description={t('governanceDescription')}
                />
            </StatsGrid>

            {/* Detailed Statistics */}
            <Tabs defaultValue="network" className="space-y-4">
                <div className="overflow-x-auto">
                    <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 lg:w-auto lg:inline-grid">
                        <TabsTrigger value="network" className="text-xs sm:text-sm">{t('network')}</TabsTrigger>
                        <TabsTrigger value="supply" className="text-xs sm:text-sm">{t('supply')}</TabsTrigger>
                        <TabsTrigger value="staking" className="text-xs sm:text-sm">{t('staking')}</TabsTrigger>
                        <TabsTrigger value="transactions" className="text-xs sm:text-sm">{t('transactions')}</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="network" className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <SectionHeader
                                    icon={Database}
                                    title={t('networkInformation')}
                                />
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">{t('networkWeight')}</label>
                                        <p className="text-lg font-semibold break-all">{stats.networkWeight?.toLocaleString() || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">{t('connections')}</label>
                                        <p className="text-lg font-semibold">{stats.connections || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">{t('difficulty')}</label>
                                        <p className="text-lg font-semibold break-all">{stats.difficulty.toFixed(6)}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">{t('hashRate')}</label>
                                        <p className="text-lg font-semibold break-all">{(stats.hashrate / 1000000).toFixed(2)} MH/s</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <SectionHeader
                                    icon={Hash}
                                    title={t('latestBlock')}
                                />
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">{t('height')}</label>
                                        <p className="text-lg font-semibold">
                                            <Link href={`/block/${stats.lastBlock.height}`} className="hover:underline break-all">
                                                #{stats.lastBlock.height.toLocaleString()}
                                            </Link>
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">{t('hash')}</label>
                                        <p className="font-mono text-sm break-all">
                                            <Link href={`/block/${stats.lastBlock.hash}`} className="hover:underline">
                                                {stats.lastBlock.hash.substring(0, 32)}...
                                            </Link>
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">{t('time')}</label>
                                        <p className="text-sm break-words">{new Date(stats.lastBlock.time * 1000).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">{t('size')}</label>
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
                            <SectionHeader
                                icon={Coins}
                                title={t('supplyEconomics')}
                            />
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex flex-col space-y-2 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
                                    <span className="text-sm font-medium">{t('currentSupply')}</span>
                                    <span className="text-sm font-semibold">{stats.totalSupply.toLocaleString()} FAIR</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-3">
                                    <div
                                        className="bg-primary h-3 rounded-full transition-all duration-300"
                                        style={{ width: `${supplyProgress}%` }}
                                    ></div>
                                </div>
                                <div className="flex flex-col space-y-1 sm:flex-row sm:justify-between sm:space-y-0">
                                    <span className="text-xs text-muted-foreground">0 FAIR</span>
                                    <span className="text-xs text-muted-foreground">{maxSupply.toLocaleString()} FAIR ({t('max')})</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="border rounded-lg p-4 text-center">
                                    <div className="text-xl font-bold">90%</div>
                                    <div className="text-xs text-muted-foreground">{t('premine')}</div>
                                </div>
                                <div className="border rounded-lg p-4 text-center">
                                    <div className="text-lg font-bold">10 FAIR</div>
                                    <div className="text-xs text-muted-foreground">{t('perBlock')}</div>
                                </div>
                            </div>

                            <div className="grid gap-6 lg:grid-cols-2">
                                <div className="space-y-4">
                                    <div className="border rounded-lg p-4">
                                        <div className="flex flex-col space-y-2 sm:flex-row sm:justify-between sm:items-start sm:space-y-0">
                                            <span className="font-medium">{t('proofOfWorkPhase')}</span>
                                            <span className="text-sm text-muted-foreground">{t('blocks1to25000')}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-2">
                                            {t('initialMiningPhase')}
                                        </div>
                                    </div>

                                    <div className="border rounded-lg p-4">
                                        <div className="flex flex-col space-y-2 sm:flex-row sm:justify-between sm:items-start sm:space-y-0">
                                            <span className="font-medium">{t('proofOfStakePhase')}</span>
                                            <span className="text-sm text-muted-foreground">{t('blocks25001Plus')}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-2">
                                            {t('currentPhaseStaking')}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-center">
                                        <Badge variant={stats.phase === 'PoS' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
                                            {t('current', { phase: stats.phase || 'PoS' })}
                                        </Badge>
                                    </div>

                                    <div className="border rounded-lg p-4 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm">{t('blockReward')}</span>
                                            <span className="text-sm font-mono font-semibold">10 FAIR</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm">{t('blockTime')}</span>
                                            <span className="text-sm font-mono font-semibold">{t('seconds120')}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm">{t('dailyBlocks')}</span>
                                            <span className="text-sm font-mono font-semibold">720</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="staking" className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <SectionHeader
                                    icon={Shield}
                                    title={t('masternodeStaking')}
                                />
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="border rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-medium">{t('requirements')}</span>
                                        <Badge variant="default">{t('premium')}</Badge>
                                    </div>
                                    <div className="text-sm text-muted-foreground space-y-2">
                                        <p>• {t('masternodeRequirement1')}</p>
                                        <p>• {t('masternodeRequirement2')}</p>
                                        <p>• {t('masternodeRequirement3')}</p>
                                        <p>• {t('masternodeRequirement4')}</p>
                                    </div>
                                </div>

                                <div className="text-center p-4 border rounded-lg">
                                    <div className="text-3xl font-bold mb-1">{stats.masternodeCount || 'N/A'}</div>
                                    <div className="text-sm text-muted-foreground">{t('activeMasternodes')}</div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <SectionHeader
                                    icon={Coins}
                                    title={t('walletStaking')}
                                />
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="border rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-medium">{t('requirements')}</span>
                                        <Badge variant="secondary">{t('accessible')}</Badge>
                                    </div>
                                    <div className="text-sm text-muted-foreground space-y-2">
                                        <p>• {t('walletRequirement1')}</p>
                                        <p>• {t('walletRequirement2')}</p>
                                        <p>• {t('walletRequirement3')}</p>
                                        <p>• {t('walletRequirement4')}</p>
                                    </div>
                                </div>

                                <div className="text-center p-4 border rounded-lg">
                                    <div className="text-3xl font-bold mb-1">
                                        {stats.stakingRewards?.toFixed(2) || 'N/A'}%
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {t('estimatedAnnualReturn')}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="transactions" className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <SectionHeader
                                    icon={Hash}
                                    title={t('transactionStatistics')}
                                />
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">{t('totalTransactions')}</label>
                                        <p className="text-2xl font-bold break-all">{stats.totalTransactions.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">{t('avgTxPerBlock')}</label>
                                        <p className="text-2xl font-bold">{stats.avgTransactionsPerBlock.toFixed(1)}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">{t('mempool')}</label>
                                        <p className="text-lg font-semibold break-all">{stats.memPoolSize.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">{t('tps24hAvg')}</label>
                                        <p className="text-lg font-semibold break-all">
                                            {(stats.avgTransactionsPerBlock / (stats.avgBlockTime / 60)).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">{t('quickActions')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Button asChild variant="outline" className="w-full justify-start h-auto p-3">
                                    <Link href="/blocks" className="flex items-center">
                                        <Database className="h-5 w-5 mr-3 flex-shrink-0" />
                                        <span className="text-left">{t('viewRecentBlocks')}</span>
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" className="w-full justify-start h-auto p-3">
                                    <Link href="/masternodes" className="flex items-center">
                                        <Shield className="h-5 w-5 mr-3 flex-shrink-0" />
                                        <span className="text-left">{t('viewMasternodes')}</span>
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" className="w-full justify-start h-auto p-3">
                                    <Link href="/mempool" className="flex items-center">
                                        <Clock className="h-5 w-5 mr-3 flex-shrink-0" />
                                        <span className="text-left">{t('viewMempool')}</span>
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Navigation */}
            <div className="flex flex-col space-y-2 sm:flex-row sm:justify-center sm:space-y-0 sm:space-x-4">
                <Button asChild variant="outline" className="w-full sm:w-auto">
                    <Link href="/" className="flex items-center justify-center">
                        <Home className="h-4 w-4 mr-2" />
                        {t('backToHome')}
                    </Link>
                </Button>
            </div>
        </div>
    )
}
