import { Link } from 'react-router-dom'
import { ArrowLeft, Blocks, FileQuestion, Home, Receipt } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { SectionCard } from '@/components/detail/section-card'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  const t = useTranslations('notFound')
  const nav = useTranslations('nav')

  return (
    <div className="flex flex-1 items-center justify-center p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
      <SectionCard className="w-full max-w-md text-center">
        <div className="flex flex-col items-center gap-4">
          <span className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileQuestion className="size-8" />
          </span>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">{t('title')}</h2>
            <p className="text-sm text-muted-foreground">{t('description')}</p>
          </div>

          <div className="grid w-full gap-2">
            <Button asChild className="w-full">
              <Link to="/">
                <Home className="size-4" />
                {t('backToHome')}
              </Link>
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline">
                <Link to="/tx">
                  <Receipt className="size-4" />
                  {nav('transactions')}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/blocks">
                  <Blocks className="size-4" />
                  {t('blocks')}
                </Link>
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
              <ArrowLeft className="size-3.5" />
              {t('goBack')}
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
