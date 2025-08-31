import { blockCache } from '@/lib/cache';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HeroSearch } from '@/components/site/hero-search';
import { NetworkStatus } from '@/components/network-status';
import { Activity, Blocks, TrendingUp, Clock, Hash, Users, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

async function getLatestBlocks(limit = 10) {
  const height = await blockCache.getBlockCount('mainnet');
  const blocks = await blockCache.getRecentBlocks('mainnet', limit);
  return { height, blocks };
}

export default async function Page() {
  const { height, blocks } = await getLatestBlocks(10);

  // transactions feed: take tx ids from the latest block (if available)
  const latest = blocks[0] ?? null;
  const txFeed = latest?.tx?.slice(0, 12) ?? [];

  return (
    <div className="flex-1 space-y-4 p-3 pt-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">FairCoin Explorer</h2>
        <div className="flex items-center space-x-2">
          <NetworkStatus />
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            <Activity className="w-3 h-3 mr-1" />
            Live
          </Badge>
        </div>
      </div>

      {/* Search */}
      <div className="w-full max-w-md">
        <HeroSearch />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Height</CardTitle>
            <Blocks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{height?.toLocaleString() ?? '-'}</div>
            <p className="text-xs text-muted-foreground">Latest block height</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latest Block</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{blocks[0]?.height ?? '-'}</div>
            <p className="text-xs text-muted-foreground">{blocks[0]?.tx?.length ?? 0} transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Block Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold sm:text-2xl">
              {blocks[0] ? new Date(blocks[0].time * 1000).toLocaleTimeString() : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {blocks[0] ? new Date(blocks[0].time * 1000).toLocaleDateString() : 'No data'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Mainnet</div>
            <p className="text-xs text-muted-foreground">FairCoin blockchain</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="blocks">Blocks</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Recent Blocks</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Height</TableHead>
                        <TableHead>Hash</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead className="text-right">TX Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {blocks.slice(0, 5).map((block) => (
                        <TableRow key={block.hash}>
                          <TableCell className="font-medium">
                            <Link href={`/block/${block.height}`} className="hover:underline">
                              {block.height}
                            </Link>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            <Link href={`/block/${block.hash}`} className="hover:underline">
                              <span className="hidden sm:inline">{block.hash.slice(0, 16)}...</span>
                              <span className="sm:hidden">{block.hash.slice(0, 8)}...</span>
                            </Link>
                          </TableCell>
                          <TableCell className="text-sm">
                            <span className="hidden sm:inline">
                              {new Date(block.time * 1000).toLocaleTimeString()}
                            </span>
                            <span className="sm:hidden">
                              {new Date(block.time * 1000).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{block.tx.length}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Latest Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {txFeed.slice(0, 5).map((txid: string) => (
                    <div key={txid} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-none truncate">
                          <Link href={`/tx/${txid}`} className="hover:underline font-mono">
                            <span className="hidden sm:inline">{txid.slice(0, 16)}...</span>
                            <span className="sm:hidden">{txid.slice(0, 6)}...</span>
                          </Link>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Block #{latest?.height ?? '-'}
                        </p>
                      </div>
                      <div className="ml-2 flex-shrink-0">
                        <ArrowUpRight className="h-4 w-4" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="blocks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Recent Blocks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Height</TableHead>
                      <TableHead>Hash</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-right">TX Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blocks.map((block) => (
                      <TableRow key={block.hash}>
                        <TableCell className="font-medium">
                          <Link href={`/block/${block.height}`} className="hover:underline">
                            {block.height}
                          </Link>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          <Link href={`/block/${block.hash}`} className="hover:underline">
                            <span className="hidden sm:inline">{block.hash}</span>
                            <span className="sm:hidden">{block.hash.slice(0, 8)}...</span>
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
                        <TableCell className="text-right">{block.tx.length}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Latest Block Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {txFeed.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions available in the latest block.
                </div>
              ) : (
                <div className="space-y-4">
                  {txFeed.map((txid: string) => (
                    <div key={txid} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg gap-3">
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Hash className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium font-mono text-sm truncate">
                            <Link href={`/tx/${txid}`} className="hover:underline">
                              <span className="hidden sm:inline">{txid}</span>
                              <span className="sm:hidden">{txid.slice(0, 12)}...</span>
                            </Link>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Block #{latest?.height ?? '-'}
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <Button variant="ghost" size="sm" className="w-full sm:w-auto">
                          <span className="hidden sm:inline">View Details</span>
                          <span className="sm:hidden">View</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
