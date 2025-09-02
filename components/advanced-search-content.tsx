"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from 'next-intl'
import { useNetwork } from "@/contexts/network-context"
import { Search, Hash, Clock, Wallet, FileText, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface AdvancedSearchContentProps {
    initialQuery?: string
    initialNetwork?: string
}

export function AdvancedSearchContent({ initialQuery = "", initialNetwork = "mainnet" }: AdvancedSearchContentProps) {
    const t = useTranslations('search')
    const tCommon = useTranslations('common')
    const { currentNetwork } = useNetwork()
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState(initialQuery)
    const [isSearching, setIsSearching] = useState(false)
    const [searchResults, setSearchResults] = useState<any>(null)
    const [searchError, setSearchError] = useState<string | null>(null)

    // Auto-search when component mounts with initial query
    useEffect(() => {
        if (initialQuery.trim()) {
            performSearch(initialQuery)
        }
    }, [initialQuery])

    const performSearch = async (query: string) => {
        if (!query.trim()) return

        setIsSearching(true)
        setSearchError(null)
        setSearchResults(null)

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
            <div className="flex items-center gap-2">
                <Search className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">{t('title')}</h1>
            </div>

            {/* Search Input */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-2">
                        <Input
                            placeholder={t('searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="flex-1"
                        />
                        <Button
                            onClick={() => handleSearch(searchQuery)}
                            disabled={isSearching || !searchQuery.trim()}
                        >
                            {isSearching ? t('searching') : t('search')}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Search Results */}
            {isSearching && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            <span>{t('searching')}...</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {searchError && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-red-600">
                            <p className="font-medium">Search Error:</p>
                            <p>{searchError}</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {searchResults && (
                <Card>
                    <CardHeader>
                        <CardTitle>Search Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="text-sm overflow-auto">
                            {JSON.stringify(searchResults, null, 2)}
                        </pre>
                    </CardContent>
                </Card>
            )}

            {/* Search Examples */}
            <div className="grid gap-4 md:grid-cols-2">
                {searchExamples.map((example, index) => (
                    <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSearchQuery(example.example)}>
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                                <example.icon className={`h-5 w-5 ${example.color} mt-0.5`} />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-sm">{example.title}</h3>
                                    <p className="text-xs text-muted-foreground mt-1">{example.description}</p>
                                    <div className="mt-2 p-2 bg-muted rounded text-xs font-mono break-all">
                                        {example.example}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Separator />

            {/* Quick Actions */}
            <div>
                <h2 className="text-lg font-semibold mb-4">{t('quickActions')}</h2>
                <div className="grid gap-4 md:grid-cols-3">
                    {quickActions.map((action, index) => (
                        <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer" onClick={action.action}>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <action.icon className="h-5 w-5 text-primary" />
                                    <div>
                                        <h3 className="font-semibold text-sm">{action.title}</h3>
                                        <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}
