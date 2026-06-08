import { useState } from 'react'
import { CheckCircle2, Info, ShieldCheck, Wallet, XCircle } from 'lucide-react'
import { useNetwork } from '@/contexts/network-context'
import { useTranslations } from '@/lib/i18n'
import { useValidateAddress } from '@/hooks/use-validate-address'
import { DetailHeader } from '@/components/detail/detail-header'
import { SectionCard } from '@/components/detail/section-card'
import { InfoGrid, InfoRow } from '@/components/detail/info-row'
import { HashCell } from '@/components/detail/hash-cell'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type Translate = (key: string, params?: Record<string, string | number>) => string

interface ValidationResult {
  isValid: boolean
  addressType: string
  network: string
  error?: string
}

const BASE58_REGEX = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/

/** Client-side FairCoin address validation based on prefix and Base58 charset. */
function validateAddress(input: string, t: Translate): ValidationResult {
  const cleanAddress = input.trim()

  if (cleanAddress === '') {
    return { isValid: false, addressType: 'unknown', network: 'unknown', error: t('errors.empty') }
  }

  if (cleanAddress.length < 25 || cleanAddress.length > 62) {
    return {
      isValid: false,
      addressType: 'unknown',
      network: 'unknown',
      error: t('errors.invalidLength'),
    }
  }

  if (!BASE58_REGEX.test(cleanAddress)) {
    return {
      isValid: false,
      addressType: 'unknown',
      network: 'unknown',
      error: t('errors.invalidCharacters'),
    }
  }

  if (cleanAddress.startsWith('f')) {
    return { isValid: true, addressType: t('addressTypes.p2pkh'), network: 'mainnet' }
  }
  if (cleanAddress.startsWith('F')) {
    return { isValid: true, addressType: t('addressTypes.p2sh'), network: 'mainnet' }
  }
  if (cleanAddress.startsWith('m') || cleanAddress.startsWith('n')) {
    return { isValid: true, addressType: t('addressTypes.p2pkhTestnet'), network: 'testnet' }
  }
  if (cleanAddress.startsWith('2')) {
    return { isValid: true, addressType: t('addressTypes.p2shTestnet'), network: 'testnet' }
  }

  return {
    isValid: false,
    addressType: 'unknown',
    network: 'unknown',
    error: t('errors.unknownFormat'),
  }
}

function describeType(type: string, t: Translate): string {
  if (type === t('addressTypes.p2pkh')) return t('addressDescriptions.p2pkh')
  if (type === t('addressTypes.p2sh')) return t('addressDescriptions.p2sh')
  if (type === t('addressTypes.p2pkhTestnet')) return t('addressDescriptions.p2pkhTestnet')
  if (type === t('addressTypes.p2shTestnet')) return t('addressDescriptions.p2shTestnet')
  return t('addressDescriptions.unknown')
}

export function AddressValidatorContent() {
  const { currentNetwork } = useNetwork()
  const t = useTranslations('tools.addressValidator')
  const common = useTranslations('common')

  const [address, setAddress] = useState('')
  const [result, setResult] = useState<ValidationResult | null>(null)
  // Only set once local validation passes; gates the node-side query.
  const [submittedAddress, setSubmittedAddress] = useState('')

  const {
    data: nodeValidation,
    isFetching: isCheckingNode,
  } = useValidateAddress(submittedAddress)

  const handleValidate = () => {
    const localResult = validateAddress(address, t)
    setResult(localResult)
    setSubmittedAddress(localResult.isValid ? address.trim() : '')
  }

  const networkMismatch =
    result?.isValid === true && result.network !== currentNetwork

  return (
    <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
      <DetailHeader
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <Wallet className="size-3" />
            {currentNetwork.toUpperCase()}
          </span>
        }
      />

      <SectionCard title={t('validateSection.title')} icon={ShieldCheck}>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="address" className="block text-sm font-medium">
              {t('form.label')}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="address"
                type="text"
                placeholder={t('form.placeholder')}
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && address.trim()) handleValidate()
                }}
                className="font-mono text-sm"
              />
              <Button
                onClick={handleValidate}
                disabled={!address.trim()}
                className="shrink-0"
              >
                {t('form.validate')}
              </Button>
            </div>
          </div>

          {result ? (
            <div className="space-y-4 border-t pt-4">
              <ResultBanner isValid={result.isValid} t={t} />

              {result.isValid ? (
                <div className="space-y-4">
                  <HashCell value={submittedAddress} to="address" full textClassName="text-sm" />

                  <InfoGrid columns={2}>
                    <InfoRow
                      label={t('results.network')}
                      value={
                        <Badge variant={result.network === 'mainnet' ? 'default' : 'secondary'}>
                          {result.network.toUpperCase()}
                        </Badge>
                      }
                    />
                    <InfoRow
                      label={t('results.addressType')}
                      value={
                        <span className="space-y-0.5">
                          <span className="block text-sm font-medium">{result.addressType}</span>
                          <span className="block text-xs text-muted-foreground">
                            {describeType(result.addressType, t)}
                          </span>
                        </span>
                      }
                    />
                  </InfoGrid>

                  {networkMismatch ? (
                    <Callout tone="info" icon={Info} title={t('warnings.networkMismatch.title')}>
                      {t('warnings.networkMismatch.description', {
                        addressNetwork: result.network,
                        currentNetwork,
                      })}
                    </Callout>
                  ) : null}

                  {isCheckingNode ? (
                    <p className="text-xs text-muted-foreground">{t('networkValidation.checking')}</p>
                  ) : null}

                  {nodeValidation ? (
                    <div className="rounded-lg bg-muted/60 p-4">
                      <h4 className="mb-2 text-sm font-semibold">{t('networkValidation.title')}</h4>
                      <div className="space-y-1.5 text-sm">
                        <NodeRow
                          label={t('networkValidation.valid')}
                          ok={nodeValidation.isvalid}
                          common={common}
                          highlight
                        />
                        {nodeValidation.ismine !== undefined ? (
                          <NodeRow
                            label={t('networkValidation.isMine')}
                            ok={nodeValidation.ismine}
                            common={common}
                          />
                        ) : null}
                        {nodeValidation.iswatchonly !== undefined ? (
                          <NodeRow
                            label={t('networkValidation.watchOnly')}
                            ok={nodeValidation.iswatchonly}
                            common={common}
                          />
                        ) : null}
                        {nodeValidation.isscript !== undefined ? (
                          <NodeRow
                            label={t('networkValidation.scriptAddress')}
                            ok={nodeValidation.isscript}
                            common={common}
                          />
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <Callout tone="error" icon={XCircle} title={t('errors.title')}>
                  {result.error}
                </Callout>
              )}
            </div>
          ) : null}
        </div>
      </SectionCard>

      {/* Address reference */}
      <SectionCard title={t('addressInfo.title')} icon={Wallet}>
        <InfoGrid columns={2}>
          <InfoRow label={t('addressInfo.mainnetP2PKH')} value={t('addressInfo.mainnetP2PKHExample')} mono />
          <InfoRow label={t('addressInfo.mainnetP2SH')} value={t('addressInfo.mainnetP2SHExample')} mono />
          <InfoRow label={t('addressInfo.mainnetLength')} value={t('addressInfo.mainnetLengthValue')} />
          <InfoRow label={t('addressInfo.mainnetUsage')} value={t('addressInfo.mainnetUsageValue')} />
          <InfoRow label={t('addressInfo.testnetP2PKH')} value={t('addressInfo.testnetP2PKHValue')} />
          <InfoRow label={t('addressInfo.testnetP2SH')} value={t('addressInfo.testnetP2SHValue')} />
          <InfoRow label={t('addressInfo.testnetLength')} value={t('addressInfo.testnetLengthValue')} />
          <InfoRow label={t('addressInfo.testnetUsage')} value={t('addressInfo.testnetUsageValue')} />
        </InfoGrid>
      </SectionCard>
    </div>
  )
}

function ResultBanner({ isValid, t }: { isValid: boolean; t: Translate }) {
  return (
    <div
      className={
        isValid
          ? 'flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-primary'
          : 'flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-destructive'
      }
    >
      {isValid ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
      <span className="text-sm font-semibold">
        {isValid ? t('results.valid') : t('results.invalid')}
      </span>
    </div>
  )
}

function NodeRow({
  label,
  ok,
  common,
  highlight = false,
}: {
  label: string
  ok: boolean
  common: Translate
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          highlight
            ? ok
              ? 'font-medium text-primary'
              : 'font-medium text-destructive'
            : 'tabular-nums'
        }
      >
        {ok ? common('yes') : common('no')}
      </span>
    </div>
  )
}

function Callout({
  tone,
  icon: Icon,
  title,
  children,
}: {
  tone: 'info' | 'error'
  icon: typeof Info
  title: string
  children: React.ReactNode
}) {
  const toneClass =
    tone === 'error'
      ? 'border-destructive/30 bg-destructive/10 text-destructive'
      : 'border-primary/30 bg-primary/10 text-primary'

  return (
    <div className={cn('flex items-start gap-2 rounded-lg border p-3', toneClass)}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="space-y-0.5 text-sm">
        <p className="font-medium">{title}</p>
        <p className="text-foreground/80">{children}</p>
      </div>
    </div>
  )
}
