import { getCachedBlockCount, getCachedBlocks } from '@/lib/cached-rpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HeroSearch } from '@/components/site/hero-search';
import { NetworkStatus } from '@/components/network-status';
import { Activity, Blocks, TrendingUp, Clock, Hash, Users, ArrowUpRight } from 'lucide-react';

async function getLatestBlocks(limit = 10) {
  const height = await getCachedBlockCount();
  const blocks = await getCachedBlocks(limit, 0);
  return { height, blocks };
}

export default async function Page() {
  const { height, blocks } = await getLatestBlocks(10);

  // transactions feed: take tx ids from the latest block (if available)
  const latest = blocks[0] ?? null;
  const txFeed = latest?.tx?.slice(0, 12) ?? [];

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">FairCoin Explorer</h2>
        <div className="flex items-center space-x-2">
          <NetworkStatus />
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            <Activity className="w-3 h-3 mr-1" />
            Live
          </Badge>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <HeroSearch />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            <div className="text-2xl font-bold">
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Recent Blocks</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
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
                          <a href={`/block/${block.height}`} className="hover:underline">
                            {block.height}
                          </a>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          <a href={`/block/${block.hash}`} className="hover:underline">
                            {block.hash.slice(0, 16)}...
                          </a>
                        </TableCell>
                        <TableCell>{new Date(block.time * 1000).toLocaleTimeString()}</TableCell>
                        <TableCell className="text-right">{block.tx.length}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Latest Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {txFeed.slice(0, 5).map((txid: string) => (
                    <div key={txid} className="flex items-center">
                      <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          <a href={`/tx/${txid}`} className="hover:underline font-mono">
                            {txid.slice(0, 16)}...
                          </a>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Block #{latest?.height ?? '-'}
                        </p>
                      </div>
                      <div className="ml-auto font-medium">
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
              <div className="rounded-md border">
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
                          <a href={`/block/${block.height}`} className="hover:underline">
                            {block.height}
                          </a>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          <a href={`/block/${block.hash}`} className="hover:underline">
                            {block.hash}
                          </a>
                        </TableCell>
                        <TableCell>{new Date(block.time * 1000).toLocaleString()}</TableCell>
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
                    <div key={txid} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Hash className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium font-mono">
                            <a href={`/tx/${txid}`} className="hover:underline">
                              {txid}
                            </a>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Block #{latest?.height ?? '-'}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        View Details
                      </Button>
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
