"use client"

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
                <LoadingState message="Loading masternode data..." />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
                <EmptyState
                    icon={AlertTriangle}
                    title="Error Loading Masternodes"
                    description={error}
                    action={{
                        label: "Try Again",
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
                    <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Masternodes</h2>
                    <p className="text-sm text-muted-foreground sm:text-base">
                        FairCoin network masternodes securing the blockchain
                    </p>
                </div>
                <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
                    <div className="flex items-center space-x-2">
                        <NetworkStatus />
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                            <Shield className="w-3 h-3 mr-1" />
                            {enabledNodes.length} Active
                        </Badge>
                    </div>
                    <Button onClick={fetchMasternodes} variant="outline" size="sm" className="w-full sm:w-auto">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="space-y-4">
                <SectionHeader
                    icon={Server}
                    title="Network Statistics"
                />
                <StatsGrid>
                    <StatsCard
                        icon={Server}
                        title="Total Masternodes"
                        value={masternodes.length.toLocaleString()}
                        description="Registered nodes"
                    />
                    <StatsCard
                        icon={Shield}
                        title="Active Nodes"
                        value={enabledNodes.length.toLocaleString()}
                        description={`${masternodes.length > 0 ? ((enabledNodes.length / masternodes.length) * 100).toFixed(1) : 0}% active`}
                    />
                    <StatsCard
                        icon={Lock}
                        title="Total Collateral"
                        value={`${(masternodes.length * collateralPerNode).toLocaleString()} FAIR`}
                        description="25K FAIR per node"
                    />
                    <StatsCard
                        icon={TrendingUp}
                        title="Network Security"
                        value={`${((masternodes.length * collateralPerNode) / 53193831 * 100).toFixed(1)}%`}
                        description="Of total supply locked"
                    />
                </StatsGrid>
            </div>

            {/* Masternode Information */}
            <div className="space-y-4">
                <SectionHeader
                    icon={Shield}
                    title="Masternode Requirements"
                />
                <InfoGrid
                    items={[
                        { label: "Collateral Required", value: "25,000 FAIR" },
                        { label: "Reward Type", value: "Block rewards + transaction fees" },
                        { label: "Network Benefits", value: "Masternodes enable Coin Mixing and FastSend features" },
                        { label: "Governance", value: "Decentralized blockchain voting for network decisions" }
                    ]}
                />
            </div>

            {/* Masternodes Table */}
            <Tabs defaultValue="active" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="active">Active Nodes ({enabledNodes.length})</TabsTrigger>
                    <TabsTrigger value="all">All Nodes ({masternodes.length})</TabsTrigger>
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
