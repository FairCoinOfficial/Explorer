import { formatUnits } from 'viem'
import { Waypoints, ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { useWfairReserves } from '@/hooks/use-wfair-reserves'
import { useWfairLiveData } from '@/hooks/use-wfair-chain-data'
import { ModuleCard } from '@/components/home/module-card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const FAIR_DECIMALS = 8
const WFAIR_DECIMALS = 18

function formatBigintCompact(value: bigint, decimals: number): string {
  const whole = value / 10n ** BigInt(decimals)
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(
    Number(whole),
  )
}

type PegTone = 'healthy' | 'unhealthy' | 'pending'

export function WfairCard() {
  const t = useTranslations('home')
  const reserves = useWfairReserves()
  const live = useWfairLiveData()

  const reservesOk = reserves.data?.status === 'ok' ? reserves.data.data : null

  const peg: { tone: PegTone; label: string } = reservesOk
    ? reservesOk.pegHealthy
      ? { tone: 'healthy', label: t('wfairPegHealthy') }
      : { tone: 'unhealthy', label: t('wfairPegUnhealthy') }
    : { tone: 'pending', label: t('wfairPegPending') }

  const PegIcon =
    peg.tone === 'healthy' ? ShieldCheck : peg.tone === 'unhealthy' ? ShieldAlert : ShieldQuestion

  const action = (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        peg.tone === 'healthy' && 'bg-primary/10 text-primary',
        peg.tone === 'unhealthy' && 'bg-destructive/10 text-destructive',
        peg.tone === 'pending' && 'bg-muted/70 text-muted-foreground',
      )}
    >
      <PegIcon className="size-3" />
      {peg.label}
    </span>
  )

  const wfairSupply =
    live.data !== undefined
      ? `${formatBigintCompact(live.data.totalSupply, WFAIR_DECIMALS)} WFAIR`
      : null

  return (
    <ModuleCard
      title={t('wfairTitle')}
      icon={Waypoints}
      action={action}
      href="/bridge"
      footerLabel={t('wfairViewBridge')}
    >
      {reserves.isLoading && live.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <dl className="flex flex-1 flex-col justify-center gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-xs text-muted-foreground">{t('wfairCustody')}</dt>
            <dd className="text-sm font-semibold tabular-nums">
              {reservesOk
                ? `${formatBigintCompact(BigInt(reservesOk.fairCustodySats), FAIR_DECIMALS)} FAIR`
                : '—'}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-xs text-muted-foreground">{t('wfairSupply')}</dt>
            <dd className="text-sm font-semibold tabular-nums">
              {reservesOk
                ? `${formatBigintCompact(BigInt(reservesOk.wfairSupplyWei), WFAIR_DECIMALS)} WFAIR`
                : (wfairSupply ?? '—')}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-xs text-muted-foreground">{t('wfairDelta')}</dt>
            <dd
              className={cn(
                'text-sm font-semibold tabular-nums',
                reservesOk && BigInt(reservesOk.deltaSats) < 0n
                  ? 'text-destructive'
                  : 'text-primary',
              )}
            >
              {reservesOk
                ? `${BigInt(reservesOk.deltaSats) < 0n ? '' : '+'}${formatUnits(
                    BigInt(reservesOk.deltaSats),
                    FAIR_DECIMALS,
                  )}`
                : t('wfairPegPending')}
            </dd>
          </div>
        </dl>
      )}
    </ModuleCard>
  )
}
