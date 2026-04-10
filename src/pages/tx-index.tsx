import { Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Hash, Search, Home } from 'lucide-react'

export default function TxIndexPage() {
  return (
    <div className="flex-1 space-y-4 p-3 pt-4 md:p-6 lg:p-8">
      <div className="flex flex-col space-y-2 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Transactions</h2>
          <p className="text-muted-foreground text-sm sm:text-base">Search and explore FairCoin transactions</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Hash className="h-4 w-4" />Transaction Lookup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="max-w-md mx-auto">
            <form action="/search" className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="txid" className="text-sm font-medium">Transaction ID</label>
                <Input id="txid" name="q" placeholder="Enter a transaction ID..." className="font-mono" />
              </div>
              <Button type="submit" className="w-full"><Search className="w-4 h-4 mr-2" />Search Transaction</Button>
            </form>
          </div>
          <div className="text-center py-4">
            <div className="text-sm text-muted-foreground">Or browse recent blocks on the home page</div>
            <Button variant="outline" className="mt-4" asChild>
              <Link to="/"><Home className="w-4 h-4 mr-2" />Back to Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
