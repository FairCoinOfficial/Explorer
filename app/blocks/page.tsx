import { getCachedBlocks, getCachedBlockCount } from '@/lib/cached-rpc';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Database, Search, Home, Hash, Clock } from 'lucide-react';

async function getRecentBlocks() {
  try {
    const [height, blocks] = await Promise.all([
      getCachedBlockCount(),
      getCachedBlocks(20, 0)
    ]);
    return { height, blocks };
  } catch (error) {
    console.error('Failed to fetch blocks:', error);
    return { height: 0, blocks: [] };
  }
}

export default async function BlocksPage() {
  const { height, blocks } = await getRecentBlocks();

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Recent Blocks</h2>
          <p className="text-muted-foreground">
            Latest blocks on the FairCoin blockchain
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            <Database className="w-3 h-3 mr-1" />
            Current: {height?.toLocaleString() ?? 'N/A'}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Height</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{height?.toLocaleString() ?? 'N/A'}</div>
            <p className="text-xs text-muted-foreground">Latest block number</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Blocks</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{blocks.length}</div>
            <p className="text-xs text-muted-foreground">Showing latest blocks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Block</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {blocks[0] ? new Date(blocks[0].time * 1000).toLocaleTimeString() : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {blocks[0] ? new Date(blocks[0].time * 1000).toLocaleDateString() : 'No data'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Blocks Table */}
      {blocks.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Recent Blocks
            </CardTitle>
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
                    <TableHead className="text-right">Size</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blocks.map((block) => (
                    <TableRow key={block.hash}>
                      <TableCell className="font-medium">
                        <a href={`/block/${block.height}`} className="hover:underline">
                          {block.height.toLocaleString()}
                        </a>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        <a href={`/block/${block.hash}`} className="hover:underline">
                          {block.hash.slice(0, 16)}...
                        </a>
                      </TableCell>
                      <TableCell>{new Date(block.time * 1000).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{block.tx.length}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {typeof block.size === 'number' 
                          ? `${(block.size / 1024).toFixed(1)}KB` 
                          : 'N/A'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Block Explorer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-8">
              <Database className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No Blocks Available</h3>
              <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                Unable to fetch block data. Please check your connection to the FairCoin node.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="default" asChild>
                <a href="/">
                  <Home className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/search">
                  <Search className="w-4 h-4 mr-2" />
                  Search Blocks
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
