"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from 'next-intl'
import { useNetwork } from "@/contexts/network-context"
import { Search, Hash, Clock, Wallet, FileText, TrendingUp, History, X, ExternalLink, AlertCircle, CheckCircle, Info, Eye, Copy } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface AdvancedSearchContentProps {
    initialQuery?: string
    initialNetwork?: string
}

interface SearchSuggestion {
    type: 'block' | 'transaction' | 'address' | 'height'
    value: string
    label: string
    description: string
    icon: any
    color: string
}

interface SearchResult {
    query: string
    network: string
    type: string
    results: any
    timestamp: string
    message?: string
}

export function AdvancedSearchContent({ initialQuery = "", initialNetwork = "mainnet" }: AdvancedSearchContentProps) {
    const t = useTranslations('search')
    const tCommon = useTranslations('common')
    const { currentNetwork } = useNetwork()
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState(initialQuery)
    const [isSearching, setIsSearching] = useState(false)
    const [searchHistory, setSearchHistory] = useState<string[]>([])
    const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [searchResults, setSearchResults] = useState<SearchResult | null>(null)
    const [searchError, setSearchError] = useState<string | null>(null)

    // Use refs to prevent infinite loops
    const hasSearchedRef = useRef(false)
    const currentQueryRef = useRef("")

    // Load search history from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('searchHistory')
        if (saved) {
            setSearchHistory(JSON.parse(saved))
        }
    }, [])

    const addToHistory = useCallback((query: string) => {
        const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10)
        setSearchHistory(newHistory)
        localStorage.setItem('searchHistory', JSON.stringify(newHistory))
    }, [searchHistory])

    const performSearch = useCallback(async (query: string) => {
        if (!query.trim() || query === currentQueryRef.current) return

        currentQueryRef.current = query
        setIsSearching(true)
        setSearchError(null)
        setSearchResults(null)
        addToHistory(query.trim())

        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&network=${currentNetwork}`)

            if (response.ok) {
                const data = await response.json()
                setSearchResults(data)
            } else {
                const errorData = await response.json()
                setSearchError(errorData.error || 'Search failed')
            }
        } catch (error) {
            console.error("Search failed:", error)
            setSearchError('Search failed. Please try again.')
        } finally {
            setIsSearching(false)
        }
    }, [currentNetwork, addToHistory])

    // Auto-search when component mounts with initial query (only once)
    useEffect(() => {
        if (initialQuery.trim() && !hasSearchedRef.current) {
            hasSearchedRef.current = true
            performSearch(initialQuery)
        }
    }, [initialQuery, performSearch])

    // Generate search suggestions based on query
    useEffect(() => {
        if (searchQuery.trim().length > 2) {
            generateSuggestions(searchQuery)
            setShowSuggestions(true)
        } else {
            setSuggestions([])
            setShowSuggestions(false)
        }
    }, [searchQuery])

    const generateSuggestions = (query: string) => {
        const newSuggestions: SearchSuggestion[] = []

        // Block height suggestion
        if (/^\d+$/.test(query)) {
            newSuggestions.push({
                type: 'height',
                value: query,
                label: `Block Height ${query}`,
                description: `View block at height ${query}`,
                icon: Clock,
                color: 'text-green-600'
            })
        }

        // Hash-like suggestions
        if (/^[0-9a-fA-F]{8,64}$/i.test(query)) {
            if (query.length === 64) {
                newSuggestions.push({
                    type: 'block',
                    value: query,
                    label: 'Block Hash',
                    description: 'View block details',
                    icon: Hash,
                    color: 'text-blue-600'
                })
                newSuggestions.push({
                    type: 'transaction',
                    value: query,
                    label: 'Transaction ID',
                    description: 'View transaction details',
                    icon: FileText,
                    color: 'text-purple-600'
                })
            } else {
                newSuggestions.push({
                    type: 'block',
                    value: query,
                    label: 'Partial Hash',
                    description: 'Complete the hash to search',
                    icon: Hash,
                    color: 'text-blue-600'
                })
            }
        }

        // Address suggestions
        if (/^[fFmn2][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{8,61}$/i.test(query)) {
            newSuggestions.push({
                type: 'address',
                value: query,
                label: 'FairCoin Address',
                description: 'View address details and transactions',
                icon: Wallet,
                color: 'text-orange-600'
            })
        }

        setSuggestions(newSuggestions)
    }

    const clearHistory = useCallback(() => {
        setSearchHistory([])
        localStorage.removeItem('searchHistory')
    }, [])

    const handleSearch = useCallback(async (query: string) => {
        if (!query.trim()) return
        await performSearch(query)
    }, [performSearch])

    const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch(searchQuery)
        }
    }, [handleSearch, searchQuery])

    const handleSuggestionClick = useCallback((suggestion: SearchSuggestion) => {
        setSearchQuery(suggestion.value)
        setShowSuggestions(false)
        performSearch(suggestion.value)
    }, [performSearch])

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            console.log('Copied to clipboard:', text)
        }).catch(err => {
            console.error('Failed to copy text: ', err)
        })
    }

    const renderSearchResults = () => {
        if (!searchResults) return null

        const { type, results, query } = searchResults

        // Handle no results or empty results
        if (!results || (type === 'not_found') ||
            (type === 'block_height' && !results.height) ||
            (type === 'block_hash' && !results.hash) ||
            (type === 'transaction' && !results.txid) ||
            (type === 'address' && !results.address)) {

            return (
                <Card className="border-2 border-muted bg-background">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-foreground">
                            <AlertCircle className="h-5 w-5 text-foreground" />
                            No Results Found
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-center py-6">
                            <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                                <Search className="h-8 w-8 text-muted-primary" />
                            </div>
                            <h3 className="text-lg font-medium text-foreground mb-2">
                                No results found for &quot;{query}&quot;
                            </h3>
                            <p className="text-muted-foreground mb-4">
                                We couldn&apos;t find any blocks, transactions, or addresses matching your search.
                            </p>
                        </div>

                        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                            <h4 className="font-medium text-foreground mb-2">Search Tips:</h4>
                            <ul className="text-sm text-foreground space-y-1">
                                <li>• <strong>Block Height:</strong> Enter a number (e.g., 680000)</li>
                                <li>• <strong>Block Hash:</strong> Enter the full 64-character hash</li>
                                <li>• <strong>Transaction ID:</strong> Enter the full 64-character hash</li>
                                <li>• <strong>Address:</strong> Enter a valid FairCoin address</li>
                                <li>• <strong>Network:</strong> Make sure you&apos;re searching on the correct network ({currentNetwork.toUpperCase()})</li>
                            </ul>
                        </div>

                        <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
                            <h4 className="font-medium text-foreground mb-2">Common Issues:</h4>
                            <ul className="text-sm text-foreground space-y-1">
                                <li>• The item might not exist on the {currentNetwork.toUpperCase()} network</li>
                                <li>• You might have a typo in your search query</li>
                                <li>• The blockchain might still be syncing</li>
                                <li>• Try searching for a different term</li>
                            </ul>
                        </div>

                        <div className="flex gap-2 justify-center">
                            <Button
                                variant="outline"
                                onClick={() => setSearchQuery('')}
                            >
                                <Search className="h-4 w-4 mr-2" />
                                Try Another Search
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => router.push('/blocks')}
                            >
                                <Hash className="h-4 w-4 mr-2" />
                                Browse Recent Blocks
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )
        }

        switch (type) {
            case 'block_height':
            case 'block_hash':
                return (
                    <Card className="border-2 border-primary/30 bg-primary/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-primary">
                                <Hash className="h-5 w-5" />
                                Block Found
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <h4 className="font-semibold text-sm text-primary mb-1">Block Height</h4>
                                    <p className="text-lg font-mono text-foreground">{results.height || 'N/A'}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm text-primary mb-1">Block Hash</h4>
                                    <p className="text-sm font-mono break-all text-foreground">{results.hash || query}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm text-primary mb-1">Timestamp</h4>
                                    <p className="text-sm text-foreground">
                                        {results.time ? new Date(results.time * 1000).toLocaleString() : 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm text-primary mb-1">Transactions</h4>
                                    <p className="text-sm text-foreground">{results.nTx || results.tx?.length || 0} transactions</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm text-primary mb-1">Size</h4>
                                    <p className="text-sm text-foreground">{results.size ? `${results.size} bytes` : 'N/A'}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm text-primary mb-1">Difficulty</h4>
                                    <p className="text-sm text-foreground">{results.difficulty ? results.difficulty.toFixed(2) : 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => router.push(`/block/${results.hash || query}?network=${currentNetwork}`)}
                                    className="bg-primary hover:bg-primary/90"
                                >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Full Block
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => copyToClipboard(results.hash || query)}
                                >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy Hash
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )

            case 'transaction':
                return (
                    <Card className="border-2 border-accent/30 bg-accent/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-accent-foreground">
                                <FileText className="h-5 w-5" />
                                Transaction Found
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <h4 className="font-semibold text-sm text-accent-foreground mb-1">Transaction ID</h4>
                                    <p className="text-sm font-mono break-all text-foreground">{results.txid || query}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm text-accent-foreground mb-1">Block Height</h4>
                                    <p className="text-sm text-foreground">{results.height || 'N/A'}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm text-accent-foreground mb-1">Confirmations</h4>
                                    <p className="text-sm text-foreground">{results.confirmations || 'N/A'}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm text-accent-foreground mb-1">Size</h4>
                                    <p className="text-sm text-foreground">{results.size ? `${results.size} bytes` : 'N/A'}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm text-accent-foreground mb-1">Inputs</h4>
                                    <p className="text-sm text-foreground">{results.vin?.length || 0} inputs</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm text-accent-foreground mb-1">Outputs</h4>
                                    <p className="text-sm text-foreground">{results.vout?.length || 0} outputs</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => router.push(`/tx/${results.txid || query}?network=${currentNetwork}`)}
                                    className="bg-accent hover:bg-accent/90"
                                >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Full Transaction
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => copyToClipboard(results.txid || query)}
                                >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy TXID
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )

            case 'address':
                return (
                    <Card className="border-2 border-primary/30 bg-primary/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-primary">
                                <Wallet className="h-5 w-5" />
                                Address Found
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <h4 className="font-semibold text-sm text-primary mb-1">Address</h4>
                                    <p className="text-sm font-mono break-all text-foreground">{results.address || query}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm text-primary mb-1">Balance</h4>
                                    <p className="text-sm text-foreground">{results.balance !== undefined ? `${results.balance} FAIR` : 'N/A'}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm text-primary mb-1">Total Received</h4>
                                    <p className="text-sm text-foreground">{results.totalReceived !== undefined ? `${results.totalReceived} FAIR` : 'N/A'}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm text-primary mb-1">Total Sent</h4>
                                    <p className="text-sm text-foreground">{results.totalSent !== undefined ? `${results.totalSent} FAIR` : 'N/A'}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm text-primary mb-1">Transaction Count</h4>
                                    <p className="text-sm text-foreground">{results.txCount || 0} transactions</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm text-primary mb-1">Network</h4>
                                    <p className="text-sm text-foreground">{results.network?.toUpperCase() || currentNetwork.toUpperCase()}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => router.push(`/address/${results.address || query}?network=${currentNetwork}`)}
                                    className="bg-primary hover:bg-primary/90"
                                >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Full Address
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => copyToClipboard(results.address || query)}
                                >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy Address
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )

            case 'partial_hash':
                return (
                    <Card className="border-2 border-accent/30 bg-accent/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-accent-foreground">
                                <AlertCircle className="h-5 w-5" />
                                Partial Hash Detected
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-foreground mb-4">
                                You&apos;ve entered a partial hash. Please complete the 64-character hash for accurate results.
                            </p>
                            <div className="bg-accent/20 p-3 rounded">
                                <p className="text-sm font-mono text-foreground">{query}</p>
                                <p className="text-xs text-accent-foreground mt-1">
                                    Length: {results.length || query.length}/64 characters
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )

            default:
                return (
                    <Card className="border-2 border-muted bg-background">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-foreground">
                                <Info className="h-5 w-5" />
                                Search Results
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <p className="text-sm text-foreground">
                                    <strong>Query:</strong> {query}
                                </p>
                                <p className="text-sm text-foreground">
                                    <strong>Type:</strong> {type}
                                </p>
                                <p className="text-sm text-foreground">
                                    <strong>Network:</strong> {currentNetwork.toUpperCase()}
                                </p>
                            </div>
                            <details className="mt-4">
                                <summary className="cursor-pointer text-sm font-medium text-foreground">
                                    Raw Results
                                </summary>
                                <pre className="text-xs overflow-auto bg-muted p-4 rounded mt-2 text-foreground">
                                    {JSON.stringify(searchResults, null, 2)}
                                </pre>
                            </details>
                        </CardContent>
                    </Card>
                )
        }
    }

    const searchExamples = [
        {
            icon: Hash,
            title: t('blockHash'),
            description: t('blockHashDescription'),
            example: "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
            color: "text-primary"
        },
        {
            icon: Clock,
            title: t('blockHeight'),
            description: t('blockHeightDescription'),
            example: "680000",
            color: "text-primary"
        },
        {
            icon: FileText,
            title: t('transactionId'),
            description: t('transactionIdDescription'),
            example: "f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16",
            color: "text-primary"
        },
        {
            icon: Wallet,
            title: t('address'),
            description: t('addressDescription'),
            example: "f1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0",
            color: "text-primary"
        }
    ]

    const quickActions = [
        {
            title: t('latestBlocks'),
            description: t('viewRecentBlocks'),
            action: () => router.push('/blocks'),
            icon: Hash
        },
        {
            title: t('networkStats'),
            description: t('viewNetworkStats'),
            action: () => router.push('/stats'),
            icon: TrendingUp
        },
        {
            title: t('masternodes'),
            description: t('viewMasternodesInfo'),
            action: () => router.push('/masternodes'),
            icon: Wallet
        }
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Search className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                            {t('title')}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Search the FairCoin blockchain for blocks, transactions, and addresses
                        </p>
                    </div>
                </div>
                <Badge variant="outline" className="text-sm">
                    {currentNetwork.toUpperCase()}
                </Badge>
            </div>

            {/* Search Input */}
            <Card className="border-2 border-primary/20 shadow-lg">
                <CardContent className="pt-6">
                    <div className="relative">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Enter block height, hash, transaction ID, or address..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    onFocus={() => setShowSuggestions(true)}
                                    className="pl-10 pr-4 py-3 text-lg border-0 focus:ring-2 focus:ring-primary/20"
                                />
                                {searchQuery && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                            <Button
                                onClick={() => handleSearch(searchQuery)}
                                disabled={isSearching || !searchQuery.trim()}
                                size="lg"
                                className="px-8"
                            >
                                {isSearching ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Searching...
                                    </>
                                ) : (
                                    <>
                                        <Search className="h-4 w-4 mr-2" />
                                        Search
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Search Suggestions */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                                {suggestions.map((suggestion, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b border-border last:border-b-0"
                                        onClick={() => handleSuggestionClick(suggestion)}
                                    >
                                        <suggestion.icon className={`h-5 w-5 ${suggestion.color}`} />
                                        <div className="flex-1">
                                            <div className="font-medium">{suggestion.label}</div>
                                            <div className="text-sm text-muted-foreground">{suggestion.description}</div>
                                        </div>
                                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Search Results */}
            {isSearching && (
                <Card className="border-2 border-primary/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-center gap-3 py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <span className="text-lg font-medium">Searching...</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {searchError && (
                <Card className="border-2 border-destructive/20 bg-destructive/5">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3 text-destructive">
                            <AlertCircle className="h-5 w-5" />
                            <div>
                                <p className="font-medium">Search Error</p>
                                <p className="text-sm">{searchError}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {searchResults && renderSearchResults()}

            {/* Tabs for different sections */}
            <Tabs defaultValue="examples" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="examples">Search Examples</TabsTrigger>
                    <TabsTrigger value="history">Recent Searches</TabsTrigger>
                    <TabsTrigger value="actions">Quick Actions</TabsTrigger>
                </TabsList>

                <TabsContent value="examples" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        {searchExamples.map((example, index) => (
                            <Card key={index} className="hover:shadow-md transition-all duration-200 cursor-pointer group border-2 border-transparent hover:border-primary/20" onClick={() => setSearchQuery(example.example)}>
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10">
                                            <example.icon className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{example.title}</h3>
                                            <p className="text-xs text-muted-foreground mt-1">{example.description}</p>
                                            <div className="mt-2 p-2 bg-muted rounded text-xs font-mono break-all group-hover:bg-primary/5 transition-colors">
                                                {example.example}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                    {searchHistory.length > 0 ? (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Recent Searches</h3>
                                <Button variant="outline" size="sm" onClick={clearHistory}>
                                    Clear History
                                </Button>
                            </div>
                            <div className="grid gap-2">
                                {searchHistory.map((query, index) => (
                                    <Card key={index} className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => setSearchQuery(query)}>
                                        <CardContent className="py-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <History className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-mono text-sm">{query}</span>
                                                </div>
                                                <Button variant="ghost" size="sm" onClick={(e) => {
                                                    e.stopPropagation()
                                                    performSearch(query)
                                                }}>
                                                    <Search className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No recent searches</p>
                            <p className="text-sm">Your search history will appear here</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="actions" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        {quickActions.map((action, index) => (
                            <Card key={index} className="hover:shadow-md transition-all duration-200 cursor-pointer group border-2 border-transparent hover:border-primary/20" onClick={action.action}>
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                            <action.icon className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{action.title}</h3>
                                            <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Search Tips */}
            <Card className="bg-muted/30 border-dashed">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Info className="h-5 w-5 text-primary" />
                        Search Tips
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 text-sm">
                        <div>
                            <h4 className="font-semibold mb-2 text-primary">Format Recognition</h4>
                            <ul className="space-y-1 text-muted-foreground">
                                <li>• <strong>Numbers:</strong> Block heights (e.g., 680000)</li>
                                <li>• <strong>64 characters:</strong> Block hashes or transaction IDs</li>
                                <li>• <strong>Addresses:</strong> FairCoin addresses starting with f, m, n, or 2</li>
                                <li>• <strong>Case insensitive:</strong> All searches are case-insensitive</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2 text-primary">Network Awareness</h4>
                            <ul className="space-y-1 text-muted-foreground">
                                <li>• <strong>Current network:</strong> {currentNetwork.toUpperCase()}</li>
                                <li>• <strong>Switch networks:</strong> Use the network selector</li>
                                <li>• <strong>Separate indices:</strong> Each network has its own data</li>
                                <li>• <strong>Quick access:</strong> Use the sidebar for navigation</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
