import { BookOpen, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from '@/lib/i18n'
import { DetailHeader } from '@/components/detail/detail-header'
import { SectionCard } from '@/components/detail/section-card'
import { Button } from '@/components/ui/button'

interface EndpointRow {
  method: 'GET' | 'POST' | 'WS'
  path: string
  descriptionKey: string
}

const ENDPOINTS: EndpointRow[] = [
  { method: 'GET', path: '/api/blocks', descriptionKey: 'blocks' },
  { method: 'GET', path: '/api/block/:hashOrHeight', descriptionKey: 'block' },
  { method: 'GET', path: '/api/blockcount', descriptionKey: 'blockcount' },
  { method: 'GET', path: '/api/transactions', descriptionKey: 'transactions' },
  { method: 'GET', path: '/api/transaction/:txid', descriptionKey: 'transaction' },
  { method: 'POST', path: '/api/tx/broadcast', descriptionKey: 'broadcast' },
  { method: 'GET', path: '/api/address/:address', descriptionKey: 'address' },
  { method: 'GET', path: '/api/address/:address/txs', descriptionKey: 'addressTxs' },
  { method: 'GET', path: '/api/address/:address/utxos', descriptionKey: 'addressUtxos' },
  { method: 'GET', path: '/api/mempool', descriptionKey: 'mempool' },
  { method: 'GET', path: '/api/masternodes', descriptionKey: 'masternodes' },
  { method: 'GET', path: '/api/peers', descriptionKey: 'peers' },
  { method: 'GET', path: '/api/stats', descriptionKey: 'stats' },
  { method: 'GET', path: '/api/stats/history', descriptionKey: 'statsHistory' },
  { method: 'GET', path: '/api/network-info', descriptionKey: 'networkInfo' },
  { method: 'GET', path: '/api/mining-info', descriptionKey: 'miningInfo' },
  { method: 'GET', path: '/api/search?q=', descriptionKey: 'search' },
  { method: 'GET', path: '/api/validate-address?address=', descriptionKey: 'validateAddress' },
  { method: 'GET', path: '/api/fee-estimate', descriptionKey: 'feeEstimate' },
  { method: 'GET', path: '/api/price', descriptionKey: 'price' },
  { method: 'GET', path: '/api/price/history', descriptionKey: 'priceHistory' },
  { method: 'GET', path: '/api/bridge/reserves', descriptionKey: 'bridgeReserves' },
  { method: 'WS', path: '/api/ws', descriptionKey: 'websocket' },
]

export function ApiDocsContent() {
  const t = useTranslations('tools.apiDocs')

  const copyPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path)
      toast.success(t('copied'))
    } catch (error: unknown) {
      console.error('Clipboard write failed:', error)
      toast.error(t('copyFailed'))
    }
  }

  return (
    <div className="flex-1 space-y-4">
      <DetailHeader title={t('title')} subtitle={t('subtitle')} />

      <SectionCard title={t('overviewTitle')} icon={BookOpen}>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>{t('overviewBody')}</p>
          <p>{t('networkNote')}</p>
          <p>{t('rateLimitNote')}</p>
        </div>
      </SectionCard>

      <SectionCard title={t('endpointsTitle')} icon={BookOpen} flush>
        <ul className="divide-y">
          {ENDPOINTS.map((endpoint) => (
            <li
              key={`${endpoint.method}-${endpoint.path}`}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary">
                    {endpoint.method}
                  </span>
                  <code className="break-all font-mono text-sm">{endpoint.path}</code>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t(`endpoints.${endpoint.descriptionKey}`)}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => void copyPath(endpoint.path)}
              >
                <Copy className="size-3.5" />
                {t('copy')}
              </Button>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  )
}
