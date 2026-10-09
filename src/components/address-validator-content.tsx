import { DetailHeader } from '@/components/detail/detail-header'
import { HashCell } from '@/components/detail/hash-cell'
import { useNetwork } from '@/contexts/network-context'
import { useValidateAddress } from '@/hooks/use-validate-address'
import { useTranslations } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import {
  AdmonitionContent,
  AdmonitionIcon,
  AdmonitionRoot,
  AdmonitionRow,
  AdmonitionText,
} from '@oxy.so/bloom/admonition'
import { Button } from '@oxy.so/bloom/button'
import { Card, CardBody, CardHeader, CardTitle } from '@oxy.so/bloom/card'
import { Chip } from '@oxy.so/bloom/chip'
import { Code } from '@oxy.so/bloom/code'
import { Field } from '@oxy.so/bloom/field'
import { Item } from '@oxy.so/bloom/item'
import { TextFieldInput as Input } from '@oxy.so/bloom/text-field'
import { Text } from '@oxy.so/bloom/typography'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useState } from 'react'
import { View } from 'react-native'

type Translate = (
  key: string,
  params?: Record<string, string | number>,
) => string

interface ValidationResult {
  isValid: boolean
  addressType: string
  network: string
  error?: string
}

const BASE58_REGEX =
  /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/

/** Client-side FairCoin address validation based on prefix and Base58 charset. */
function validateAddress(input: string, t: Translate): ValidationResult {
  const cleanAddress = input.trim()

  if (cleanAddress === '') {
    return {
      isValid: false,
      addressType: 'unknown',
      network: 'unknown',
      error: t('errors.empty'),
    }
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
    return {
      isValid: true,
      addressType: t('addressTypes.p2pkh'),
      network: 'mainnet',
    }
  }
  if (cleanAddress.startsWith('F')) {
    return {
      isValid: true,
      addressType: t('addressTypes.p2sh'),
      network: 'mainnet',
    }
  }
  if (cleanAddress.startsWith('m') || cleanAddress.startsWith('n')) {
    return {
      isValid: true,
      addressType: t('addressTypes.p2pkhTestnet'),
      network: 'testnet',
    }
  }
  if (cleanAddress.startsWith('2')) {
    return {
      isValid: true,
      addressType: t('addressTypes.p2shTestnet'),
      network: 'testnet',
    }
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
  if (type === t('addressTypes.p2pkhTestnet'))
    return t('addressDescriptions.p2pkhTestnet')
  if (type === t('addressTypes.p2shTestnet'))
    return t('addressDescriptions.p2shTestnet')
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

  const { data: nodeValidation, isFetching: isCheckingNode } =
    useValidateAddress(submittedAddress)

  const handleValidate = () => {
    const localResult = validateAddress(address, t)
    setResult(localResult)
    setSubmittedAddress(localResult.isValid ? address.trim() : '')
  }

  const networkMismatch =
    result?.isValid === true && result.network !== currentNetwork

  return (
    <View style={{ gap: 16 }}>
      <DetailHeader title={t('title')} subtitle={t('subtitle')} />

      <Card>
        <CardHeader>
          <CardTitle>{t('validateSection.title')}</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <Field label={t('form.label')} nativeID="address">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  label={t('form.label')}
                  nativeID="address"
                  placeholder={t('form.placeholder')}
                  value={address}
                  onValueChange={(value) => setAddress(value)}
                  onSubmitEditing={() => {
                    if (address.trim()) handleValidate()
                  }}
                />
                <Button onPress={handleValidate} disabled={!address.trim()}>
                  {t('form.validate')}
                </Button>
              </div>
            </Field>

            {result ? (
              result.isValid ? (
                <div className="space-y-4 border-t pt-4">
                  <Card clipContent>
                    <div className="relative overflow-hidden p-4">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-9 shrink-0 items-center justify-center text-primary">
                          <CheckCircle2 className="size-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-primary">
                            {t('results.valid')}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {result.addressType}
                          </p>
                        </div>
                        <Chip
                          tone={
                            result.network === 'mainnet' ? 'accent' : 'neutral'
                          }
                        >
                          {result.network.toUpperCase()}
                        </Chip>
                      </div>
                      <Card clipContent>
                        <div className="mt-3 px-3 py-2.5">
                          <HashCell
                            value={submittedAddress}
                            to="address"
                            full
                            textClassName="text-sm"
                          />
                        </div>
                      </Card>
                    </div>
                  </Card>

                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <Item
                      density="compact"
                      title={t('results.network')}
                      subtitle={
                        <Chip
                          tone={
                            result.network === 'mainnet' ? 'accent' : 'neutral'
                          }
                        >
                          {result.network.toUpperCase()}
                        </Chip>
                      }
                    />
                    <Item
                      density="compact"
                      title={t('results.addressType')}
                      subtitle={
                        <span>
                          <span className="block text-sm font-medium">
                            {result.addressType}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {describeType(result.addressType, t)}
                          </span>
                        </span>
                      }
                    />
                  </div>

                  {networkMismatch ? (
                    <AdmonitionRoot type="info">
                      <AdmonitionRow>
                        <AdmonitionIcon />
                        <AdmonitionContent>
                          <Text variant="body-bold">
                            {t('warnings.networkMismatch.title')}
                          </Text>
                          <AdmonitionText>
                            {t('warnings.networkMismatch.description', {
                              addressNetwork: result.network,
                              currentNetwork,
                            })}
                          </AdmonitionText>
                        </AdmonitionContent>
                      </AdmonitionRow>
                    </AdmonitionRoot>
                  ) : null}

                  {isCheckingNode ? (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span
                        className="size-1.5 animate-pulse rounded-full bg-primary"
                        aria-hidden
                      />
                      {t('networkValidation.checking')}
                    </p>
                  ) : null}

                  {nodeValidation ? (
                    <Card clipContent>
                      <div className="p-4">
                        <h4 className="mb-3 text-sm font-semibold">
                          {t('networkValidation.title')}
                        </h4>
                        <div className="space-y-2 text-sm">
                          <NodeRow
                            label={t('networkValidation.valid')}
                            ok={nodeValidation.isvalid}
                            common={common}
                            highlight
                          />
                        </div>
                      </div>
                    </Card>
                  ) : null}
                </div>
              ) : (
                <div className="border-t pt-4">
                  {/* Confident error panel: destructive token surface. */}
                  <Card clipContent>
                    <div className="relative overflow-hidden p-4">
                      <div
                        className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-destructive"
                        aria-hidden
                      />
                      <div className="flex items-start gap-2.5">
                        <span className="flex size-9 shrink-0 items-center justify-center text-destructive">
                          <XCircle className="size-5" />
                        </span>
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-base font-semibold text-destructive">
                            {t('results.invalid')}
                          </p>
                          <p className="text-sm text-foreground/80">
                            {result.error}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              )
            ) : null}
          </div>
        </CardBody>
      </Card>

      {/* Address reference */}
      <Card>
        <CardHeader>
          <CardTitle>{t('addressInfo.title')}</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <Item
              density="compact"
              title={t('addressInfo.mainnetP2PKH')}
              subtitle={<Code>{t('addressInfo.mainnetP2PKHExample')}</Code>}
            />
            <Item
              density="compact"
              title={t('addressInfo.mainnetP2SH')}
              subtitle={<Code>{t('addressInfo.mainnetP2SHExample')}</Code>}
            />
            <Item
              density="compact"
              title={t('addressInfo.mainnetLength')}
              subtitle={t('addressInfo.mainnetLengthValue')}
            />
            <Item
              density="compact"
              title={t('addressInfo.mainnetUsage')}
              subtitle={t('addressInfo.mainnetUsageValue')}
            />
            <Item
              density="compact"
              title={t('addressInfo.testnetP2PKH')}
              subtitle={t('addressInfo.testnetP2PKHValue')}
            />
            <Item
              density="compact"
              title={t('addressInfo.testnetP2SH')}
              subtitle={t('addressInfo.testnetP2SHValue')}
            />
            <Item
              density="compact"
              title={t('addressInfo.testnetLength')}
              subtitle={t('addressInfo.testnetLengthValue')}
            />
            <Item
              density="compact"
              title={t('addressInfo.testnetUsage')}
              subtitle={t('addressInfo.testnetUsageValue')}
            />
          </div>
        </CardBody>
      </Card>
    </View>
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
        className={cn(
          'inline-flex items-center gap-1.5 font-medium tabular-nums',
          highlight && (ok ? 'text-primary' : 'text-destructive'),
        )}
      >
        {ok ? (
          <CheckCircle2 className="size-3.5 text-primary" />
        ) : (
          <XCircle className="size-3.5 text-muted-foreground" />
        )}
        {ok ? common('yes') : common('no')}
      </span>
    </div>
  )
}
