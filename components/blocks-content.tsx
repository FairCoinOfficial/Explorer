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
            <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                        <p className="text-sm text-muted-foreground">Loading blocks...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center max-w-sm mx-auto px-4">
                        <div className="text-red-500 mb-4">
                            <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        </div>
                        <p className="text-lg font-medium text-muted-foreground mb-2">Error loading blocks</p>
                        <p className="text-sm text-red-500 mb-4">{error}</p>
                        <Button onClick={fetchBlocks} variant="outline" className="w-full sm:w-auto">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Try Again
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
                <div className="flex-1">
                    <h2 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">Recent Blocks</h2>
                    <p className="text-muted-foreground text-sm sm:text-base mt-1">
                        Latest blocks on the FairCoin blockchain
                    </p>
                </div>
                <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0 sm:flex-shrink-0">
                    <NetworkStatus />
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 self-start sm:self-auto text-xs sm:text-sm px-2 py-1">
                        <Database className="w-3 h-3 mr-1" />
                        <span className="hidden sm:inline">Current: </span>{height?.toLocaleString() ?? 'N/A'}
                    </Badge>
                    <Button onClick={fetchBlocks} variant="outline" size="sm" className="self-start sm:self-auto px-3">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Current Height</CardTitle>
                        <Hash className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="text-xl font-bold sm:text-2xl">{height?.toLocaleString() ?? 'N/A'}</div>
                        <p className="text-xs text-muted-foreground">Latest block number</p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Blocks Shown</CardTitle>
                        <Database className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="text-xl font-bold sm:text-2xl">{blocks.length}</div>
                        <p className="text-xs text-muted-foreground">Recent blocks</p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Network</CardTitle>
                        <Clock className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="text-lg font-bold sm:text-xl">{currentNetwork}</div>
                        <p className="text-xs text-muted-foreground">Active network</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Blocks Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                    <Database className="h-5 w-5 text-primary" />
                    <h3 className="text-lg sm:text-xl font-semibold">Recent Blocks</h3>
                </div>

                {/* Mobile Card View */}
                <div className="block sm:hidden space-y-2">
                    {blocks.map((block) => (
                        <Card key={block.height} className="hover:shadow-md transition-all duration-200 border-l-4 border-l-primary/30 hover:border-l-primary">
                            <CardContent className="p-3 sm:p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <Hash className="h-4 w-4 text-primary flex-shrink-0" />
                                        <Link
                                            href={`/block/${block.height}`}
                                            className="font-semibold text-base sm:text-lg hover:underline text-primary truncate"
                                        >
                                            #{block.height.toLocaleString()}
                                        </Link>
                                    </div>
                                    <Badge variant="secondary" className="text-xs font-medium bg-primary/10 text-primary border-primary/20 ml-2 flex-shrink-0">
                                        {block.nTx?.toLocaleString() ?? block.tx?.length?.toLocaleString() ?? 0} TX
                                    </Badge>
                                </div>

                                <div className="space-y-1.5 mb-2">
                                    <div className="flex items-start gap-2">
                                        <span className="text-xs text-muted-foreground font-medium flex-shrink-0 mt-0.5">Hash:</span>
                                        <Link
                                            href={`/block/${block.hash}`}
                                            className="font-mono text-sm hover:underline text-primary truncate"
                                        >
                                            {block.hash.substring(0, 16)}...
                                        </Link>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-xs sm:text-sm">
                                    <div className="flex items-center gap-1 text-muted-foreground min-w-0 flex-1">
                                        <Clock className="h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">{new Date(block.time * 1000).toLocaleDateString()}</span>
                                    </div>
                                    {block.size && (
                                        <div className="flex items-center gap-1 text-muted-foreground ml-2 flex-shrink-0">
                                            <Database className="h-3 w-3" />
                                            <span>{(block.size / 1024).toFixed(1)} KB</span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden sm:block">
                    <Card className="overflow-hidden shadow-sm">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="w-[100px] font-semibold">Height</TableHead>
                                            <TableHead className="min-w-[180px] font-semibold">Hash</TableHead>
                                            <TableHead className="w-[140px] font-semibold">Time</TableHead>
                                            <TableHead className="w-[110px] hidden md:table-cell font-semibold">Transactions</TableHead>
                                            <TableHead className="w-[90px] hidden lg:table-cell font-semibold">Size</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {blocks.map((block, index) => (
                                            <TableRow key={block.height} className={`hover:bg-muted/50 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}>
                                                <TableCell className="font-medium">
                                                    <Link
                                                        href={`/block/${block.height}`}
                                                        className="hover:underline text-primary font-semibold transition-colors"
                                                    >
                                                        {block.height.toLocaleString()}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">
                                                    <Link
                                                        href={`/block/${block.hash}`}
                                                        className="hover:underline text-primary transition-colors"
                                                    >
                                                        <span className="hidden xl:inline">{block.hash.substring(0, 28)}...</span>
                                                        <span className="hidden lg:inline xl:hidden">{block.hash.substring(0, 24)}...</span>
                                                        <span className="hidden md:inline lg:hidden">{block.hash.substring(0, 16)}...</span>
                                                        <span className="md:hidden">{block.hash.substring(0, 12)}...</span>
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    <span className="hidden lg:inline">
                                                        {new Date(block.time * 1000).toLocaleString()}
                                                    </span>
                                                    <span className="hidden md:inline lg:hidden">
                                                        {new Date(block.time * 1000).toLocaleString()}
                                                    </span>
                                                    <span className="md:hidden">
                                                        {new Date(block.time * 1000).toLocaleDateString()}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell">
                                                    <Badge variant="secondary" className="text-xs font-medium bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors">
                                                        {block.nTx?.toLocaleString() ?? block.tx?.length?.toLocaleString() ?? 0}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground font-medium">
                                                    {block.size ? `${(block.size / 1024).toFixed(1)} KB` : 'N/A'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-center pt-2 sm:pt-4">
                <Button asChild variant="outline" className="w-full sm:w-auto px-4 sm:px-6 py-2">
                    <Link href="/">
                        <Home className="h-4 w-4 mr-2" />
                        <span className="hidden xs:inline sm:inline">Back to Home</span>
                        <span className="xs:hidden sm:hidden">Home</span>
                    </Link>
                </Button>
            </div>
        </div>
    )
}
