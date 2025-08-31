import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Hash, Search, Home } from 'lucide-react';

export default function TxIndex() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Transactions</h2>
          <p className="text-muted-foreground">
            Search and explore blockchain transactions
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Transaction Lookup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="max-w-md mx-auto">
            <form action="/search" className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="txid" className="text-sm font-medium">
                  Transaction ID
                </label>
                <Input 
                  id="txid"
                  name="q" 
                  placeholder="Enter transaction hash (TXID)..."
                  className="font-mono"
                />
              </div>
              <Button type="submit" className="w-full">
                <Search className="w-4 h-4 mr-2" />
                Search Transaction
              </Button>
            </form>
          </div>
          
          <div className="text-center py-4">
            <div className="text-sm text-muted-foreground">
              Or browse recent transactions on the dashboard
            </div>
            <Button variant="outline" className="mt-4" asChild>
              <a href="/">
                <Home className="w-4 h-4 mr-2" />
                Go to Dashboard
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
