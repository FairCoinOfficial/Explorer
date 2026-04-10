import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NetworkStatus } from '@/components/network-status'
import { BlocksTable } from '@/components/ui/blocks-table'
import { Activity, Blocks, TrendingUp, Clock, Hash, ArrowUpRight } from 'lucide-react'
import { useNetwork } from '@/contexts/network-context'

interface Block {
  height: number
  hash: string
  time: number
  nTx: number
  size: number
  tx: string[]
}

export default function HomePage() {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [height, setHeight] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const { currentNetwork } = useNetwork()

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`/api/blocks?network=${currentNetwork}&limit=10`)
      if (response.ok) {
        const data = await response.json()
        setBlocks(data.blocks || [])
        setHeight(data.height || null)
      }
    } catch (err) {
      // silently fail on home page
    } finally {
      setLoading(false)
    }
  }, [currentNetwork])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30_000)
    return () => clearInterval(interval)
  }, [fetchData])

  const latest = blocks[0] ?? null
  const txFeed = latest?.tx?.slice(0, 12) ?? []

  return (
    <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">FairCoin Explorer</h1>
          <p className="text-sm text-muted-foreground mt-1 hidden sm:block">Explore the FairCoin blockchain in real-time</p>
        </div>
        <div className="flex items-center space-x-2">
          <NetworkStatus />
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
            <Activity className="w-3 h-3 mr-1" />
            <span className="hidden sm:inline">Live</span>
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-3">
        <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
          <Link to="/blocks"><Blocks className="h-4 w-4 mr-2" />Blocks</Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
          <Link to="/mempool"><Activity className="h-4 w-4 mr-2" />Mempool</Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
          <Link to="/network-status"><TrendingUp className="h-4 w-4 mr-2" />Network</Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
          <Link to="/search"><Hash className="h-4 w-4 mr-2" />Search</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Height</CardTitle>
            <Blocks className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl sm:text-2xl font-bold">{height?.toLocaleString() ?? '-'}</div>
            <p className="text-xs text-muted-foreground">Latest block height</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latest Block</CardTitle>
            <Hash className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl sm:text-2xl font-bold">{blocks[0]?.height ?? '-'}</div>
            <p className="text-xs text-muted-foreground">{blocks[0]?.tx?.length ?? 0} transactions</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Block Time</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg sm:text-xl font-bold">
              {blocks[0] ? new Date(blocks[0].time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {blocks[0] ? new Date(blocks[0].time * 1000).toLocaleDateString() : 'No data'}
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg sm:text-xl font-bold">Mainnet</div>
            <p className="text-xs text-muted-foreground">FairCoin Blockchain</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1">
          <TabsTrigger value="overview" className="flex items-center gap-2 py-2 px-3 text-xs sm:text-sm">
            <Activity className="h-4 w-4" /><span className="hidden sm:inline">Overview</span><span className="sm:hidden">Home</span>
          </TabsTrigger>
          <TabsTrigger value="blocks" className="flex items-center gap-2 py-2 px-3 text-xs sm:text-sm">
            <Blocks className="h-4 w-4" /><span>Blocks</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2 py-2 px-3 text-xs sm:text-sm">
            <Hash className="h-4 w-4" /><span className="hidden sm:inline">Transactions</span><span className="sm:hidden">TXs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Blocks className="h-5 w-5 text-primary" />
                <h3 className="text-lg sm:text-xl font-semibold">Recent Blocks</h3>
              </div>
              <BlocksTable blocks={blocks.slice(0, 5)} currentPage={1} totalPages={1} loading={loading} />
            </div>
            <div className="lg:col-span-3 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Activity className="h-5 w-5 text-primary" />
                <h3 className="text-lg sm:text-xl font-semibold">Latest Transactions</h3>
              </div>
              <div className="rounded-md border overflow-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold whitespace-nowrap h-8 px-2">Transaction ID</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap h-8 px-2">Block</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {txFeed.slice(0, 5).map((txid: string, index: number) => (
                      <TableRow key={txid} className={`group hover:bg-muted/50 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}>
                        <TableCell className="font-mono text-sm py-2 px-2">
                          <Link to={`/tx/${txid}`} className="hover:underline text-primary font-medium">{txid.slice(0, 16)}...</Link>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground py-2 px-2">#{latest?.height ?? '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="blocks" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Blocks className="h-5 w-5 text-primary" />
              <h3 className="text-lg sm:text-xl font-semibold">All Recent Blocks</h3>
            </div>
            <BlocksTable blocks={blocks} currentPage={1} totalPages={1} loading={loading} />
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Activity className="h-5 w-5 text-primary" />
              <h3 className="text-lg sm:text-xl font-semibold">Latest Block Transactions</h3>
            </div>
            {txFeed.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium text-muted-foreground mb-2">No Transactions Available</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold whitespace-nowrap h-8 px-2">Transaction ID</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap h-8 px-2">Block</TableHead>
                      <TableHead className="font-semibold whitespace-nowrap h-8 px-2">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {txFeed.map((txid: string, index: number) => (
                      <TableRow key={txid} className={`group hover:bg-muted/50 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}>
                        <TableCell className="font-mono text-sm py-2 px-2">
                          <Link to={`/tx/${txid}`} className="hover:underline text-primary font-medium">{txid.slice(0, 16)}...</Link>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground py-2 px-2">#{latest?.height ?? '-'}</TableCell>
                        <TableCell className="py-2 px-2">
                          <Button asChild variant="ghost" size="sm" className="hover:bg-primary/10 hover:text-primary transition-colors">
                            <Link to={`/tx/${txid}`}>View<ArrowUpRight className="h-3 w-3 ml-1" /></Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
