import { DetailHeader } from '@/components/detail/detail-header'
import { useNetwork } from '@/contexts/network-context'
import { useTranslations } from '@/lib/i18n'
import { Card, CardBody, CardHeader, CardTitle } from '@oxy.so/bloom/card'
import { Chip } from '@oxy.so/bloom/chip'
import { ChartHeader } from '@oxy.so/bloom/chart-cards'
import { EmptyState } from '@oxy.so/bloom/empty-state'
import { Field } from '@oxy.so/bloom/field'
import { Item } from '@oxy.so/bloom/item'
import { Text } from '@oxy.so/bloom/typography'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@oxy.so/bloom/select'
import { TextFieldInput as Input } from '@oxy.so/bloom/text-field'
import type { LucideIcon } from 'lucide-react'
import { Calculator, Coins, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { View } from 'react-native'

type Priority = 'low' | 'standard' | 'high' | 'priority'

// FairCoin fee structure (FAIR per KB).
const FEE_RATES: Record<Priority, number> = {
  low: 0.0001,
  standard: 0.0002,
  high: 0.0005,
  priority: 0.001,
}

const PRIORITY_ORDER: Priority[] = ['low', 'standard', 'high', 'priority']

const PRIORITY_TONE = {
  low: 'neutral',
  standard: 'accent',
  high: 'warning',
  priority: 'danger',
} as const

/**
 * Estimate transaction size in KB from the spend amount. Base tx ~250 bytes plus
 * ~180 bytes per extra input needed to cover larger amounts.
 */
function estimateTransactionSizeKB(amount: number): number {
  const baseSize = 250
  const additionalInputs = Math.floor(amount / 1000)
  return (baseSize + additionalInputs * 180) / 1000
}

export function FeeCalculatorContent() {
  const { currentNetwork } = useNetwork()
  const t = useTranslations('tools.feeCalculator')
  const [amount, setAmount] = useState('')
  const [priority, setPriority] = useState<Priority>('standard')

  const amountValue = Number.parseFloat(amount)
  const hasAmount = Number.isFinite(amountValue) && amountValue > 0

  const { estimatedFee, totalCost, sizeBytes } = useMemo(() => {
    if (!hasAmount) {
      return { estimatedFee: 0, totalCost: 0, sizeBytes: 0 }
    }
    const sizeKB = estimateTransactionSizeKB(amountValue)
    const fee = sizeKB * FEE_RATES[priority]
    return {
      estimatedFee: fee,
      totalCost: amountValue + fee,
      sizeBytes: Math.ceil(sizeKB * 1000),
    }
  }, [amountValue, hasAmount, priority])

  const priorityLabels: Record<Priority, string> = {
    low: t('lowPriority'),
    standard: t('standardPriority'),
    high: t('highPriority'),
    priority: t('instantX'),
  }

  const priorityDescriptions: Record<Priority, string> = {
    low: t('lowPriorityDescription'),
    standard: t('standardPriorityDescription'),
    high: t('highPriorityDescription'),
    priority: t('instantXDescription'),
  }

  return (
    <View style={{ gap: 16 }}>
      <DetailHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* Inputs */}
        <Card>
          <CardHeader>
            <CardTitle>{t('transactionDetails')}</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-5">
              <Field label={`${t('amount')} (FAIR)`} nativeID="amount">
                <Input
                  label={t('amount')}
                  nativeID="amount"
                  inputMode="decimal"
                  placeholder={t('amountPlaceholder')}
                  value={amount}
                  onValueChange={setAmount}
                />
              </Field>

              <Field
                label={t('feePriority')}
                description={priorityDescriptions[priority]}
              >
                <Select
                  value={priority}
                  onValueChange={(value) => setPriority(value as Priority)}
                >
                  <SelectTrigger label={t('feePriority')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    label={t('feePriority')}
                    items={PRIORITY_ORDER.map((key) => ({
                      value: key,
                      label: priorityLabels[key],
                    }))}
                    renderItem={(item) => (
                      <SelectItem value={item.value} label={item.label}>
                        {item.label}
                      </SelectItem>
                    )}
                  />
                </Select>
              </Field>

              <Item
                title={t('feeRate')}
                subtitle={`${FEE_RATES[priority]} FAIR/KB`}
              />
            </div>
          </CardBody>
        </Card>

        {/* Estimate hero */}
        <Card>
          <CardHeader>
            <CardTitle>{t('feeEstimate')}</CardTitle>
          </CardHeader>
          <CardBody>
            {hasAmount ? (
              <div className="space-y-4">
                <ChartHeader
                  label={t('estimatedFee')}
                  value={estimatedFee}
                  format={(value) => `${value.toFixed(8)} FAIR`}
                />
                <Chip tone={PRIORITY_TONE[priority]}>
                  {priorityLabels[priority]}
                </Chip>

                {/* Amount + total breakdown as sub-stat tiles. */}
                <View style={{ gap: 8 }}>
                  <BreakdownTile
                    icon={Wallet}
                    label={t('amount')}
                    value={amountValue.toFixed(8)}
                  />
                  <BreakdownTile
                    icon={Coins}
                    label={t('totalCost')}
                    value={totalCost.toFixed(8)}
                  />
                </View>

                <Card clipContent>
                  <ul className="space-y-1.5 p-3 text-xs text-muted-foreground">
                    <li className="flex gap-1.5">
                      <span className="text-primary">•</span>
                      {t('estimatedSize', { bytes: sizeBytes })}
                    </li>
                    <li className="flex gap-1.5">
                      <span className="text-primary">•</span>
                      {t('feeCalculationBased', {
                        priority: priorityLabels[priority],
                      })}
                    </li>
                    <li className="flex gap-1.5">
                      <span className="text-primary">•</span>
                      {t('actualFeesDisclaimer')}
                    </li>
                  </ul>
                </Card>
              </div>
            ) : (
              <EmptyState
                variant="compact"
                title={t('enterAmountTitle')}
                description={t('enterAmountDescription')}
                illustration={<Calculator size={28} />}
              />
            )}
          </CardBody>
        </Card>
      </div>

      {/* Fee information */}
      <Card>
        <CardHeader>
          <CardTitle>{t('feeInformation')}</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <Item
              density="compact"
              title={t('standardTransactions')}
              subtitle={t('standardMinimum')}
            />
            <Item
              density="compact"
              title={t('instantXLabel')}
              subtitle={t('nearInstantConfirmation')}
            />
            <Item
              density="compact"
              title={t('privateSendLabel')}
              subtitle={t('enhancedPrivacy')}
            />
            <Item
              density="compact"
              title={t('multiSigSupport')}
              subtitle={t('available')}
            />
            <Item
              density="compact"
              title={t('blockTime')}
              subtitle={t('blockTimeValue')}
            />
            <Item
              density="compact"
              title={t('currentNetwork')}
              subtitle={currentNetwork}
            />
            <Item
              density="compact"
              title={t('confirmationTime')}
              subtitle={t('variesByPriority')}
            />
            <Item
              density="compact"
              title={t('recommendedConfirmations')}
              subtitle={t('sixConfirmations')}
            />
          </div>
        </CardBody>
      </Card>
    </View>
  )
}

/** Compact value tile for the fee breakdown (amount / total cost). */
function BreakdownTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <Item
      title={label}
      leading={<Icon size={20} />}
      trailing={<Text>{value} FAIR</Text>}
    />
  )
}
