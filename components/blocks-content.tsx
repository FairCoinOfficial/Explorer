"use client"

import { useNetwork } from '@/contexts/network-context'
import { NetworkStatus } from '@/components/network-status'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Database, Search, Home, Hash, Clock, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Block {
    height: number
    hash: string
    time: number
    nTx: number
    size: number
    tx: string[]
}

export function BlocksContent() {
    const { currentNetwork } = useNetwork()
    const [blocks, setBlocks] = useState<Block[]>([])
    const [height, setHeight] = useState<number>(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchBlocks = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch(`/api/blocks?network=${currentNetwork}&limit=20`)
            if (!response.ok) {
                throw new Error('Failed to fetch blocks')
            }

            const data = await response.json()
            setBlocks(data.blocks || [])
            setHeight(data.height || 0)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchBlocks()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentNetwork])

    if (loading) {
        return (
            <div className="flex-1 space-y-4 p-3 pt-4 md:p-6 lg:p-8">
                <div className="flex items-center justify-center h-64">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex-1 space-y-4 p-3 pt-4 md:p-6 lg:p-8">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <p className="text-lg text-muted-foreground mb-4">Error loading blocks</p>
                        <p className="text-sm text-red-500 mb-4">{error}</p>
                        <Button onClick={fetchBlocks} variant="outline">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Try Again
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-3 pt-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Recent Blocks</h2>
                    <p className="text-muted-foreground text-sm sm:text-base">
                        Latest blocks on the FairCoin blockchain
                    </p>
                </div>
                <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
                    <NetworkStatus />
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 self-start">
                        <Database className="w-3 h-3 mr-1" />
                        Current: {height?.toLocaleString() ?? 'N/A'}
                    </Badge>
                    <Button onClick={fetchBlocks} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Current Height</CardTitle>
                        <Hash className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{height?.toLocaleString() ?? 'N/A'}</div>
                        <p className="text-xs text-muted-foreground">Latest block number</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Blocks Shown</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{blocks.length}</div>
                        <p className="text-xs text-muted-foreground">Recent blocks</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Network</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{currentNetwork}</div>
                        <p className="text-xs text-muted-foreground">Active network</p>
                    </CardContent>
                </Card>
            </div>

            {/* Blocks Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Recent Blocks
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Height</TableHead>
                                    <TableHead>Hash</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Transactions</TableHead>
                                    <TableHead>Size</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {blocks.map((block) => (
                                    <TableRow key={block.height}>
                                        <TableCell className="font-medium">
                                            <Link
                                                href={`/block/${block.height}`}
                                                className="hover:underline"
                                            >
                                                {block.height.toLocaleString()}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">
                                            <Link
                                                href={`/block/${block.hash}`}
                                                className="hover:underline"
                                            >
                                                <span className="hidden sm:inline">{block.hash.substring(0, 16)}...</span>
                                                <span className="sm:hidden">{block.hash.substring(0, 8)}...</span>
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            <span className="hidden sm:inline">
                                                {new Date(block.time * 1000).toLocaleString()}
                                            </span>
                                            <span className="sm:hidden">
                                                {new Date(block.time * 1000).toLocaleDateString()}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">
                                                {block.nTx?.toLocaleString() ?? block.tx?.length?.toLocaleString() ?? 0}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {block.size ? `${(block.size / 1024).toFixed(1)} KB` : 'N/A'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

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
