"use client"

import { useNetwork } from '@/contexts/network-context'
import { NetworkStatus } from '@/components/network-status'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Database, Search, Home, Hash, Clock, RefreshCw, Filter, Calendar } from 'lucide-react'
import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { SectionHeader, StatsCard, StatsGrid, LoadingState, EmptyState } from '@/components/ui'
import { BlocksTable } from '@/components/ui/blocks-table'

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

            const response = await fetch(`/api/blocks?network=${currentNetwork}&limit=100`)
            if (!response.ok) throw new Error('Failed to fetch blocks')
            const data = await response.json()
            setBlocks(data.blocks || [])
            setHeight(data.height || 0)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }, [currentNetwork])

    useEffect(() => { fetchBlocks() }, [currentNetwork, fetchBlocks])

    const filteredBlocks = useMemo(() => {
        let filtered = blocks
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            filtered = filtered.filter(b => b.height.toString().includes(q) || b.hash.toLowerCase().includes(q))
        }
        if (timeFilter !== 'all') {
            const now = Date.now() / 1000
            const timeLimit = timeFilter === '1h' ? 3600 : timeFilter === '24h' ? 86400 : 604800
            filtered = filtered.filter(b => (now - b.time) <= timeLimit)
        }
        return filtered
    }, [blocks, searchQuery, timeFilter])

    const paginatedBlocks = useMemo(() => {
        const start = (currentPage - 1) * blocksPerPage
        return filteredBlocks.slice(start, start + blocksPerPage)
    }, [filteredBlocks, currentPage, blocksPerPage])

    useEffect(() => {
        setTotalPages(Math.max(1, Math.ceil(filteredBlocks.length / blocksPerPage)))
        if (currentPage > Math.ceil(filteredBlocks.length / blocksPerPage) && currentPage > 1) setCurrentPage(1)
    }, [filteredBlocks.length, blocksPerPage, currentPage])

    const handleSearch = useCallback((q: string) => { setSearchQuery(q); setCurrentPage(1) }, [])
    const handleTimeFilter = useCallback((f: 'all' | '1h' | '24h' | '7d') => { setTimeFilter(f); setCurrentPage(1) }, [])
    const handlePageChange = useCallback((p: number) => setCurrentPage(p), [])

    if (loading) return (
        <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
            <LoadingState message="Loading blocks..." />
        </div>
    )

    if (error) return (
        <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
            <EmptyState icon={Database} title="Error loading blocks" description={error} action={{ label: 'Try Again', onClick: fetchBlocks }} />
        </div>
    )

    return (
        <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
                <div className="flex-1">
                    <h2 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">Recent Blocks</h2>
                    <p className="text-muted-foreground text-sm sm:text-base mt-1">Latest blocks on the FairCoin blockchain</p>
                </div>
                <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0 sm:flex-shrink-0">
                    <NetworkStatus />
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 self-start sm:self-auto text-xs sm:text-sm px-2 py-1"><Database className="w-3 h-3 mr-1" /><span className="hidden sm:inline">Current: </span>{height?.toLocaleString() ?? 'N/A'}</Badge>
                    <Button onClick={() => fetchBlocks()} variant="outline" size="sm" className="self-start sm:self-auto px-3"><RefreshCw className="h-4 w-4" /></Button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <div className="flex-1 w-full sm:max-w-md">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input placeholder="Search by block height or hash..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)} className="pl-10 w-full" />
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground hidden sm:inline">Filter:</span>
                    </div>
                    <div className="flex space-x-1">
                        {[
                            { key: 'all', label: 'All' },
                            { key: '1h', label: '1H' },
                            { key: '24h', label: '24H' },
                            { key: '7d', label: '7D' }
                        ].map(({ key, label }) => (
                            <Button key={key} variant={timeFilter === key ? 'default' : 'outline'} size="sm" onClick={() => handleTimeFilter(key as any)} className="px-3 py-1 h-8 text-xs">{label}</Button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <StatsGrid columns={{ default: 1, sm: 2, lg: 4 }}>
                <StatsCard title="Current Height" value={height?.toLocaleString() ?? 'N/A'} description="Latest block number" icon={Hash} />
                <StatsCard title="Blocks Shown" value={paginatedBlocks.length} description={`Page ${currentPage} of ${totalPages} (${filteredBlocks.length} total)`} icon={Database} />
                <StatsCard title="Network" value={currentNetwork} description="Active network" icon={Clock} />
                <StatsCard title="Time Filter" value={timeFilter === 'all' ? 'All Time' : timeFilter === '1h' ? 'Last Hour' : timeFilter === '24h' ? 'Last 24H' : 'Last 7 Days'} description="Current filter" icon={Filter} />
            </StatsGrid>

            {/* Recent Blocks Section */}
            <div className="space-y-4">
                <SectionHeader icon={Database} title="Recent Blocks" badge={{ text: `${filteredBlocks.length} blocks`, variant: 'secondary' }} />

                <BlocksTable blocks={paginatedBlocks} currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} loading={loading} />
            </div>

            {/* Navigation */}
            <div className="flex justify-center pt-2 sm:pt-4">
                <Button asChild variant="outline" className="w-full sm:w-auto px-4 sm:px-6 py-2">
                    <Link href="/">
                        <Home className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Back to Home</span>
                        <span className="sm:hidden">Home</span>
                    </Link>
                </Button>
            </div>
        </div>
    )
}
