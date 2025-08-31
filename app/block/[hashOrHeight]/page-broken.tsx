import { BlockContent } from '@/components/block-content'

export default function BlockPage({ params }: { params: { hashOrHeight: string } }) {
  return <BlockContent hashOrHeight={params.hashOrHeight} />
}

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Block #{block.height}</h2>
          <p className="text-muted-foreground">
            Block details and transactions
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            <Database className="w-3 h-3 mr-1" />
            {block.tx.length} TX
          </Badge>
        </div>
      </div>

      {/* Block Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Block Height</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{block.height.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Current block number</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Timestamp</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date(block.time * 1000).toLocaleTimeString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(block.time * 1000).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{block.tx.length}</div>
            <p className="text-xs text-muted-foreground">Total transactions</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Size</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {typeof block.size === 'number' ? `${(block.size / 1024).toFixed(1)}KB` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {typeof block.size === 'number' ? `${block.size.toLocaleString()} bytes` : 'Size not available'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {block.previousblockhash && (
            <Button variant="outline" size="sm" asChild>
              <a href={`/block/${block.previousblockhash}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous Block
              </a>
            </Button>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {block.nextblockhash && (
            <Button variant="outline" size="sm" asChild>
              <a href={`/block/${block.nextblockhash}`}>
                Next Block
                <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="technical">Technical Details</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Block Hash
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <code className="text-sm break-all">{block.hash}</code>
                  <CopyButton text={block.hash} />
                </div>
                
                {block.previousblockhash && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Previous Block</label>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <a href={`/block/${block.previousblockhash}`} className="text-sm hover:underline break-all font-mono">
                        {block.previousblockhash}
                      </a>
                      <CopyButton text={block.previousblockhash} />
                    </div>
                  </div>
                )}
                
                {block.nextblockhash && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Next Block</label>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <a href={`/block/${block.nextblockhash}`} className="text-sm hover:underline break-all font-mono">
                        {block.nextblockhash}
                      </a>
                      <CopyButton text={block.nextblockhash} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href={`/tx/${params.hashOrHeight}`}>
                    <Hash className="w-4 h-4 mr-2" />
                    View as Transaction
                  </a>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/blocks">
                    <Database className="w-4 h-4 mr-2" />
                    Browse All Blocks
                  </a>
                </Button>
                <div className="text-sm text-muted-foreground">
                  If this was a transaction ID, you can check the transaction view instead.
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Block Transactions ({block.tx.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {block.tx.map((txid: string, index: number) => (
                      <TableRow key={txid}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell className="font-mono text-sm">
                          <a href={`/tx/${txid}`} className="hover:underline break-all">
                            {txid}
                          </a>
                        </TableCell>
                        <TableCell>
                          <CopyButton text={txid} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="technical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Technical Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  {typeof block.difficulty === 'number' && (
                    <div>
                      <label className="text-sm font-medium">Difficulty</label>
                      <div className="text-sm text-muted-foreground">{block.difficulty}</div>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium">Size</label>
                    <div className="text-sm text-muted-foreground">
                      {typeof block.size === 'number' ? `${block.size.toLocaleString()} bytes` : 'Not available'}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Transaction Count</label>
                    <div className="text-sm text-muted-foreground">{block.tx.length}</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Block Time</label>
                    <div className="text-sm text-muted-foreground">
                      {new Date(block.time * 1000).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Unix Timestamp</label>
                    <div className="text-sm text-muted-foreground">{block.time}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
