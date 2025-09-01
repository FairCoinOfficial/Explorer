"use client"

import { useNetwork } from '@/contexts/network-context'
import { NetworkStatus } from '@/components/network-status'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CopyButton } from '@/components/copy-button'
import { SectionHeader, StatsGrid, StatsCard, EmptyState, LoadingState, SimpleDataTable } from '@/components/ui'
import { Wallet, TrendingUp, TrendingDown, RefreshCw, Home, Hash, Clock, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

interface AddressTransaction {
    txid: string
    time: number
    confirmations: number
    amount: number
    type: 'received' | 'sent'
    blockHeight?: number
}

interface AddressInfo {
    address: string
    balance: number
    totalReceived: number
    totalSent: number
    txCount: number
    transactions: AddressTransaction[]
}

export function AddressContent({ address }: { address: string }) {
    const t = useTranslations('common')
    const { currentNetwork } = useNetwork()
    const [addressInfo, setAddressInfo] = useState<AddressInfo | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchAddressInfo = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch(`/api/address/${address}?network=${currentNetwork}`)
            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to fetch address information')
            }

            const data = await response.json()
            setAddressInfo(data.addressInfo)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAddressInfo()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentNetwork, address])

    if (loading) {
        return (
            <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
                <LoadingState message={t('loading')} />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
                <EmptyState
                    icon={AlertTriangle}
                    title="Error Loading Address"
                    description={error}
                    action={{
                        label: "Try Again",
                        onClick: fetchAddressInfo,
                        variant: "outline"
                    }}
                />
            </div>
        )
    }

    if (!addressInfo) {
        return (
            <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
                <div className="flex items-center justify-center h-64">
                    <p className="text-lg text-muted-foreground">Address information not found</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Address Details</h2>
                    <p className="text-sm text-muted-foreground sm:text-base">
                        Address information and transaction history
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <NetworkStatus />
                    <Button onClick={fetchAddressInfo} variant="outline" size="sm" className="w-full sm:w-auto">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Address Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wallet className="h-5 w-5" />
                        Address Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Address</label>
                        <div className="flex items-center gap-2 mt-1">
                            <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">
                                {addressInfo.address}
                            </code>
                            <CopyButton text={addressInfo.address} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Balance Stats */}
            <div className="space-y-4">
                <SectionHeader
                    icon={Wallet}
                    title="Balance Statistics"
                />
                <StatsGrid>
                    <StatsCard
                        icon={Wallet}
                        title="Current Balance"
                        value={`${addressInfo.balance.toFixed(8)} FAIR`}
                        description="Available balance"
                    />
                    <StatsCard
                        icon={TrendingUp}
                        title="Total Received"
                        value={`${addressInfo.totalReceived.toFixed(8)} FAIR`}
                        description="All time received"
                    />
                    <StatsCard
                        icon={TrendingDown}
                        title="Total Sent"
                        value={`${addressInfo.totalSent.toFixed(8)} FAIR`}
                        description="All time sent"
                    />
                    <StatsCard
                        icon={Hash}
                        title="Transactions"
                        value={addressInfo.txCount.toLocaleString()}
                        description="Total transactions"
                    />
                </StatsGrid>
            </div>

            {/* Transactions */}
            <div className="space-y-4">
                <SectionHeader
                    icon={Hash}
                    title="Transaction History"
                    badge={{
                        text: `${addressInfo.transactions.length} transactions`,
                        variant: 'secondary'
                    }}
                />

                {addressInfo.transactions.length > 0 ? (
                    <div className="rounded-md border overflow-auto custom-scrollbar">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="h-8 px-2">Transaction</TableHead>
                                    <TableHead className="h-8 px-2">Type</TableHead>
                                    <TableHead className="h-8 px-2">Amount</TableHead>
                                    <TableHead className="h-8 px-2">Block</TableHead>
                                    <TableHead className="h-8 px-2">Time</TableHead>
                                    <TableHead className="h-8 px-2">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {addressInfo.transactions.map((tx) => (
                                    <TableRow key={tx.txid}>
                                        <TableCell className="font-mono text-sm whitespace-nowrap py-2 px-2">
                                            <Link
                                                href={`/tx/${tx.txid}`}
                                                className="hover:underline break-all"
                                            >
                                                {tx.txid.substring(0, 16)}...
                                            </Link>
                                        </TableCell>
                                        <TableCell className="py-2 px-2">
                                            <Badge
                                                variant={tx.type === 'received' ? 'default' : 'secondary'}
                                                className="flex items-center gap-1 w-fit"
                                            >
                                                {tx.type === 'received' ? (
                                                    <TrendingUp className="h-3 w-3" />
                                                ) : (
                                                    <TrendingDown className="h-3 w-3" />
                                                )}
                                                {tx.type === 'received' ? 'Received' : 'Sent'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono whitespace-nowrap py-2 px-2">
                                            <span className={tx.type === 'received' ? '' : ''}>
                                                {tx.type === 'received' ? '+' : '-'}{Math.abs(tx.amount).toFixed(8)} FAIR
                                            </span>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap py-2 px-2">
                                            {tx.blockHeight ? (
                                                <Link
                                                    href={`/block/${tx.blockHeight}`}
                                                    className="hover:underline"
                                                >
                                                    #{tx.blockHeight.toLocaleString()}
                                                </Link>
                                            ) : (
                                                <Badge variant="outline">Pending</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap py-2 px-2">
                                            {new Date(tx.time * 1000).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="py-2 px-2">
                                            <Badge variant={tx.confirmations > 0 ? 'default' : 'secondary'}>
                                                {tx.confirmations > 0 ? `${tx.confirmations} conf` : 'Unconfirmed'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <EmptyState
                        icon={Hash}
                        title="No Transactions Found"
                        description="This address has no transaction history"
                    />
                )}
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
