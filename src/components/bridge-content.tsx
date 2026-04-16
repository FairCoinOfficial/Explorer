import { formatDistanceToNow } from 'date-fns'
import { formatUnits } from 'viem'
import {
  ArrowUpRight,
  Copy,
  ExternalLink,
  Github,
  Info,
  Layers,
  Pause,
  ScrollText,
  ShieldCheck,
  Waypoints,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  useWfairLiveData,
  useWfairTokenMetadata,
} from '@/hooks/use-wfair-chain-data'
import { useWfairReserves } from '@/hooks/use-wfair-reserves'
import { WFAIR_CONFIG } from '@/lib/wfair'
import { cn } from '@/lib/utils'

const FAIR_DECIMALS = 8
const WFAIR_DECIMALS = 18

function formatBigintUnits(value: bigint, decimals: number): string {
  const raw = formatUnits(value, decimals)
  const [whole, fraction = ''] = raw.split('.')
  const wholeFormatted = Number(whole).toLocaleString('en-US')
  const fractionTrimmed = fraction.replace(/0+$/, '').slice(0, 6)
  return fractionTrimmed ? `${wholeFormatted}.${fractionTrimmed}` : wholeFormatted
}

function formatSignedSats(value: bigint): string {
  const negative = value < 0n
  const abs = negative ? -value : value
  const formatted = formatBigintUnits(abs, FAIR_DECIMALS)
  return negative ? `-${formatted}` : `+${formatted}`
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

async function copyToClipboard(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  } catch (error) {
    console.error('[bridge] clipboard copy failed:', error)
    toast.error('Failed to copy')
  }
}

interface StatusTileProps {
  label: string
  value: string
  hint?: string
  tone?: 'default' | 'positive' | 'negative' | 'muted'
  icon: React.ComponentType<{ className?: string }>
}

function StatusTile({ label, value, hint, tone = 'default', icon: Icon }: StatusTileProps) {
  const toneClass =
    tone === 'positive'
      ? 'text-green-600 dark:text-green-500'
      : tone === 'negative'
        ? 'text-destructive'
        : tone === 'muted'
          ? 'text-muted-foreground'
          : 'text-foreground'

  return (
    <Card className="border">
      <CardHeader>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className={cn('text-2xl font-semibold tabular-nums', toneClass)}>{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}

export function BridgeContent() {
  const metadata = useWfairTokenMetadata()
  const live = useWfairLiveData()
  const reserves = useWfairReserves()

  const totalSupplyDisplay =
    live.data && metadata.data
      ? `${formatBigintUnits(live.data.totalSupply, metadata.data.decimals)} ${metadata.data.symbol}`
      : live.data
        ? `${formatBigintUnits(live.data.totalSupply, WFAIR_DECIMALS)} WFAIR`
        : '—'

  const pausedDisplay: { value: string; tone: StatusTileProps['tone']; hint: string } =
    live.data === undefined
      ? { value: '—', tone: 'muted', hint: 'Reading contract state' }
      : live.data.paused
        ? { value: 'Paused', tone: 'negative', hint: 'Transfers disabled' }
        : { value: 'Active', tone: 'positive', hint: 'Transfers enabled' }

  const pegDisplay: { value: string; tone: StatusTileProps['tone']; hint: string } =
    reserves.data?.status === 'ok'
      ? reserves.data.data.pegHealthy
        ? { value: 'Healthy', tone: 'positive', hint: 'Custody >= supply' }
        : { value: 'Undercollateralized', tone: 'negative', hint: 'Custody < supply' }
      : { value: 'Pending', tone: 'muted', hint: 'Bridge service not yet reachable' }

  const reservesOk = reserves.data?.status === 'ok' ? reserves.data.data : null

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Waypoints className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Wrapped FairCoin on Base</h1>
            <Badge variant="secondary" className="ml-1">Base · 8453</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            1:1 native bridge. FAIR &harr; WFAIR.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={WFAIR_CONFIG.landingUrl} target="_blank" rel="noreferrer noopener">
              Bridge UI
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={WFAIR_CONFIG.basescanUrl} target="_blank" rel="noreferrer noopener">
              Basescan
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={WFAIR_CONFIG.repoUrl} target="_blank" rel="noreferrer noopener">
              <Github className="h-4 w-4" />
              GitHub
            </a>
          </Button>
        </div>
      </div>

      {/* Status tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatusTile
          label="Total supply"
          value={live.isLoading ? '—' : totalSupplyDisplay}
          hint={live.error ? 'RPC read failed' : 'Live from Base RPC · refreshes every 30s'}
          icon={Layers}
          tone={live.error ? 'muted' : 'default'}
        />
        <StatusTile
          label="Paused"
          value={pausedDisplay.value}
          hint={pausedDisplay.hint}
          tone={pausedDisplay.tone}
          icon={Pause}
        />
        <StatusTile
          label="Peg"
          value={pegDisplay.value}
          hint={pegDisplay.hint}
          tone={pegDisplay.tone}
          icon={ShieldCheck}
        />
      </div>

      {/* Contract details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-primary" />
            Contract details
          </CardTitle>
          <CardDescription>On-chain identity of the WFAIR ERC-20 on Base mainnet.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Address</dt>
              <dd className="flex items-center gap-2">
                <a
                  href={WFAIR_CONFIG.basescanUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-mono text-sm text-primary underline-offset-4 hover:underline"
                  title={WFAIR_CONFIG.address}
                >
                  {shortAddress(WFAIR_CONFIG.address)}
                </a>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => copyToClipboard(WFAIR_CONFIG.address, 'Address')}
                  aria-label="Copy address"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Chain</dt>
              <dd className="font-mono text-sm">
                {WFAIR_CONFIG.chainName} ({WFAIR_CONFIG.chainId})
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Name</dt>
              <dd className="font-mono text-sm">{metadata.data?.name ?? 'Wrapped FairCoin'}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Symbol</dt>
              <dd className="font-mono text-sm">{metadata.data?.symbol ?? 'WFAIR'}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Decimals</dt>
              <dd className="font-mono text-sm">{metadata.data?.decimals ?? 18}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Deployed</dt>
              <dd className="font-mono text-sm">{WFAIR_CONFIG.deployedAt}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Custody & reserves */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Custody & reserves
          </CardTitle>
          <CardDescription>
            Snapshot of FAIR held in bridge custody versus WFAIR minted on Base.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reservesOk ? (
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  FAIR in custody
                </dt>
                <dd className="text-lg font-semibold tabular-nums">
                  {formatBigintUnits(BigInt(reservesOk.fairCustodySats), FAIR_DECIMALS)} FAIR
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  WFAIR supply
                </dt>
                <dd className="text-lg font-semibold tabular-nums">
                  {formatBigintUnits(BigInt(reservesOk.wfairSupplyWei), WFAIR_DECIMALS)} WFAIR
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Delta</dt>
                <dd
                  className={cn(
                    'text-lg font-semibold tabular-nums',
                    BigInt(reservesOk.deltaSats) < 0n
                      ? 'text-destructive'
                      : 'text-green-600 dark:text-green-500',
                  )}
                >
                  {formatSignedSats(BigInt(reservesOk.deltaSats))} FAIR
                </dd>
                <p className="text-xs text-muted-foreground">
                  Positive = overcollateralized · Negative = alert
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Last snapshot
                </dt>
                <dd className="text-lg font-semibold tabular-nums">
                  {formatDistanceToNow(new Date(reservesOk.at), { addSuffix: true })}
                </dd>
                <p className="text-xs text-muted-foreground">
                  {new Date(reservesOk.at).toISOString()}
                </p>
              </div>
            </dl>
          ) : (
            <div className="rounded-lg border border-dashed bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm">
                    Bridge service coming soon. Peg monitoring will light up once the bridge
                    is operational.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Source code:{' '}
                    <a
                      href={WFAIR_CONFIG.repoUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      github.com/FairCoinOfficial/faircoin-bridge
                    </a>
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            How the bridge works
          </CardTitle>
          <CardDescription>
            A 1:1 wrap: every WFAIR on Base is backed by one FAIR in custody.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                1
              </span>
              <div>
                <p className="font-medium">Deposit FAIR</p>
                <p className="text-muted-foreground">
                  Send native FAIR to the bridge custody address. The bridge service
                  observes confirmations and queues a mint.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                2
              </span>
              <div>
                <p className="font-medium">Receive WFAIR</p>
                <p className="text-muted-foreground">
                  An equivalent WFAIR amount is minted to your Base address. Use it with
                  any EVM-compatible tool on Base.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                3
              </span>
              <div>
                <p className="font-medium">Withdraw back to FAIR</p>
                <p className="text-muted-foreground">
                  Burn WFAIR on Base with a FAIR return address. The bridge releases the
                  equivalent FAIR from custody.
                </p>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-primary" />
            Links & resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            <li>
              <a
                href={WFAIR_CONFIG.basescanUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center justify-between rounded-lg border p-3 text-sm transition-colors hover:bg-muted"
              >
                <span>
                  <span className="block font-medium">Basescan contract</span>
                  <span className="block text-xs text-muted-foreground">
                    On-chain explorer view
                  </span>
                </span>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            </li>
            <li>
              <a
                href={WFAIR_CONFIG.tokenListUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center justify-between rounded-lg border p-3 text-sm transition-colors hover:bg-muted"
              >
                <span>
                  <span className="block font-medium">Token list JSON</span>
                  <span className="block text-xs text-muted-foreground">
                    Import into MetaMask or Uniswap
                  </span>
                </span>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            </li>
            <li>
              <a
                href={WFAIR_CONFIG.landingUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center justify-between rounded-lg border p-3 text-sm transition-colors hover:bg-muted"
              >
                <span>
                  <span className="block font-medium">Bridge landing</span>
                  <span className="block text-xs text-muted-foreground">
                    fairco.in — bridge UI and docs
                  </span>
                </span>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            </li>
            <li>
              <a
                href={WFAIR_CONFIG.repoUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center justify-between rounded-lg border p-3 text-sm transition-colors hover:bg-muted"
              >
                <span>
                  <span className="block font-medium">GitHub source</span>
                  <span className="block text-xs text-muted-foreground">
                    Open-source bridge implementation
                  </span>
                </span>
                <Github className="h-4 w-4 text-muted-foreground" />
              </a>
            </li>
          </ul>
          <Separator className="my-4" />
          <p className="text-xs text-muted-foreground">
            WFAIR is an ERC-20 token on Base mainnet (chain ID 8453). All chain reads go
            direct to public Base RPCs; custody snapshots come from the bridge service API.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
