import { useWfairLiveData } from '@/hooks/use-wfair-chain-data'
import { useWfairReserves } from '@/hooks/use-wfair-reserves'
import { ExplorerLink as Link } from '@/lib/explorer-navigation'
import { useTranslations } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Button } from '@oxy.so/bloom/button'
import {
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@oxy.so/bloom/card'
import { Chip } from '@oxy.so/bloom/chip'
import { Box } from '@oxy.so/bloom/skeleton'
import { ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react'

import { formatUnits } from 'viem'

const FAIR_DECIMALS = 8
const WFAIR_DECIMALS = 18

function formatBigintCompact(value: bigint, decimals: number): string {
  const whole = value / 10n ** BigInt(decimals)
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(Number(whole))
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
    peg.tone === 'healthy'
      ? ShieldCheck
      : peg.tone === 'unhealthy'
        ? ShieldAlert
        : ShieldQuestion

  const action = (
    <Chip
      size="sm"
      tone={
        peg.tone === 'healthy'
          ? 'success'
          : peg.tone === 'unhealthy'
            ? 'danger'
            : 'neutral'
      }
      leading={<PegIcon size={14} />}
    >
      {peg.label}
    </Chip>
  )

  const wfairSupply =
    live.data !== undefined
      ? `${formatBigintCompact(live.data.totalSupply, WFAIR_DECIMALS)} WFAIR`
      : null

  return (
    <Card style={{ flexGrow: 1 }}>
      <CardHeader>
        <CardTitle>{t('wfairTitle')}</CardTitle>
        {action}
      </CardHeader>
      <CardBody style={{ flexGrow: 1 }}>
        {reserves.isLoading && live.isLoading ? (
          <div className="space-y-2">
            <Box width={'100%'} height={40} />
            <Box width={'100%'} height={40} />
          </div>
        ) : (
          <dl className="flex flex-1 flex-col justify-center gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-xs text-muted-foreground">
                {t('wfairCustody')}
              </dt>
              <dd className="text-sm font-semibold tabular-nums">
                {reservesOk
                  ? `${formatBigintCompact(BigInt(reservesOk.fairCustodySats), FAIR_DECIMALS)} FAIR`
                  : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-xs text-muted-foreground">
                {t('wfairSupply')}
              </dt>
              <dd className="text-sm font-semibold tabular-nums">
                {reservesOk
                  ? `${formatBigintCompact(BigInt(reservesOk.wfairSupplyWei), WFAIR_DECIMALS)} WFAIR`
                  : (wfairSupply ?? '—')}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-xs text-muted-foreground">
                {t('wfairDelta')}
              </dt>
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
      </CardBody>
      <CardFooter>
        <Button appearance="plain" size="sm" asChild>
          <Link to="/bridge">{t('wfairViewBridge')}</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
