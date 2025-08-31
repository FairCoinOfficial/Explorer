"use client"

import { useNetwork } from '@/contexts/network-context'
import { NetworkStatus } from '@/components/network-status'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CopyButton } from '@/components/copy-button'
import { Wallet, TrendingUp, TrendingDown, RefreshCw, Home, Hash, Clock } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

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
                        <p className="text-lg text-muted-foreground mb-4">Error loading address</p>
                        <p className="text-sm text-destructive mb-4">{error}</p>
                        <Button onClick={fetchAddressInfo} variant="outline">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Try Again
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    if (!addressInfo) {
        return (
            <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
                <div className="flex items-center justify-center h-64">
                    <p className="text-lg text-muted-foreground">Address information not found</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            {/* Header */}
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Address Details</h2>
                    <p className="text-muted-foreground">
                        Address information and transaction history
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <NetworkStatus />
                    <Button onClick={fetchAddressInfo} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4" />
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{addressInfo.balance.toFixed(8)} FAIR</div>
                        <p className="text-xs text-muted-foreground">Available balance</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Received</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{addressInfo.totalReceived.toFixed(8)} FAIR</div>
                        <p className="text-xs text-muted-foreground">All time received</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{addressInfo.totalSent.toFixed(8)} FAIR</div>
                        <p className="text-xs text-muted-foreground">All time sent</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                        <Hash className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{addressInfo.txCount.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Total transactions</p>
                    </CardContent>
                </Card>
            </div>

            {/* Transactions */}
            <Tabs defaultValue="transactions" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="transactions">Transactions ({addressInfo.transactions.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="transactions">
                    <Card>
                        <CardHeader>
                            <CardTitle>Transaction History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {addressInfo.transactions.length > 0 ? (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Transaction</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Amount</TableHead>
                                                <TableHead>Block</TableHead>
                                                <TableHead>Time</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {addressInfo.transactions.map((tx) => (
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
                                                    <TableCell className="font-mono">
                                                        <span className={tx.type === 'received' ? '' : ''}>
                                                            {tx.type === 'received' ? '+' : '-'}{Math.abs(tx.amount).toFixed(8)} FAIR
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
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
                                                    <TableCell>
                                                        {new Date(tx.time * 1000).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell>
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
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground">No transactions found for this address</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
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
