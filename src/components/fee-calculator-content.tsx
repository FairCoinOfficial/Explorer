import { useMemo, useState } from 'react'
import { Calculator, Coins, Gauge, Receipt, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useNetwork } from '@/contexts/network-context'
import { useTranslations } from '@/lib/i18n'
import { DetailHeader } from '@/components/detail/detail-header'
import { SectionCard } from '@/components/detail/section-card'
import { InfoGrid, InfoRow } from '@/components/detail/info-row'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
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

/** Brand gradient reused from the supply panel: primary → bright accent. */
const HERO_GRADIENT = 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))'

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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* Inputs */}
        <SectionCard title={t('transactionDetails')} icon={Coins}>
          <div className="space-y-5">
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
                className="h-11 font-mono text-base tabular-nums"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="priority" className="block text-sm font-medium">
                {t('feePriority')}
              </label>
              <Select value={priority} onValueChange={(value) => setPriority(value as Priority)}>
                <SelectTrigger id="priority" className="h-11 w-full">
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
              <div className="grid grid-cols-2 gap-2">
                {PRIORITY_ORDER.map((key) => {
                  const active = key === priority
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPriority(key)}
                      aria-pressed={active}
                      className={cn(
                        'flex flex-col gap-1.5 rounded-xl border px-3 py-2.5 text-left transition-colors',
                        active
                          ? 'border-primary/40 bg-primary/10'
                          : 'border-transparent bg-muted/60 hover:bg-muted/80',
                      )}
                    >
                      <Badge variant={active ? PRIORITY_VARIANT[key] : 'ghost'} className="self-start">
                        {priorityLabels[key]}
                      </Badge>
                      <span
                        className={cn(
                          'text-sm font-semibold tabular-nums',
                          active ? 'text-primary' : 'text-foreground',
                        )}
                      >
                        {FEE_RATES[key]} FAIR/KB
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Estimate hero */}
        <SectionCard title={t('feeEstimate')} icon={Receipt}>
          {hasAmount ? (
            <div className="space-y-4">
              {/* Hero fee figure: brand gradient panel, supply-bar treatment. */}
              <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl"
                  style={{ backgroundImage: HERO_GRADIENT }}
                  aria-hidden
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <Gauge className="size-3.5" />
                    {t('estimatedFee')}
                  </span>
                  <Badge variant={PRIORITY_VARIANT[priority]}>{priorityLabels[priority]}</Badge>
                </div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight tabular-nums text-primary sm:text-4xl">
                    {estimatedFee.toFixed(8)}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">FAIR</span>
                </div>
              </div>

              {/* Amount + total breakdown as sub-stat tiles. */}
              <dl className="grid grid-cols-2 gap-2">
                <BreakdownTile icon={Wallet} label={t('amount')} value={amountValue.toFixed(8)} />
                <BreakdownTile icon={Coins} label={t('totalCost')} value={totalCost.toFixed(8)} accent />
              </dl>

              <ul className="space-y-1.5 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
                <li className="flex gap-1.5">
                  <span className="text-primary">•</span>
                  {t('estimatedSize', { bytes: sizeBytes })}
                </li>
                <li className="flex gap-1.5">
                  <span className="text-primary">•</span>
                  {t('feeCalculationBased', { priority: priorityLabels[priority] })}
                </li>
                <li className="flex gap-1.5">
                  <span className="text-primary">•</span>
                  {t('actualFeesDisclaimer')}
                </li>
              </ul>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Calculator className="size-7" />
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold">{t('enterAmountTitle')}</p>
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

/** Compact value tile for the fee breakdown (amount / total cost). */
function BreakdownTile({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: LucideIcon
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-muted/60 px-3 py-2.5 transition-colors hover:bg-muted/80">
      <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </dt>
      <dd className="flex items-baseline gap-1">
        <span className={cn('truncate text-base font-semibold tabular-nums', accent && 'text-primary')}>
          {value}
        </span>
        <span className="text-[11px] font-medium text-muted-foreground">FAIR</span>
      </dd>
    </div>
  )
}
