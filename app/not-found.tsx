import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Home, Search, Blocks, FileQuestion, ArrowLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export default async function NotFound() {
  const t = await getTranslations('common')

  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh] p-4">
      <div className="w-full max-w-md space-y-6">
        <Card className="border-dashed border-2 border-muted-foreground/30">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <FileQuestion className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold">{t('notFound.title')}</CardTitle>
            <p className="text-muted-foreground text-sm">
              {t('notFound.description')}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Button asChild className="w-full">
                <Link href="/">
                  <Home className="h-4 w-4 mr-2" />
                  {t('notFound.backHome')}
                </Link>
              </Button>
              
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/search">
                    <Search className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">{t('notFound.search')}</span>
                    <span className="sm:hidden">{t('notFound.searchShort')}</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/blocks">
                    <Blocks className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">{t('notFound.blocks')}</span>
                    <span className="sm:hidden">{t('notFound.blocksShort')}</span>
                  </Link>
                </Button>
              </div>

              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link href="javascript:history.back()">
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  {t('notFound.goBack')}
                </Link>
              </Button>
            </div>

            <div className="text-center pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                {t('notFound.help')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
