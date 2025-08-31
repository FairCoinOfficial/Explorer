"use client"

import { useNetwork } from '@/contexts/network-context'
import { NetworkStatus } from '@/components/network-status'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Database, Search, Home, Hash, Clock, RefreshCw, Copy, ChevronLeft, ChevronRight, Filter, Calendar } from 'lucide-react'
import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { SectionHeader, StatsCard, StatsGrid, LoadingState, EmptyState } from '@/components/ui'
import { CopyButton } from '@/components/copy-button'

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
    const [searchQuery, setSearchQuery] = useState('')
    const [timeFilter, setTimeFilter] = useState<'all' | '1h' | '24h' | '7d'>('all')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const blocksPerPage = 20

    const fetchBlocks = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch(`/api/blocks?network=${currentNetwork}&limit=100`) // Fetch more blocks for client-side filtering
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
    }, [currentNetwork])

    useEffect(() => {
        fetchBlocks()
    }, [currentNetwork, fetchBlocks])

    // Filter and paginate blocks client-side
    const filteredBlocks = useMemo(() => {
        let filtered = blocks

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(block =>
                block.height.toString().includes(query) ||
                block.hash.toLowerCase().includes(query)
            )
        }

        // Apply time filter
        if (timeFilter !== 'all') {
            const now = Date.now() / 1000
            const timeLimit = timeFilter === '1h' ? 3600 :
                             timeFilter === '24h' ? 86400 : 604800
            filtered = filtered.filter(block => (now - block.time) <= timeLimit)
        }

        return filtered
    }, [blocks, searchQuery, timeFilter])

    // Paginate filtered blocks
    const paginatedBlocks = useMemo(() => {
        const startIndex = (currentPage - 1) * blocksPerPage
        const endIndex = startIndex + blocksPerPage
        return filteredBlocks.slice(startIndex, endIndex)
    }, [filteredBlocks, currentPage, blocksPerPage])

    // Update total pages when filtered blocks change
    useEffect(() => {
        setTotalPages(Math.ceil(filteredBlocks.length / blocksPerPage))
        if (currentPage > Math.ceil(filteredBlocks.length / blocksPerPage) && currentPage > 1) {
            setCurrentPage(1)
        }
    }, [filteredBlocks.length, blocksPerPage, currentPage])

    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query)
        setCurrentPage(1)
    }, [])

    const handleTimeFilter = useCallback((filter: 'all' | '1h' | '24h' | '7d') => {
        setTimeFilter(filter)
        setCurrentPage(1)
    }, [])

    const handlePageChange = useCallback((page: number) => {
        setCurrentPage(page)
    }, [])

    if (loading) {
        return (
            <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
                <LoadingState message="Loading blocks..." />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
                <EmptyState
                    icon={Database}
                    title="Error loading blocks"
                    description={error}
                    action={{
                        label: "Try Again",
                        onClick: fetchBlocks
                    }}
                />
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
                    <Button onClick={() => fetchBlocks()} variant="outline" size="sm" className="self-start sm:self-auto px-3">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <div className="flex-1 max-w-md">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                            placeholder="Search by block height or hash..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground hidden sm:inline">Filter:</span>
                    </div>
                    <div className="flex space-x-1">
                        {[
                            { key: 'all', label: 'All', icon: null },
                            { key: '1h', label: '1H', icon: null },
                            { key: '24h', label: '24H', icon: null },
                            { key: '7d', label: '7D', icon: null }
                        ].map(({ key, label }) => (
                            <Button
                                key={key}
                                variant={timeFilter === key ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleTimeFilter(key as any)}
                                className="px-3 py-1 h-8 text-xs"
                            >
                                {label}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <StatsGrid columns={{ default: 1, sm: 2, lg: 4 }}>
                <StatsCard
                    title="Current Height"
                    value={height?.toLocaleString() ?? 'N/A'}
                    description="Latest block number"
                    icon={Hash}
                />
                <StatsCard
                    title="Blocks Shown"
                    value={paginatedBlocks.length}
                    description={`Page ${currentPage} of ${totalPages} (${filteredBlocks.length} total)`}
                    icon={Database}
                />
                <StatsCard
                    title="Network"
                    value={currentNetwork}
                    description="Active network"
                    icon={Clock}
                />
                <StatsCard
                    title="Time Filter"
                    value={timeFilter === 'all' ? 'All Time' : timeFilter === '1h' ? 'Last Hour' : timeFilter === '24h' ? 'Last 24H' : 'Last 7 Days'}
                    description="Current filter"
                    icon={Filter}
                />
            </StatsGrid>

            {/* Recent Blocks Section */}
            <div className="space-y-4">
                <SectionHeader
                    icon={Database}
                    title="Recent Blocks"
                    badge={{
                        text: `${filteredBlocks.length} blocks`,
                        variant: 'secondary'
                    }}
                />

                {/* Mobile Card View */}
                <div className="block sm:hidden space-y-2">
                    {paginatedBlocks.map((block) => (
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
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <Badge variant="secondary" className="text-xs font-medium bg-primary/10 text-primary border-primary/20">
                                            {block.nTx?.toLocaleString() ?? block.tx?.length?.toLocaleString() ?? 0} TX
                                        </Badge>
                                        <CopyButton text={block.hash} className="h-6 w-6" />
                                    </div>
                                </div>

                                <div className="space-y-1.5 mb-2">
                                    <div className="flex items-start gap-2">
                                        <span className="text-xs text-muted-foreground font-medium flex-shrink-0 mt-0.5">Hash:</span>
                                        <div className="flex items-center gap-1 min-w-0 flex-1">
                                            <Link
                                                href={`/block/${block.hash}`}
                                                className="font-mono text-sm hover:underline text-primary truncate"
                                            >
                                                {block.hash.substring(0, 16)}...
                                            </Link>
                                            <CopyButton text={block.hash} className="h-5 w-5 flex-shrink-0" />
                                        </div>
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
                                        {paginatedBlocks.map((block, index) => (
                                            <TableRow key={block.height} className={`group hover:bg-muted/50 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <Link
                                                            href={`/block/${block.height}`}
                                                            className="hover:underline text-primary font-semibold transition-colors"
                                                        >
                                                            {block.height.toLocaleString()}
                                                        </Link>
                                                        <CopyButton text={block.hash} className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <Link
                                                            href={`/block/${block.hash}`}
                                                            className="hover:underline text-primary transition-colors"
                                                        >
                                                            <span className="hidden xl:inline">{block.hash.substring(0, 28)}...</span>
                                                            <span className="hidden lg:inline xl:hidden">{block.hash.substring(0, 24)}...</span>
                                                            <span className="hidden md:inline lg:hidden">{block.hash.substring(0, 16)}...</span>
                                                            <span className="md:hidden">{block.hash.substring(0, 12)}...</span>
                                                        </Link>
                                                        <CopyButton text={block.hash} className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
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

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <span>Page {currentPage} of {totalPages}</span>
                        <span>•</span>
                        <span>{blocks.length} blocks</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

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
