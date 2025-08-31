import { blockCache } from '@/lib/cache';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HeroSearch } from '@/components/site/hero-search';
import { NetworkStatus } from '@/components/network-status';
import { BlocksTable } from '@/components/ui/blocks-table';
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
    <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">FairCoin Explorer</h1>
          <p className="text-sm text-muted-foreground mt-1 hidden sm:block">Explore the FairCoin blockchain</p>
        </div>
        <div className="flex items-center space-x-2">
          <NetworkStatus />
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
            <Activity className="w-3 h-3 mr-1" />
            <span className="hidden sm:inline">Live</span>
          </Badge>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="flex flex-wrap gap-2 sm:gap-3">
        <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
          <Link href="/blocks">
            <Blocks className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">View All Blocks</span>
            <span className="sm:hidden">Blocks</span>
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
          <Link href="/mempool">
            <Activity className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Mempool</span>
            <span className="sm:hidden">Mempool</span>
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
          <Link href="/network-status">
            <TrendingUp className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Network Status</span>
            <span className="sm:hidden">Network</span>
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
          <Link href="/tools">
            <Hash className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Tools</span>
            <span className="sm:hidden">Tools</span>
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
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
            <p className="text-xs text-muted-foreground">FairCoin blockchain</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1">
          <TabsTrigger value="overview" className="flex items-center gap-2 py-2 px-3 text-xs sm:text-sm">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
            <span className="sm:hidden">Home</span>
          </TabsTrigger>
          <TabsTrigger value="blocks" className="flex items-center gap-2 py-2 px-3 text-xs sm:text-sm">
            <Blocks className="h-4 w-4" />
            <span className="hidden sm:inline">Blocks</span>
            <span className="sm:hidden">Blocks</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2 py-2 px-3 text-xs sm:text-sm">
            <Hash className="h-4 w-4" />
            <span className="hidden sm:inline">Transactions</span>
            <span className="sm:hidden">TXs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
            {/* Recent Blocks */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Blocks className="h-5 w-5 text-primary" />
                <h3 className="text-lg sm:text-xl font-semibold">Recent Blocks</h3>
              </div>

              <BlocksTable blocks={blocks.slice(0, 5)} currentPage={1} totalPages={1} loading={false} />
            </div>

            {/* Latest Transactions */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Activity className="h-5 w-5 text-primary" />
                <h3 className="text-lg sm:text-xl font-semibold">Latest Transactions</h3>
              </div>

              <div className="space-y-2 sm:space-y-3">
                {txFeed.slice(0, 5).map((txid: string) => (
                  <Card key={txid} className="hover:shadow-md transition-shadow border-l-4 border-l-primary/20">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Hash className="w-3 h-3 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/tx/${txid}`}
                              className="font-mono text-sm hover:underline text-primary font-medium truncate block"
                            >
                              <span className="hidden sm:inline">{txid.slice(0, 20)}...</span>
                              <span className="sm:hidden">{txid.slice(0, 12)}...</span>
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              Block #{latest?.height ?? '-'}
                            </p>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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

            <BlocksTable blocks={blocks} currentPage={1} totalPages={1} loading={false} />
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
                <p className="text-lg font-medium text-muted-foreground mb-2">No transactions available</p>
                <p className="text-sm text-muted-foreground">The latest block doesn&apos;t contain any transactions yet.</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {txFeed.map((txid: string, index: number) => (
                  <Card key={txid} className="hover:shadow-md transition-shadow border-l-4 border-l-primary/20">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Hash className="w-3 h-3 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/tx/${txid}`}
                              className="font-mono text-sm hover:underline text-primary font-medium truncate block"
                            >
                              <span className="hidden lg:inline">{txid.slice(0, 32)}...</span>
                              <span className="hidden md:inline lg:hidden">{txid.slice(0, 24)}...</span>
                              <span className="hidden sm:inline md:hidden">{txid.slice(0, 16)}...</span>
                              <span className="sm:hidden">{txid.slice(0, 12)}...</span>
                            </Link>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Blocks className="h-3 w-3" />
                              Block #{latest?.height ?? '-'}
                            </p>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <Button variant="ghost" size="sm" className="hover:bg-primary/10 hover:text-primary transition-colors">
                            <span className="hidden sm:inline">View Details</span>
                            <span className="sm:hidden">View</span>
                            <ArrowUpRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
