"use client"

import { useNetwork } from '@/contexts/network-context'
import { NetworkStatus } from '@/components/network-status'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CopyButton } from '@/components/copy-button'
import { Hash, Clock, CheckCircle, XCircle, Database, LinkIcon, FileText, AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface TransactionInput {
    txid: string
    vout: number
    scriptSig?: {
        asm: string
        hex: string
    }
    sequence: number
    value?: number
    address?: string
}

interface TransactionOutput {
    value: number
    n: number
    scriptPubKey: {
        asm: string
        hex: string
        reqSigs?: number
        type: string
        addresses?: string[]
    }
}

interface Transaction {
    txid: string
    version: number
    locktime: number
    size: number
    vsize?: number
    weight?: number
    vin: TransactionInput[]
    vout: TransactionOutput[]
    hex: string
    blockhash?: string
    confirmations?: number
    time?: number
    blocktime?: number
}

export function TransactionContent({ txid }: { txid: string }) {
    const { currentNetwork } = useNetwork()
    const router = useRouter()
    const [transaction, setTransaction] = useState<Transaction | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isBlockHashError, setIsBlockHashError] = useState(false)

    const fetchTransaction = async () => {
        try {
            setLoading(true)
            setError(null)
            setIsBlockHashError(false)

            const response = await fetch(`/api/transaction/${txid}?network=${currentNetwork}`)
            if (!response.ok) {
                const errorData = await response.json()

                // Check if this might be a block hash instead
                if (errorData.error?.includes('No information available about transaction')) {
                    // Try to check if it's a block hash
                    const blockResponse = await fetch(`/api/block/${txid}?network=${currentNetwork}`)
                    if (blockResponse.ok) {
                        // It's a valid block hash, redirect
                        router.push(`/block/${txid}`)
                        return
                    }
                    setIsBlockHashError(true)
                }

                throw new Error(errorData.error || 'Failed to fetch transaction')
            }

            const data = await response.json()
            setTransaction(data.transaction)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTransaction()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentNetwork, txid])

    if (loading) {
        return (
            <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
                <div className="flex items-center justify-center h-64">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        )
    }

    if (isBlockHashError) {
        return (
            <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
                <div className="flex items-center justify-between space-y-2">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Transaction Not Found</h2>
                        <p className="text-muted-foreground">
                            The provided ID does not correspond to a valid transaction
                        </p>
                    </div>
                    <NetworkStatus />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-muted-foreground">
                            <AlertTriangle className="h-5 w-5" />
                            Possible Block Hash Detected
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground">
                            The ID you provided might be a block hash rather than a transaction ID.
                        </p>

                        <div className="bg-muted/50 p-4 rounded-lg">
                            <p className="font-mono text-sm break-all">{txid}</p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button asChild>
                                <Link href={`/block/${txid}`}>
                                    <Database className="h-4 w-4 mr-2" />
                                    View as Block
                                </Link>
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href="/">
                                    <Home className="h-4 w-4 mr-2" />
                                    Back to Home
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <p className="text-lg text-muted-foreground mb-4">Error loading transaction</p>
                        <p className="text-sm text-destructive mb-4">{error}</p>
                        <Button onClick={fetchTransaction} variant="outline">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Try Again
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    if (!transaction) {
        return (
            <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
                <div className="flex items-center justify-center h-64">
                    <p className="text-lg text-muted-foreground">Transaction not found</p>
                </div>
            </div>
        )
    }

    const totalInput = transaction.vin.reduce((sum, input) => sum + (input.value || 0), 0)
    const totalOutput = transaction.vout.reduce((sum, output) => sum + output.value, 0)
    const fee = totalInput - totalOutput

    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            {/* Header */}
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Transaction Details</h2>
                    <p className="text-muted-foreground">
                        Transaction information on the FairCoin blockchain
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <NetworkStatus />
                    <Button onClick={fetchTransaction} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Transaction Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Hash className="h-5 w-5" />
                        Transaction Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Transaction ID</label>
                            <div className="flex items-center gap-2 mt-1">
                                <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">
                                    {transaction.txid}
                                </code>
                                <CopyButton text={transaction.txid} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Status</label>
                                <div className="mt-1">
                                    <Badge variant={transaction.confirmations ? "default" : "secondary"} className="flex items-center gap-1">
                                        {transaction.confirmations ? (
                                            <>
                                                <CheckCircle className="h-3 w-3" />
                                                Confirmed
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="h-3 w-3" />
                                                Unconfirmed
                                            </>
                                        )}
                                    </Badge>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Confirmations</label>
                                <p className="mt-1 font-mono">{transaction.confirmations?.toLocaleString() ?? '0'}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Block Time</label>
                                <p className="mt-1">
                                    {transaction.blocktime
                                        ? new Date(transaction.blocktime * 1000).toLocaleString()
                                        : 'Pending'
                                    }
                                </p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Size</label>
                                <p className="mt-1 font-mono">{transaction.size} bytes</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Version</label>
                                <p className="mt-1 font-mono">{transaction.version}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Lock Time</label>
                                <p className="mt-1 font-mono">{transaction.locktime}</p>
                            </div>
                        </div>

                        {transaction.blockhash && (
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Block Hash</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <Link
                                        href={`/block/${transaction.blockhash}`}
                                        className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all hover:bg-muted/80 transition-colors"
                                    >
                                        {transaction.blockhash}
                                    </Link>
                                    <CopyButton text={transaction.blockhash} />
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Transaction Summary */}
            <Card>
                <CardHeader>
                    <CardTitle>Transaction Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                        <div>
                            <div className="text-2xl font-bold">{totalInput.toFixed(8)} FAIR</div>
                            <div className="text-sm text-muted-foreground">Total Input</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{totalOutput.toFixed(8)} FAIR</div>
                            <div className="text-sm text-muted-foreground">Total Output</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{fee.toFixed(8)} FAIR</div>
                            <div className="text-sm text-muted-foreground">Transaction Fee</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Inputs and Outputs */}
            <Tabs defaultValue="inputs" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="inputs">Inputs ({transaction.vin.length})</TabsTrigger>
                    <TabsTrigger value="outputs">Outputs ({transaction.vout.length})</TabsTrigger>
                    <TabsTrigger value="raw">Raw Data</TabsTrigger>
                </TabsList>

                <TabsContent value="inputs">
                    <Card>
                        <CardHeader>
                            <CardTitle>Transaction Inputs</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {transaction.vin.map((input, index) => (
                                    <div key={index} className="border rounded-lg p-4">
                                        <div className="grid gap-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium">Input #{index}</span>
                                                {input.value && (
                                                    <Badge variant="outline">{input.value.toFixed(8)} FAIR</Badge>
                                                )}
                                            </div>

                                            {input.txid !== '0000000000000000000000000000000000000000000000000000000000000000' ? (
                                                <div className="space-y-2">
                                                    <div>
                                                        <label className="text-xs text-muted-foreground">Previous Transaction</label>
                                                        <div className="flex items-center gap-2">
                                                            <Link
                                                                href={`/tx/${input.txid}`}
                                                                className="text-sm font-mono hover:underline break-all"
                                                            >
                                                                {input.txid}
                                                            </Link>
                                                            <span className="text-sm text-muted-foreground">#{input.vout}</span>
                                                        </div>
                                                    </div>
                                                    {input.address && (
                                                        <div>
                                                            <label className="text-xs text-muted-foreground">Address</label>
                                                            <p className="text-sm font-mono break-all">{input.address}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div>
                                                    <Badge variant="secondary">Coinbase Transaction</Badge>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        This is a newly generated coin from mining
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="outputs">
                    <Card>
                        <CardHeader>
                            <CardTitle>Transaction Outputs</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {transaction.vout.map((output, index) => (
                                    <div key={index} className="border rounded-lg p-4">
                                        <div className="grid gap-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium">Output #{output.n}</span>
                                                <Badge variant="outline">{output.value.toFixed(8)} FAIR</Badge>
                                            </div>

                                            <div className="space-y-2">
                                                <div>
                                                    <label className="text-xs text-muted-foreground">Script Type</label>
                                                    <p className="text-sm font-mono">{output.scriptPubKey.type}</p>
                                                </div>

                                                {output.scriptPubKey.addresses && (
                                                    <div>
                                                        <label className="text-xs text-muted-foreground">Address</label>
                                                        <p className="text-sm font-mono break-all">
                                                            {output.scriptPubKey.addresses[0]}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="raw">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Raw Transaction Data
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Hex</label>
                                    <div className="mt-1">
                                        <code className="block p-3 bg-muted rounded text-xs font-mono break-all whitespace-pre-wrap">
                                            {transaction.hex}
                                        </code>
                                    </div>
                                </div>
                            </div>
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
