import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Hash, Home, Search } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { DetailHeader } from '@/components/detail/detail-header'
import { SectionCard } from '@/components/detail/section-card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function TxIndexPage() {
  const navigate = useNavigate()
  const nav = useTranslations('nav')
  const common = useTranslations('common')
  const t = useTranslations('txIndex')
  const [txid, setTxid] = useState('')

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = txid.trim()
    if (value) navigate(`/tx/${value}`)
  }

  return (
    <div className="flex-1 space-y-3 p-2 pt-3 sm:space-y-4 sm:p-4 md:p-6 lg:p-8">
      <DetailHeader title={nav('transactions')} subtitle={t('subtitle')} />

      <SectionCard title={t('lookupTitle')} icon={Hash}>
        <div className="mx-auto max-w-md space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="txid" className="block text-sm font-medium">
                {t('txidLabel')}
              </label>
              <Input
                id="txid"
                value={txid}
                onChange={(event) => setTxid(event.target.value)}
                placeholder={t('txidPlaceholder')}
                className="font-mono text-sm"
              />
            </div>
            <Button type="submit" disabled={!txid.trim()} className="w-full">
              <Search className="size-4" />
              {t('searchButton')}
            </Button>
          </form>

          <div className="space-y-3 border-t pt-4 text-center">
            <p className="text-sm text-muted-foreground">{t('browseHint')}</p>
            <Button variant="outline" asChild>
              <Link to="/">
                <Home className="size-4" />
                {common('backToHome')}
              </Link>
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
