"use client"

import { useNetwork } from '@/contexts/network-context'
import { NetworkStatus } from '@/components/network-status'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Shield, Server, Clock, Coins, RefreshCw, TrendingUp, Users, Lock } from 'lucide-react'
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
                        <p className="text-lg text-muted-foreground mb-4">Error loading masternodes</p>
                        <p className="text-sm text-destructive mb-4">{error}</p>
                        <Button onClick={fetchMasternodes} variant="outline">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Try Again
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    const enabledNodes = masternodes.filter(mn => mn.status === 'ENABLED')
    const collateralPerNode = 25000 // 25K FAIR per masternode

    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            {/* Header */}
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Masternodes</h2>
                    <p className="text-muted-foreground">
                        FairCoin network masternodes securing the blockchain
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <NetworkStatus />
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        <Shield className="w-3 h-3 mr-1" />
                        {enabledNodes.length} Active
                    </Badge>
                    <Button onClick={fetchMasternodes} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Masternodes</CardTitle>
                        <Server className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{masternodes.length.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Registered nodes</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Nodes</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{enabledNodes.length.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            {masternodes.length > 0 ? ((enabledNodes.length / masternodes.length) * 100).toFixed(1) : 0}% active
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Collateral</CardTitle>
                        <Lock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {(masternodes.length * collateralPerNode).toLocaleString()} FAIR
                        </div>
                        <p className="text-xs text-muted-foreground">25K FAIR per node</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Network Security</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {((masternodes.length * collateralPerNode) / 53193831 * 100).toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground">Of total supply locked</p>
                    </CardContent>
                </Card>
            </div>

            {/* Masternode Information */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Masternode Requirements
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-medium">Collateral Required</label>
                                <p className="text-lg font-bold">25,000 FAIR</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Reward Type</label>
                                <p className="text-sm text-muted-foreground">Block rewards + transaction fees</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-medium">Network Benefits</label>
                                <p className="text-sm text-muted-foreground">
                                    Masternodes enable Coin Mixing and FastSend features
                                </p>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Governance</label>
                                <p className="text-sm text-muted-foreground">
                                    Decentralized blockchain voting for network decisions
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Masternodes Table */}
            <Tabs defaultValue="active" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="active">Active Nodes ({enabledNodes.length})</TabsTrigger>
                    <TabsTrigger value="all">All Nodes ({masternodes.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="active">
                    <Card>
                        <CardHeader>
                            <CardTitle>Active Masternodes</CardTitle>
                        </CardHeader>
                        <CardContent>
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
                                <div className="text-center py-8">
                                    <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
                                    <h3 className="mt-4 text-lg font-medium">No Active Masternodes</h3>
                                    <p className="mt-2 text-muted-foreground">
                                        No active masternodes found on the network.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="all">
                    <Card>
                        <CardHeader>
                            <CardTitle>All Masternodes</CardTitle>
                        </CardHeader>
                        <CardContent>
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
                                <div className="text-center py-8">
                                    <Server className="mx-auto h-12 w-12 text-muted-foreground" />
                                    <h3 className="mt-4 text-lg font-medium">No Masternodes Found</h3>
                                    <p className="mt-2 text-muted-foreground">
                                        Unable to fetch masternode data.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
