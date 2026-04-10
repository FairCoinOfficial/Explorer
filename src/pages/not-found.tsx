import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Home, Search, Blocks, FileQuestion, ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh] p-4">
      <div className="w-full max-w-md space-y-6">
        <Card className="border-dashed border-2 border-muted-foreground/30">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <FileQuestion className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold">Page Not Found</CardTitle>
            <p className="text-muted-foreground text-sm">The page you are looking for does not exist or has been moved.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Button asChild className="w-full"><Link to="/"><Home className="h-4 w-4 mr-2" />Back to Home</Link></Button>
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline" size="sm"><Link to="/search"><Search className="h-4 w-4 mr-1" />Search</Link></Button>
                <Button asChild variant="outline" size="sm"><Link to="/blocks"><Blocks className="h-4 w-4 mr-1" />Blocks</Link></Button>
              </div>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => window.history.back()}>
                <ArrowLeft className="h-3 w-3 mr-1" />Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
