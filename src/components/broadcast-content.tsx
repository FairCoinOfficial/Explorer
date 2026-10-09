import { DetailHeader } from '@/components/detail/detail-header'
import { useNetwork } from '@/contexts/network-context'
import { ExplorerLink as Link } from '@/lib/explorer-navigation'
import { useTranslations } from '@/lib/i18n'
import { Button } from '@oxy.so/bloom/button'
import { Card, CardBody, CardHeader, CardTitle } from '@oxy.so/bloom/card'
import { Textarea } from '@oxy.so/bloom/textarea'
import { toast } from '@oxy.so/bloom/toast'
import { AlertTriangle, Send } from 'lucide-react'
import { useState } from 'react'
import { View } from 'react-native'

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
      const response = await fetch(
        `/api/tx/broadcast?network=${currentNetwork}`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ hex: cleaned }),
        },
      )
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
    <View style={{ gap: 16 }}>
      <DetailHeader title={t('title')} subtitle={t('subtitle')} />

      <Card>
        <CardHeader>
          <CardTitle>{t('formTitle')}</CardTitle>
        </CardHeader>
        <CardBody>
          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="space-y-4"
          >
            <Textarea
              label={t('hexLabel')}
              hint={t('hexHint')}
              rows={7}
              id="tx-hex"
              value={hex}
              onValueChange={(value) => {
                setHex(value)
                if (state.status !== 'idle' && state.status !== 'submitting') {
                  setState({ status: 'idle' })
                }
              }}
              placeholder={t('hexPlaceholder')}
              inputClassName="font-mono"
              spellCheck={false}
              autoComplete="off"
            />

            {validationKey && hex.trim() ? (
              <Card clipContent>
                <div className="flex items-start gap-2 px-3 py-2 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>{t(`errors.${validationKey}`)}</span>
                </div>
              </Card>
            ) : null}

            <Button type="submit" disabled={!canSubmit}>
              <Send className="size-4" />
              {state.status === 'submitting' ? t('submitting') : t('submit')}
            </Button>
          </form>
        </CardBody>
      </Card>

      {state.status === 'success' ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('successTitle')}</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t('successBody')}
              </p>
              <Link
                to={`/tx/${state.txid}`}
                className="block break-all font-mono text-sm font-medium text-primary hover:underline"
              >
                {state.txid}
              </Link>
              <Button appearance="outline" href={`/tx/${state.txid}`}>
                {t('viewTransaction')}
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {state.status === 'error' ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('errorTitle')}</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-destructive">{state.message}</p>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('safetyTitle')}</CardTitle>
        </CardHeader>
        <CardBody>
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
        </CardBody>
      </Card>
    </View>
  )
}
