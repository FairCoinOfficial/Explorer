"use client"

import { useNetwork } from '@/contexts/network-context'
import { NetworkStatus } from '@/components/network-status'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CopyButton } from '@/components/copy-button'
import { Globe, Cpu, HardDrive, Zap, RefreshCw, Home, Info } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface NetworkInfo {
    version: string
    subversion: string
    protocolversion: number
    localservices: string
    localrelay: boolean
    timeoffset: number
    networkactive: boolean
    connections: number
    networks: {
        name: string
        limited: boolean
        reachable: boolean
        proxy: string
        proxy_randomize_credentials: boolean
    }[]
    relayfee: number
    incrementalfee: number
    localaddresses: {
        address: string
        port: number
        score: number
    }[]
    warnings: string
}

interface BlockchainInfo {
    chain: string
    blocks: number
    headers: number
    bestblockhash: string
    difficulty: number
    mediantime: number
    verificationprogress: number
    initialblockdownload: boolean
    chainwork: string
    size_on_disk: number
    pruned: boolean
    softforks: Record<string, any>
    bip9_softforks: Record<string, any>
}

interface PeerInfo {
    id: number
    addr: string
    addrlocal?: string
    services: string
    relaytxes: boolean
    lastsend: number
    lastrecv: number
    bytessent: number
    bytesrecv: number
    conntime: number
    timeoffset: number
    pingtime?: number
    version: number
    subver: string
    inbound: boolean
    addnode: boolean
    startingheight: number
    banscore: number
    synced_headers: number
    synced_blocks: number
}

export function NetworkContent() {
    const { currentNetwork } = useNetwork()
    const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null)
    const [blockchainInfo, setBlockchainInfo] = useState<BlockchainInfo | null>(null)
    const [peers, setPeers] = useState<PeerInfo[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchNetworkInfo = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch(`/api/network?network=${currentNetwork}`)
            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to fetch network information')
            }

            const data = await response.json()
            setNetworkInfo(data.networkInfo)
            setBlockchainInfo(data.blockchainInfo)
            setPeers(data.peers || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchNetworkInfo()
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchNetworkInfo, 30000)
        return () => clearInterval(interval)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentNetwork])

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
                        <p className="text-lg text-muted-foreground mb-4">Error loading network information</p>
                        <p className="text-sm text-destructive mb-4">{error}</p>
                        <Button onClick={fetchNetworkInfo} variant="outline">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Try Again
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    if (!networkInfo || !blockchainInfo) {
        return (
            <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
                <div className="flex items-center justify-center h-64">
                    <p className="text-lg text-muted-foreground">Network information not available</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
            {/* Header */}
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Network Information</h2>
                    <p className="text-muted-foreground">
                        Technical details about the FairCoin network
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <NetworkStatus />
                    <Button onClick={fetchNetworkInfo} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Network Status */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Node Version</CardTitle>
                        <Cpu className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{networkInfo.version}</div>
                        <p className="text-xs text-muted-foreground">{networkInfo.subversion}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Connections</CardTitle>
                        <Globe className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{networkInfo.connections}</div>
                        <p className="text-xs text-muted-foreground">Active peer connections</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sync Progress</CardTitle>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {(blockchainInfo.verificationprogress * 100).toFixed(2)}%
                        </div>
                        <p className="text-xs text-muted-foreground">Blockchain verification</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Chain Size</CardTitle>
                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {(blockchainInfo.size_on_disk / 1024 / 1024 / 1024).toFixed(1)} GB
                        </div>
                        <p className="text-xs text-muted-foreground">Blockchain size on disk</p>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Information */}
            <Tabs defaultValue="general" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
                    <TabsTrigger value="peers">Peers ({peers.length})</TabsTrigger>
                    <TabsTrigger value="networks">Networks</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Info className="h-5 w-5" />
                                Node Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Version</label>
                                    <p className="text-lg font-semibold">{networkInfo.version}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Protocol Version</label>
                                    <p className="text-lg font-semibold">{networkInfo.protocolversion}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Sub Version</label>
                                    <p className="text-sm font-mono">{networkInfo.subversion}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Local Services</label>
                                    <p className="text-sm font-mono">{networkInfo.localservices}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Time Offset</label>
                                    <p className="text-lg font-semibold">{networkInfo.timeoffset}s</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Network Active</label>
                                    <Badge variant={networkInfo.networkactive ? 'default' : 'secondary'}>
                                        {networkInfo.networkactive ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                            </div>

                            {networkInfo.warnings && (
                                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                        <strong>Warning:</strong> {networkInfo.warnings}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="blockchain" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <HardDrive className="h-5 w-5" />
                                Blockchain Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Chain</label>
                                    <p className="text-lg font-semibold">{blockchainInfo.chain}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Blocks</label>
                                    <p className="text-lg font-semibold">{blockchainInfo.blocks.toLocaleString()}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Headers</label>
                                    <p className="text-lg font-semibold">{blockchainInfo.headers.toLocaleString()}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Difficulty</label>
                                    <p className="text-lg font-semibold">{blockchainInfo.difficulty.toFixed(6)}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Median Time</label>
                                    <p className="text-sm">{new Date(blockchainInfo.mediantime * 1000).toLocaleString()}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Verification Progress</label>
                                    <p className="text-lg font-semibold">{(blockchainInfo.verificationprogress * 100).toFixed(4)}%</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Initial Block Download</label>
                                    <Badge variant={blockchainInfo.initialblockdownload ? 'secondary' : 'default'}>
                                        {blockchainInfo.initialblockdownload ? 'In Progress' : 'Complete'}
                                    </Badge>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Pruned</label>
                                    <Badge variant={blockchainInfo.pruned ? 'secondary' : 'default'}>
                                        {blockchainInfo.pruned ? 'Yes' : 'No'}
                                    </Badge>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Best Block Hash</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">
                                        {blockchainInfo.bestblockhash}
                                    </code>
                                    <CopyButton text={blockchainInfo.bestblockhash} />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Chain Work</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">
                                        {blockchainInfo.chainwork}
                                    </code>
                                    <CopyButton text={blockchainInfo.chainwork} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="peers" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Globe className="h-5 w-5" />
                                Connected Peers
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {peers.length > 0 ? (
                                <div className="space-y-4">
                                    {peers.slice(0, 10).map((peer) => (
                                        <div key={peer.id} className="border rounded-lg p-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                                                <div>
                                                    <label className="font-medium text-muted-foreground">Address</label>
                                                    <p className="font-mono">{peer.addr}</p>
                                                </div>
                                                <div>
                                                    <label className="font-medium text-muted-foreground">Version</label>
                                                    <p>{peer.version}</p>
                                                </div>
                                                <div>
                                                    <label className="font-medium text-muted-foreground">Connected</label>
                                                    <p>{Math.round((Date.now() / 1000 - peer.conntime) / 60)} min ago</p>
                                                </div>
                                                <div>
                                                    <label className="font-medium text-muted-foreground">Direction</label>
                                                    <Badge variant={peer.inbound ? 'secondary' : 'default'}>
                                                        {peer.inbound ? 'Inbound' : 'Outbound'}
                                                    </Badge>
                                                </div>
                                                <div>
                                                    <label className="font-medium text-muted-foreground">Bytes Sent</label>
                                                    <p>{(peer.bytessent / 1024).toFixed(1)} KB</p>
                                                </div>
                                                <div>
                                                    <label className="font-medium text-muted-foreground">Bytes Received</label>
                                                    <p>{(peer.bytesrecv / 1024).toFixed(1)} KB</p>
                                                </div>
                                                <div>
                                                    <label className="font-medium text-muted-foreground">Ping Time</label>
                                                    <p>{peer.pingtime ? `${peer.pingtime.toFixed(2)}ms` : 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <label className="font-medium text-muted-foreground">Ban Score</label>
                                                    <p>{peer.banscore}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {peers.length > 10 && (
                                        <p className="text-sm text-muted-foreground text-center">
                                            Showing 10 of {peers.length} connected peers
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <Globe className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-medium">No Peers Connected</h3>
                                    <p className="text-muted-foreground">
                                        The node is not currently connected to any peers.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="networks" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Globe className="h-5 w-5" />
                                Network Protocols
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {networkInfo.networks.map((network, index) => (
                                    <div key={index} className="border rounded-lg p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                            <div>
                                                <label className="text-sm font-medium text-muted-foreground">Name</label>
                                                <p className="text-lg font-semibold">{network.name}</p>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-muted-foreground">Reachable</label>
                                                <Badge variant={network.reachable ? 'default' : 'secondary'}>
                                                    {network.reachable ? 'Yes' : 'No'}
                                                </Badge>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-muted-foreground">Limited</label>
                                                <Badge variant={network.limited ? 'secondary' : 'default'}>
                                                    {network.limited ? 'Yes' : 'No'}
                                                </Badge>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-muted-foreground">Proxy</label>
                                                <p className="text-sm font-mono">{network.proxy || 'None'}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
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
