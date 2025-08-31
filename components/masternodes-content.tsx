"use client"

import { useTranslations } from 'next-intl'
import { useNetwork } from '@/contexts/network-context'
import { NetworkStatus } from '@/components/network-status'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SectionHeader, StatsGrid, StatsCard, EmptyState, LoadingState, InfoGrid } from '@/components/ui'
import { Shield, Server, Clock, Coins, RefreshCw, TrendingUp, Users, Lock, AlertTriangle } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Masternode {
    txid: string
    address: string
    protocol: number
    status: string
    activeTime: number
    lastSeen: number
    pubkey: string
}

interface MasternodeStats {
    total: number
    enabled: number
    preEnabled: number
    expired: number
    newStartRequired: number
    watchdogExpired: number
    totalCollateral: number
    collateralPercentage: number
    averageActiveTime: number
    networkSecurity: {
        masternodeRewards: number
        stakingRewards: number
        budgetRewards: number
    }
}

export function MasternodesContent() {
    const t = useTranslations('masternodes')
    const common = useTranslations('common')
    const { currentNetwork } = useNetwork()
    const [masternodes, setMasternodes] = useState<Masternode[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [stats, setStats] = useState<MasternodeStats>({
        total: 0,
        enabled: 0,
        preEnabled: 0,
        expired: 0,
        newStartRequired: 0,
        watchdogExpired: 0,
        totalCollateral: 0,
        collateralPercentage: 0,
        averageActiveTime: 0,
        networkSecurity: {
            masternodeRewards: 45,
            stakingRewards: 45,
            budgetRewards: 10
        }
    })

    const fetchMasternodes = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch(`/api/masternodes?network=${currentNetwork}`)
            if (!response.ok) {
                throw new Error('Failed to fetch masternodes')
            }

            const data = await response.json()
            setMasternodes(data.masternodes || [])
            setStats(data.stats || stats)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchMasternodes()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentNetwork])

    if (loading) {
        return (
            <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
                <LoadingState message={t('loadingData')} />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
                <EmptyState
                    icon={AlertTriangle}
                    title={t('errorLoading')}
                    description={error}
                    action={{
                        label: common('tryAgain'),
                        onClick: fetchMasternodes,
                        variant: "outline"
                    }}
                />
            </div>
        )
    }

    const enabledNodes = masternodes.filter(mn => mn.status === 'ENABLED')
    const collateralPerNode = 25000 // 25K FAIR per masternode

    return (
        <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('title')}</h2>
                    <p className="text-sm text-muted-foreground sm:text-base">
                        {t('networkDescription')}
                    </p>
                </div>
                <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
                    <div className="flex items-center space-x-2">
                        <NetworkStatus />
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                            <Shield className="w-3 h-3 mr-1" />
                            {enabledNodes.length} {t('active')}
                        </Badge>
                    </div>
                    <Button onClick={fetchMasternodes} variant="outline" size="sm" className="w-full sm:w-auto">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {common('refresh')}
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="space-y-4">
                                <SectionHeader
                    icon={Server}
                    title={t('networkStatistics')}
                />
                <StatsGrid>
                    <StatsCard
                        icon={Server}
                        title={t('totalMasternodes')}
                        value={masternodes.length.toLocaleString()}
                        description={t('totalCount')}
                    />
                    <StatsCard
                        icon={Shield}
                        title={t('activeMasternodes')}
                        value={enabledNodes.length.toLocaleString()}
                        description={t('enabled')}
                    />
                    <StatsCard
                        icon={Coins}
                        title={t('totalCollateral')}
                        value={`${(masternodes.length * collateralPerNode).toLocaleString()} FAIR`}
                        description={t('collateralPerNode')}
                    />
                    <StatsCard
                        icon={TrendingUp}
                        title={t('networkSecurity')}
                        value={`${((masternodes.length * collateralPerNode) / 53193831 * 100).toFixed(1)}%`}
                        description={t('ofTotalSupplyLocked')}
                    />
                </StatsGrid>
            </div>

            {/* Masternode Information */}
            <div className="space-y-4">
                <SectionHeader
                    icon={Shield}
                    title={t('masternodeRequirements')}
                />
                <InfoGrid
                    items={[
                        { label: t('collateralRequired'), value: "25,000 FAIR" },
                        { label: t('rewardType'), value: t('blockRewardsAndFees') },
                        { label: t('networkBenefits'), value: t('enablesMixingAndFastSend') },
                        { label: t('governance'), value: t('decentralizedVoting') }
                    ]}
                />
            </div>

            {/* Masternodes Table */}
            <Tabs defaultValue="active" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="active">{t('activeNodes')} ({enabledNodes.length})</TabsTrigger>
                    <TabsTrigger value="all">{t('allNodes')} ({masternodes.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="active">
                    <div className="space-y-4">
                        <SectionHeader
                            icon={Shield}
                            title="Active Masternodes"
                            badge={{
                                text: `${enabledNodes.length} active`,
                                variant: 'secondary'
                            }}
                        />

                        {enabledNodes.length > 0 ? (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Address</TableHead>
                                            <TableHead>IP/Location</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Last Seen</TableHead>
                                            <TableHead>Active Time</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {enabledNodes.slice(0, 50).map((node, index) => (
                                            <TableRow key={node.txid || index}>
                                                <TableCell className="font-mono text-sm">
                                                    {node.address ? `${node.address.substring(0, 16)}...` : 'N/A'}
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">
                                                    {node.address || 'N/A'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="default">
                                                        <Shield className="w-3 h-3 mr-1" />
                                                        {node.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {node.lastSeen
                                                        ? new Date(node.lastSeen * 1000).toLocaleString()
                                                        : 'N/A'
                                                    }
                                                </TableCell>
                                                <TableCell>
                                                    {node.activeTime
                                                        ? `${Math.floor(node.activeTime / 86400)} days`
                                                        : 'N/A'
                                                    }
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <EmptyState
                                icon={Shield}
                                title="No Active Masternodes"
                                description="No active masternodes found on the network"
                            />
                        )}
                    </div>
                </TabsContent>                                <TabsContent value="all">
                    <div className="space-y-4">
                        <SectionHeader
                            icon={Server}
                            title="All Masternodes"
                            badge={{
                                text: `${masternodes.length} total`,
                                variant: 'secondary'
                            }}
                        />

                        {masternodes.length > 0 ? (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Address</TableHead>
                                            <TableHead>Network</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Protocol</TableHead>
                                            <TableHead>Last Seen</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {masternodes.slice(0, 100).map((node, index) => (
                                            <TableRow key={node.txid || index}>
                                                <TableCell className="font-mono text-sm">
                                                    {node.address ? `${node.address.substring(0, 16)}...` : 'N/A'}
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">
                                                    {node.address || 'N/A'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={node.status === 'ENABLED' ? 'default' : 'secondary'}
                                                    >
                                                        {node.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-mono">
                                                    {node.protocol || 'N/A'}
                                                </TableCell>
                                                <TableCell>
                                                    {node.lastSeen
                                                        ? new Date(node.lastSeen * 1000).toLocaleString()
                                                        : 'N/A'
                                                    }
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <EmptyState
                                icon={Server}
                                title="No Masternodes Found"
                                description="Unable to fetch masternode data"
                            />
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
