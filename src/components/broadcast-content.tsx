import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Radio, Send } from 'lucide-react'
import { toast } from 'sonner'
import { useNetwork } from '@/contexts/network-context'
import { useTranslations } from '@/lib/i18n'
import { DetailHeader } from '@/components/detail/detail-header'
import { SectionCard } from '@/components/detail/section-card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const MAX_TX_HEX_CHARS = 200_000
const HEX_PATTERN = /^[0-9a-fA-F]+$/

type BroadcastState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; txid: string }
  | { status: 'error'; message: string }

function validateHex(raw: string): string | null {
  const hex = raw.trim().replace(/\s+/g, '')
  if (!hex) return 'empty'
  if (hex.length % 2 !== 0) return 'oddLength'
  if (!HEX_PATTERN.test(hex)) return 'invalidChars'
  if (hex.length > MAX_TX_HEX_CHARS) return 'tooLarge'
  return null
}

export function BroadcastContent() {
  const t = useTranslations('tools.broadcast')
  const { currentNetwork } = useNetwork()
  const [hex, setHex] = useState('')
  const [state, setState] = useState<BroadcastState>({ status: 'idle' })

  const validationKey = validateHex(hex)
  const canSubmit = validationKey === null && state.status !== 'submitting'

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cleaned = hex.trim().replace(/\s+/g, '')
    const errorKey = validateHex(cleaned)
    if (errorKey) {
      setState({ status: 'error', message: t(`errors.${errorKey}`) })
      return
    }

    setState({ status: 'submitting' })
    try {
      const response = await fetch(`/api/tx/broadcast?network=${currentNetwork}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hex: cleaned }),
      })
      const body = (await response.json()) as { txid?: string; error?: string }
      if (!response.ok || !body.txid) {
        const message = body.error ?? t('errors.rejected')
        setState({ status: 'error', message })
        toast.error(message)
        return
      }
      setState({ status: 'success', txid: body.txid })
      toast.success(t('successToast'))
    } catch (error: unknown) {
      console.error('Broadcast request failed:', error)
      const message = t('errors.network')
      setState({ status: 'error', message })
      toast.error(message)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
      <DetailHeader title={t('title')} subtitle={t('subtitle')} />

      <SectionCard title={t('formTitle')} icon={Radio}>
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="tx-hex" className="block text-sm font-medium">
              {t('hexLabel')}
            </label>
            <Textarea
              id="tx-hex"
              value={hex}
              onChange={(event) => {
                setHex(event.target.value)
                if (state.status !== 'idle' && state.status !== 'submitting') {
                  setState({ status: 'idle' })
                }
              }}
              placeholder={t('hexPlaceholder')}
              className="min-h-[160px] font-mono text-xs"
              spellCheck={false}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">{t('hexHint')}</p>
          </div>

          {validationKey && hex.trim() ? (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{t(`errors.${validationKey}`)}</span>
            </div>
          ) : null}

          <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
            <Send className="size-4" />
            {state.status === 'submitting' ? t('submitting') : t('submit')}
          </Button>
        </form>
      </SectionCard>

      {state.status === 'success' ? (
        <SectionCard title={t('successTitle')} icon={CheckCircle2}>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('successBody')}</p>
            <Link
              to={`/tx/${state.txid}`}
              className="block break-all font-mono text-sm font-medium text-primary hover:underline"
            >
              {state.txid}
            </Link>
            <Button variant="outline" asChild>
              <Link to={`/tx/${state.txid}`}>{t('viewTransaction')}</Link>
            </Button>
          </div>
        </SectionCard>
      ) : null}

      {state.status === 'error' ? (
        <SectionCard title={t('errorTitle')} icon={AlertTriangle}>
          <p className="text-sm text-destructive">{state.message}</p>
        </SectionCard>
      ) : null}

      <SectionCard title={t('safetyTitle')}>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
            <span>{t('safety1')}</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
            <span>{t('safety2')}</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
            <span>{t('safety3', { network: currentNetwork })}</span>
          </li>
        </ul>
      </SectionCard>
    </div>
  )
}
