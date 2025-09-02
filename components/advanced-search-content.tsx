"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from 'next-intl'
import { useNetwork } from "@/contexts/network-context"
import { Search, Hash, Clock, Wallet, FileText, TrendingUp, History, X, ExternalLink, AlertCircle, CheckCircle, Info } from "lucide-react"
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

    // Load search history from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('searchHistory')
        if (saved) {
            setSearchHistory(JSON.parse(saved))
        }
    }, [])

    // Auto-search when component mounts with initial query
    useEffect(() => {
        if (initialQuery.trim()) {
            performSearch(initialQuery)
        }
    }, [initialQuery])

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
        if (/^[0-9a-fA-F]{8,64}$/.test(query)) {
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
        if (/^[fFmn2][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{8,61}$/.test(query)) {
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

    const addToHistory = (query: string) => {
        const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10)
        setSearchHistory(newHistory)
        localStorage.setItem('searchHistory', JSON.stringify(newHistory))
    }

    const clearHistory = () => {
        setSearchHistory([])
        localStorage.removeItem('searchHistory')
    }

    const performSearch = async (query: string) => {
        if (!query.trim()) return

        setIsSearching(true)
        addToHistory(query.trim())

        try {
            // Use the search API which will redirect appropriately
            const searchUrl = `/search?q=${encodeURIComponent(query.trim())}&network=${currentNetwork}`
            router.push(searchUrl)
        } catch (error) {
            console.error("Search failed:", error)
        } finally {
            setIsSearching(false)
        }
    }

    const handleSearch = async (query: string) => {
        if (!query.trim()) return
        await performSearch(query)
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch(searchQuery)
        }
    }

    const handleSuggestionClick = (suggestion: SearchSuggestion) => {
        setSearchQuery(suggestion.value)
        setShowSuggestions(false)
        performSearch(suggestion.value)
    }

    const searchExamples = [
        {
            icon: Hash,
            title: t('blockHash'),
            description: t('blockHashDescription'),
            example: "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
            color: "text-blue-600"
        },
        {
            icon: Clock,
            title: t('blockHeight'),
            description: t('blockHeightDescription'),
            example: "680000",
            color: "text-green-600"
        },
        {
            icon: FileText,
            title: t('transactionId'),
            description: t('transactionIdDescription'),
            example: "f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16",
            color: "text-purple-600"
        },
        {
            icon: Wallet,
            title: t('address'),
            description: t('addressDescription'),
            example: "f1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0",
            color: "text-orange-600"
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
                                        <div className={`p-2 rounded-lg ${example.color.replace('text-', 'bg-')}/10`}>
                                            <example.icon className={`h-5 w-5 ${example.color}`} />
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
