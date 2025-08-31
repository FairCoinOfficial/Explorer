"use client"

import { useNetwork } from '@/contexts/network-context'
import { NetworkStatus } from '@/components/network-status'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CopyButton } from '@/components/copy-button'
import { Hash, Clock, Database, ArrowLeft, ArrowRight, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface Block {
    hash: string
    height: number
    version: number
    merkleroot: string
    time: number
    nonce: number
    bits: string
    difficulty: number
    chainwork: string
    nTx: number
    size: number
    weight?: number
    tx: string[]
    previousblockhash?: string
    nextblockhash?: string
    confirmations: number
}

export function BlockContent({ hashOrHeight }: { hashOrHeight: string }) {
    const { currentNetwork } = useNetwork()
    const [block, setBlock] = useState<Block | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchBlock = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch(`/api/block/${hashOrHeight}?network=${currentNetwork}`)
            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to fetch block')
            }

            const data = await response.json()
            setBlock(data.block)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchBlock()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentNetwork, hashOrHeight])

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
                        <p className="text-lg text-muted-foreground mb-4">Error loading block</p>
                        <p className="text-sm text-red-500 mb-4">{error}</p>
                        <Button onClick={fetchBlock} variant="outline">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Try Again
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    if (!block) {
        return (
            <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
                <div className="flex items-center justify-center h-64">
                    <p className="text-lg text-muted-foreground">Block not found</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            {/* Header */}
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Block #{block.height}</h2>
                    <p className="text-muted-foreground">
                        Block details and transactions
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <NetworkStatus />
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        <Database className="w-3 h-3 mr-1" />
                        {block.tx.length} TX
                    </Badge>
                    <Button onClick={fetchBlock} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Block Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Block Height</CardTitle>
                        <Hash className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{block.height.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Block number</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{block.tx.length.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Total transactions</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Block Size</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {(block.size / 1024).toFixed(1)} KB
                        </div>
                        <p className="text-xs text-muted-foreground">{block.size.toLocaleString()} bytes</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Confirmations</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{block.confirmations.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Network confirmations</p>
                    </CardContent>
                </Card>
            </div>

            {/* Block Details */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Hash className="h-5 w-5" />
                        Block Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Block Hash</label>
                            <div className="flex items-center gap-2 mt-1">
                                <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">
                                    {block.hash}
                                </code>
                                <CopyButton text={block.hash} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                                <p className="mt-1">{new Date(block.time * 1000).toLocaleString()}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Difficulty</label>
                                <p className="mt-1 font-mono">{block.difficulty.toFixed(6)}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Nonce</label>
                                <p className="mt-1 font-mono">{block.nonce.toLocaleString()}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Version</label>
                                <p className="mt-1 font-mono">{block.version}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Bits</label>
                                <p className="mt-1 font-mono">{block.bits}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Weight</label>
                                <p className="mt-1 font-mono">
                                    {block.weight ? block.weight.toLocaleString() : 'N/A'}
                                </p>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Merkle Root</label>
                            <div className="flex items-center gap-2 mt-1">
                                <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">
                                    {block.merkleroot}
                                </code>
                                <CopyButton text={block.merkleroot} />
                            </div>
                        </div>

                        {block.previousblockhash && (
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Previous Block</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <Link
                                        href={`/block/${block.previousblockhash}`}
                                        className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all hover:bg-muted/80 transition-colors"
                                    >
                                        {block.previousblockhash}
                                    </Link>
                                    <CopyButton text={block.previousblockhash} />
                                </div>
                            </div>
                        )}

                        {block.nextblockhash && (
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Next Block</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <Link
                                        href={`/block/${block.nextblockhash}`}
                                        className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all hover:bg-muted/80 transition-colors"
                                    >
                                        {block.nextblockhash}
                                    </Link>
                                    <CopyButton text={block.nextblockhash} />
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Block Navigation */}
            <div className="flex justify-between items-center">
                <Button
                    asChild
                    variant="outline"
                    disabled={!block.previousblockhash}
                >
                    <Link href={block.previousblockhash ? `/block/${block.height - 1}` : '#'}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Previous Block
                    </Link>
                </Button>

                <Button asChild variant="outline">
                    <Link href="/">
                        <Home className="h-4 w-4 mr-2" />
                        Back to Home
                    </Link>
                </Button>

                <Button
                    asChild
                    variant="outline"
                    disabled={!block.nextblockhash}
                >
                    <Link href={block.nextblockhash ? `/block/${block.height + 1}` : '#'}>
                        Next Block
                        <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                </Button>
            </div>

            {/* Transactions */}
            <Tabs defaultValue="transactions" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="transactions">Transactions ({block.tx.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="transactions">
                    <Card>
                        <CardHeader>
                            <CardTitle>Block Transactions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {block.tx.length > 0 ? (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Transaction ID</TableHead>
                                                <TableHead className="text-right">Index</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {block.tx.map((txid, index) => (
                                                <TableRow key={txid}>
                                                    <TableCell className="font-mono text-sm">
                                                        <Link
                                                            href={`/tx/${txid}`}
                                                            className="hover:underline break-all"
                                                        >
                                                            {txid}
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant="outline">#{index}</Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground">No transactions in this block</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
