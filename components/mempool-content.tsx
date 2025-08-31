"use client"

import { useNetwork } from '@/contexts/network-context'
import { NetworkStatus } from '@/components/network-status'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Clock, Zap, RefreshCw, Home, Hash, Database } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { SectionHeader, StatsCard, StatsGrid, LoadingState, EmptyState } from '@/components/ui'

interface MempoolTransaction {
    txid: string
    size: number
    fee: number
    feeRate: number
    time: number
    depends: string[]
}

interface MempoolInfo {
    size: number
    bytes: number
    usage: number
    maxmempool: number
    mempoolminfee: number
    transactions: MempoolTransaction[]
}

export function MempoolContent() {
    const { currentNetwork } = useNetwork()
    const [mempoolInfo, setMempoolInfo] = useState<MempoolInfo | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchMempool = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch(`/api/mempool?network=${currentNetwork}`)
            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to fetch mempool information')
            }

            const data = await response.json()
            setMempoolInfo(data.mempoolInfo)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchMempool()
        // Auto-refresh every 10 seconds
        const interval = setInterval(fetchMempool, 10000)
        return () => clearInterval(interval)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentNetwork])

    if (loading) {
        return (
            <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
                <LoadingState message="Loading mempool..." />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
                <EmptyState
                    icon={Database}
                    title="Error loading mempool"
                    description={error}
                    action={{
                        label: "Try Again",
                        onClick: fetchMempool
                    }}
                />
            </div>
        )
    }

    if (!mempoolInfo) {
        return (
            <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
                <div className="flex items-center justify-center h-64">
                    <p className="text-lg text-muted-foreground">No mempool information available</p>
                </div>
            </div>
        )
    }

    const utilizationPercent = mempoolInfo.maxmempool > 0
        ? (mempoolInfo.bytes / mempoolInfo.maxmempool) * 100
        : 0

    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            {/* Header */}
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Memory Pool</h2>
                    <p className="text-muted-foreground">
                        Unconfirmed transactions waiting to be included in blocks
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <NetworkStatus />
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        <Clock className="w-3 h-3 mr-1" />
                        Auto-refresh: 10s
                    </Badge>
                    <Button onClick={fetchMempool} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Mempool Stats */}
            <div className="space-y-4">
                <SectionHeader
                    icon={Database}
                    title="Mempool Statistics"
                />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="border rounded-lg p-4">
                        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <h4 className="text-sm font-medium">Pending Transactions</h4>
                            <Hash className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-2xl font-bold">{mempoolInfo.size.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Unconfirmed transactions</p>
                    </div>

                    <div className="border rounded-lg p-4">
                        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <h4 className="text-sm font-medium">Memory Usage</h4>
                            <Database className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-2xl font-bold">
                            {(mempoolInfo.bytes / 1024 / 1024).toFixed(1)} MB
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {utilizationPercent.toFixed(1)}% of max capacity
                        </p>
                    </div>

                    <div className="border rounded-lg p-4">
                        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <h4 className="text-sm font-medium">Min Fee Rate</h4>
                            <Zap className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-2xl font-bold">
                            {(mempoolInfo.mempoolminfee * 100000000).toFixed(0)}
                        </div>
                        <p className="text-xs text-muted-foreground">sat/vB minimum</p>
                    </div>

                    <div className="border rounded-lg p-4">
                        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <h4 className="text-sm font-medium">Avg TX Size</h4>
                            <Database className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-2xl font-bold">
                            {mempoolInfo.size > 0 ? Math.round(mempoolInfo.bytes / mempoolInfo.size) : 0}
                        </div>
                        <p className="text-xs text-muted-foreground">bytes per transaction</p>
                    </div>
                </div>
            </div>

            {/* Mempool Utilization */}
            <div className="space-y-4">
                <SectionHeader
                    icon={Database}
                    title="Mempool Utilization"
                />
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Memory Used</span>
                        <span className="text-sm text-muted-foreground">
                            {(mempoolInfo.bytes / 1024 / 1024).toFixed(2)} MB / {(mempoolInfo.maxmempool / 1024 / 1024).toFixed(0)} MB
                        </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                        <div
                            className={`h-3 rounded-full transition-all duration-300 ${utilizationPercent > 80 ? 'bg-destructive' :
                                utilizationPercent > 60 ? 'bg-yellow-500' : 'bg-primary'
                                }`}
                            style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0%</span>
                        <span className="font-medium">{utilizationPercent.toFixed(1)}%</span>
                        <span>100%</span>
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="space-y-4">
                <SectionHeader
                    icon={Clock}
                    title="Recent Unconfirmed Transactions"
                    badge={{
                        text: `${mempoolInfo.transactions.length} pending`,
                        variant: 'secondary'
                    }}
                />

                {mempoolInfo.transactions.length > 0 ? (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Transaction ID</TableHead>
                                    <TableHead>Size</TableHead>
                                    <TableHead>Fee</TableHead>
                                    <TableHead>Fee Rate</TableHead>
                                    <TableHead>Time in Pool</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {mempoolInfo.transactions.slice(0, 20).map((tx) => (
                                    <TableRow key={tx.txid}>
                                        <TableCell className="font-mono text-sm">
                                            <Link
                                                href={`/tx/${tx.txid}`}
                                                className="hover:underline break-all"
                                            >
                                                {tx.txid.substring(0, 16)}...
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {tx.size.toLocaleString()} bytes
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono">
                                            {(tx.fee * 100000000).toFixed(0)} sat
                                        </TableCell>
                                        <TableCell className="font-mono">
                                            {tx.feeRate.toFixed(1)} sat/vB
                                        </TableCell>
                                        <TableCell>
                                            {Math.round((Date.now() / 1000 - tx.time) / 60)} min ago
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">Mempool is Empty</h3>
                        <p className="text-muted-foreground">
                            No unconfirmed transactions are currently waiting to be processed.
                        </p>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                    <Zap className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Quick Actions</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="border rounded-lg p-4">
                        <h4 className="text-sm font-medium mb-3">Navigation</h4>
                        <div className="space-y-3">
                            <Button asChild variant="outline" className="w-full justify-start">
                                <Link href="/blocks">
                                    <Database className="h-4 w-4 mr-2" />
                                    View Recent Blocks
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="w-full justify-start">
                                <Link href="/stats">
                                    <Hash className="h-4 w-4 mr-2" />
                                    Network Statistics
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <div className="border rounded-lg p-4">
                        <h4 className="text-sm font-medium mb-3">Mempool Tips</h4>
                        <div className="space-y-2 text-sm text-muted-foreground">
                            <p>• Higher fee rates get confirmed faster</p>
                            <p>• Minimum fee rate: {(mempoolInfo.mempoolminfee * 100000000).toFixed(0)} sat/vB</p>
                            <p>• Transactions with dependencies may take longer</p>
                            <p>• Mempool is cleared when transactions are mined</p>
                        </div>
                    </div>
                </div>
            </div>

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
