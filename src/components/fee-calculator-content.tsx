import { useMemo, useState } from 'react'
import { Calculator, Coins, Gauge, Receipt, Wallet } from 'lucide-react'
import { useNetwork } from '@/contexts/network-context'
import { useTranslations } from '@/lib/i18n'
import { DetailHeader } from '@/components/detail/detail-header'
import { SectionCard } from '@/components/detail/section-card'
import { StatTile, StatTileGrid } from '@/components/detail/stat-tile'
import { InfoGrid, InfoRow } from '@/components/detail/info-row'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Priority = 'low' | 'standard' | 'high' | 'priority'

// FairCoin fee structure (FAIR per KB).
const FEE_RATES: Record<Priority, number> = {
  low: 0.0001,
  standard: 0.0002,
  high: 0.0005,
  priority: 0.001,
}

const PRIORITY_ORDER: Priority[] = ['low', 'standard', 'high', 'priority']

// Semantic Badge variant per priority — token-driven, no hardcoded colours.
const PRIORITY_VARIANT: Record<Priority, 'secondary' | 'default' | 'outline' | 'destructive'> = {
  low: 'secondary',
  standard: 'default',
  high: 'outline',
  priority: 'destructive',
}

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
    <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
      <DetailHeader
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <Calculator className="size-3" />
            {currentNetwork.toUpperCase()}
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Inputs */}
        <SectionCard title={t('transactionDetails')} icon={Coins}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="amount" className="block text-sm font-medium">
                {t('amount')} (FAIR)
              </label>
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                placeholder={t('amountPlaceholder')}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                min="0"
                step="0.00000001"
                className="font-mono tabular-nums"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="priority" className="block text-sm font-medium">
                {t('feePriority')}
              </label>
              <Select value={priority} onValueChange={(value) => setPriority(value as Priority)}>
                <SelectTrigger id="priority" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_ORDER.map((key) => (
                    <SelectItem key={key} value={key}>
                      {priorityLabels[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">{priorityDescriptions[priority]}</p>
            </div>

            <div className="space-y-2">
              <span className="block text-sm font-medium">{t('feeRate')}</span>
              <div className="flex flex-wrap gap-1.5">
                {PRIORITY_ORDER.map((key) => (
                  <Badge
                    key={key}
                    variant={key === priority ? PRIORITY_VARIANT[key] : 'ghost'}
                    asChild
                  >
                    <button type="button" onClick={() => setPriority(key)}>
                      {priorityLabels[key]} · {FEE_RATES[key]} FAIR/KB
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Estimate */}
        <SectionCard title={t('feeEstimate')} icon={Receipt}>
          {hasAmount ? (
            <div className="space-y-4">
              <StatTileGrid className="grid-cols-1 sm:grid-cols-3 lg:grid-cols-3">
                <StatTile
                  icon={Wallet}
                  label={t('amount')}
                  value={`${amountValue.toFixed(8)} FAIR`}
                />
                <StatTile
                  icon={Gauge}
                  label={t('estimatedFee')}
                  value={`${estimatedFee.toFixed(8)} FAIR`}
                  accent
                />
                <StatTile
                  icon={Coins}
                  label={t('totalCost')}
                  value={`${totalCost.toFixed(8)} FAIR`}
                />
              </StatTileGrid>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>• {t('estimatedSize', { bytes: sizeBytes })}</li>
                <li>• {t('feeCalculationBased', { priority: priorityLabels[priority] })}</li>
                <li>• {t('actualFeesDisclaimer')}</li>
              </ul>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Calculator className="size-6" />
              </span>
              <div className="space-y-1">
                <p className="text-sm font-medium">{t('enterAmountTitle')}</p>
                <p className="text-sm text-muted-foreground">{t('enterAmountDescription')}</p>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Fee information */}
      <SectionCard title={t('feeInformation')} icon={Receipt}>
        <InfoGrid columns={2}>
          <InfoRow label={t('standardTransactions')} value={t('standardMinimum')} />
          <InfoRow label={t('instantXLabel')} value={t('nearInstantConfirmation')} />
          <InfoRow label={t('privateSendLabel')} value={t('enhancedPrivacy')} />
          <InfoRow label={t('multiSigSupport')} value={t('available')} />
          <InfoRow label={t('blockTime')} value={t('blockTimeValue')} />
          <InfoRow label={t('currentNetwork')} value={currentNetwork} />
          <InfoRow label={t('confirmationTime')} value={t('variesByPriority')} />
          <InfoRow label={t('recommendedConfirmations')} value={t('sixConfirmations')} />
        </InfoGrid>
      </SectionCard>
    </div>
  )
}
