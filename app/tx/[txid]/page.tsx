import { getCachedTransaction } from '@/lib/cached-rpc';
import { getCachedBlock } from '@/lib/cached-rpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CopyButton } from '@/components/copy-button';
import { Hash, Clock, CheckCircle, XCircle, Database, LinkIcon, FileText, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function TxPage({ params }: { params: { txid: string } }) {
  let tx;
  let isBlockHashError = false;
  
  try {
    tx = await getCachedTransaction(params.txid);
  } catch (error: any) {
    // Check if this might be a block hash instead of a transaction ID
    if (error.message?.includes('No information available about transaction')) {
      // Try to see if this is actually a block hash
      try {
        await getCachedBlock(params.txid);
        // If we got here, it's a valid block hash
        redirect(`/block/${params.txid}`);
      } catch {
        // Not a valid block hash either, show the original error
        isBlockHashError = true;
      }
    }
    
    if (!isBlockHashError) {
      throw error; // Re-throw if it's not the specific error we're handling
    }
  }
  
  // If we detected a block hash error, show helpful UI
  if (isBlockHashError) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Transaction Not Found</h2>
            <p className="text-muted-foreground">
              The provided ID does not correspond to a valid transaction
            </p>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Possible Mix-up
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              It looks like you might be trying to view a transaction using a block hash. 
              Transaction IDs and block hashes are different types of identifiers.
            </p>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Provided ID:</label>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <code className="text-sm break-all">{params.txid}</code>
                <CopyButton text={params.txid} />
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button asChild variant="outline">
                <Link href={`/block/${params.txid}`}>
                  <Hash className="w-4 h-4 mr-2" />
                  Try as Block Hash
                </Link>
              </Button>
              
              <Button asChild variant="outline">
                <Link href="/tx">
                  <FileText className="w-4 h-4 mr-2" />
                  Search Transactions
                </Link>
              </Button>
              
              <Button asChild variant="outline">
                <Link href="/blocks">
                  <Database className="w-4 h-4 mr-2" />
                  Browse Blocks
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Transaction Details</h2>
          <p className="text-muted-foreground">
            Transaction information and input/output details
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge 
            variant={(tx.confirmations ?? 0) > 0 ? 'default' : 'destructive'}
            className={(tx.confirmations ?? 0) > 0 
              ? "bg-primary/10 text-primary border-primary/20" 
              : "bg-destructive/10 text-destructive border-destructive/20"
            }
          >
            {(tx.confirmations ?? 0) > 0 ? (
              <CheckCircle className="w-3 h-3 mr-1" />
            ) : (
              <XCircle className="w-3 h-3 mr-1" />
            )}
            {tx.confirmations ?? 0} Confirmations
          </Badge>
        </div>
      </div>

      {/* Transaction Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmations</CardTitle>
            {(tx.confirmations ?? 0) > 0 ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tx.confirmations ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {(tx.confirmations ?? 0) > 0 ? 'Confirmed' : 'Unconfirmed'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Timestamp</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tx.time ? new Date(tx.time * 1000).toLocaleTimeString() : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {tx.time ? new Date(tx.time * 1000).toLocaleDateString() : 'No timestamp'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inputs</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tx.vin.length}</div>
            <p className="text-xs text-muted-foreground">Total inputs</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outputs</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tx.vout.length}</div>
            <p className="text-xs text-muted-foreground">Total outputs</p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Hash */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Transaction ID
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <code className="text-sm break-all">{tx.txid}</code>
            <CopyButton text={tx.txid} />
          </div>
          {tx.blockhash && (
            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium">Block Hash</label>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <a href={`/block/${tx.blockhash}`} className="text-sm hover:underline break-all font-mono">
                  {tx.blockhash}
                </a>
                <CopyButton text={tx.blockhash} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inputs">Inputs ({tx.vin.length})</TabsTrigger>
          <TabsTrigger value="outputs">Outputs ({tx.vout.length})</TabsTrigger>
          <TabsTrigger value="raw">Raw Data</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <div className="text-sm text-muted-foreground">
                      {(tx.confirmations ?? 0) > 0 ? 'Confirmed' : 'Unconfirmed'}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Confirmations</label>
                    <div className="text-sm text-muted-foreground">{tx.confirmations ?? 0}</div>
                  </div>
                  {typeof tx.size === 'number' && (
                    <div>
                      <label className="text-sm font-medium">Size</label>
                      <div className="text-sm text-muted-foreground">{tx.size} bytes</div>
                    </div>
                  )}
                  {tx.time && (
                    <div>
                      <label className="text-sm font-medium">Time</label>
                      <div className="text-sm text-muted-foreground">
                        {new Date(tx.time * 1000).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {tx.blockhash && (
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href={`/block/${tx.blockhash}`}>
                      <Database className="w-4 h-4 mr-2" />
                      View Block
                    </a>
                  </Button>
                )}
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/tx">
                    <FileText className="w-4 h-4 mr-2" />
                    Browse Transactions
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="inputs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Inputs ({tx.vin.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Input details (coinbase or previous outputs). Verbose linking omitted for RPC performance.
                </div>
                <div className="rounded-md border p-4 bg-muted/50">
                  <pre className="text-sm whitespace-pre-wrap break-all overflow-auto">
                    {JSON.stringify(tx.vin, null, 2)}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="outputs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Outputs ({tx.vout.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Index</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Address(es)</TableHead>
                      <TableHead>Script Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tx.vout.map((output: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{output.n}</TableCell>
                        <TableCell className="font-mono">{output.value}</TableCell>
                        <TableCell className="font-mono text-sm break-all">
                          {output.scriptPubKey.addresses?.join(', ') ?? '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {output.scriptPubKey.type ?? 'Unknown'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="raw" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Raw Transaction Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border p-4 bg-muted/50">
                <pre className="text-sm whitespace-pre-wrap break-all overflow-auto">
                  {JSON.stringify(tx, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
