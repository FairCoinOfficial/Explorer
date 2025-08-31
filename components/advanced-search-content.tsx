"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useNetwork } from "@/contexts/network-context"
import { Search, Hash, Clock, Wallet, FileText, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export function AdvancedSearchContent() {
    const { currentNetwork } = useNetwork()
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState("")
    const [isSearching, setIsSearching] = useState(false)

    const handleSearch = async (query: string) => {
        if (!query.trim()) return

        setIsSearching(true)

        // Add network parameter to search
        const searchUrl = `/search?q=${encodeURIComponent(query.trim())}&network=${currentNetwork}`

        try {
            // Use the search API route which will redirect appropriately
            window.location.href = searchUrl
        } catch (error) {
            console.error("Search failed:", error)
        } finally {
            setIsSearching(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch(searchQuery)
        }
    }

    const searchExamples = [
        {
            icon: Hash,
            title: "Block Hash",
            description: "Search by 64-character hexadecimal block hash",
            example: "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
            color: "text-blue-600"
        },
        {
            icon: Clock,
            title: "Block Height",
            description: "Search by numeric block height",
            example: "680000",
            color: "text-green-600"
        },
        {
            icon: FileText,
            title: "Transaction ID",
            description: "Search by 64-character transaction hash",
            example: "f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16",
            color: "text-purple-600"
        },
        {
            icon: Wallet,
            title: "Address",
            description: "Search by FairCoin address",
            example: "f1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0",
            color: "text-orange-600"
        }
    ]

    const quickActions = [
        {
            title: "Latest Blocks",
            description: "View recent blocks",
            action: () => router.push('/blocks'),
            icon: Hash
        },
        {
            title: "Network Stats",
            description: "View network statistics",
            action: () => router.push('/stats'),
            icon: TrendingUp
        },
        {
            title: "Masternodes",
            description: "View masternode information",
            action: () => router.push('/masternodes'),
            icon: Wallet
        }
    ]

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                <h1 className="text-2xl font-bold">Advanced Search</h1>
                <Badge variant="outline">{currentNetwork.toUpperCase()}</Badge>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Search the FairCoin Blockchain</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            type="text"
                            placeholder="Enter block hash, height, transaction ID, or address..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="font-mono text-sm"
                        />
                        <Button
                            onClick={() => handleSearch(searchQuery)}
                            disabled={!searchQuery.trim() || isSearching}
                            className="shrink-0"
                        >
                            {isSearching ? "Searching..." : "Search"}
                        </Button>
                    </div>

                    <div className="text-sm text-muted-foreground">
                        <p>Search supports:</p>
                        <ul className="mt-1 ml-4 space-y-1">
                            <li>• Block heights (numbers like 680000)</li>
                            <li>• Block hashes (64-character hex strings)</li>
                            <li>• Transaction IDs (64-character hex strings)</li>
                            <li>• FairCoin addresses (starting with f, F, m, n, or 2)</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
                {searchExamples.map((example, index) => (
                    <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <example.icon className={`h-4 w-4 ${example.color}`} />
                                {example.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-2">{example.description}</p>
                            <div className="bg-muted p-2 rounded-md">
                                <code className="text-xs break-all">{example.example}</code>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 md:grid-cols-3">
                        {quickActions.map((action, index) => (
                            <Button
                                key={index}
                                variant="outline"
                                className="h-auto p-4 flex flex-col items-start gap-2"
                                onClick={action.action}
                            >
                                <div className="flex items-center gap-2 w-full">
                                    <action.icon className="h-4 w-4" />
                                    <span className="font-medium">{action.title}</span>
                                </div>
                                <span className="text-xs text-muted-foreground text-left">
                                    {action.description}
                                </span>
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Search Tips</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <h4 className="font-semibold mb-2">Format Recognition</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• Numbers: Treated as block heights</li>
                                <li>• 64-char hex: Block hash or transaction ID</li>
                                <li>• Addresses: Automatically detected by prefix</li>
                                <li>• Case insensitive for hex values</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">Network Awareness</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• Searches are network-specific</li>
                                <li>• Switch networks for different data</li>
                                <li>• Address validation includes network check</li>
                                <li>• Testnet and mainnet have separate indices</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
