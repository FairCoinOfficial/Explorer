import { useMemo, useState } from 'react'
import {
  Activity,
  AlertCircle,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Database,
  DollarSign,
  FileText,
  Info,
  Key,
  List,
  Monitor,
  Network,
  Search,
  Server,
  Settings,
  Shield,
  Terminal,
  Users,
  Vote,
  Wallet,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useNetwork } from '@/contexts/network-context'
import { useTranslations } from '@/lib/i18n'
import {
  MASTERNODE_COLLATERAL,
  REWARD_SPLIT,
  useMasternodeList,
  useMasternodes,
  type MasternodeEntry,
} from '@/hooks/use-masternodes'
import { formatNumber } from '@/lib/format'
import { DetailHeader } from '@/components/detail/detail-header'
import { SectionCard } from '@/components/detail/section-card'
import { StatTile, StatTileGrid } from '@/components/detail/stat-tile'
import { HashCell } from '@/components/detail/hash-cell'
import { RelativeTime } from '@/components/detail/relative-time'
import { CopyButton } from '@/components/copy-button'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

type Translate = (key: string, params?: Record<string, string | number>) => string

const CONFIRMATION_BLOCKS = 15

/** Brand gradient reused from the supply panel: primary → bright accent. */
const REWARD_GRADIENT = 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))'

const FAIRCOIN_CONF = `rpcuser=ANYTHINGHERE
rpcpassword=ANYTHINGHERE
listen=1
server=1
daemon=1
allowip=127.0.0.1
masternode=1
externalip=YOURIP
masternodeaddr=127.0.0.1:46372
masternodeprivkey=PRIVATEKEYREPLACETHIS`

const MASTERNODE_CONF = `mn1 127.0.0.1:46372 PRIVATEKEYREPLACETHIS INSERTYOURTXID 0`

const STEP_ICONS: LucideIcon[] = [
  Wallet,
  Network,
  Terminal,
  Key,
  Database,
  Shield,
  Settings,
  FileText,
  Monitor,
  Zap,
]

const BUDGET_STAGE_KEYS = [
  { key: 'prepare', icon: FileText },
  { key: 'submit', icon: Network },
  { key: 'voting', icon: Vote },
  { key: 'finalization', icon: Calendar },
  { key: 'budgetVoting', icon: Vote },
  { key: 'payment', icon: DollarSign },
] as const

const BUDGET_COMMAND_KEYS = [
  'prepare',
  'submit',
  'getinfo',
  'vote',
  'projection',
  'finalbudget',
] as const

const REQUIREMENT_GROUPS = [
  { key: 'hardware', icon: Server },
  { key: 'software', icon: Monitor },
  { key: 'network', icon: Network },
] as const

export function MasternodesContent() {
  const { currentNetwork } = useNetwork()
  const t = useTranslations('masternodes')
  const [activeTab, setActiveTab] = useState('overview')
  const { data: stats, refetch, isFetching } = useMasternodes()

  const activeCount = stats && stats.enabled > 0 ? formatNumber(stats.enabled) : '—'

  return (
    <div className="flex-1 space-y-4">
      <DetailHeader
        title={t('header.title')}
        subtitle={t('header.subtitle')}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching}
        action={
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <Activity className="size-3" />
            {currentNetwork.toUpperCase()}
          </span>
        }
      />

      {/* Live stats */}
      <StatTileGrid>
        <StatTile
          icon={Shield}
          label={t('stats.requiredCollateral')}
          value={`${formatNumber(MASTERNODE_COLLATERAL)} FAIR`}
          hint={t('stats.collateralHint')}
        />
        <StatTile
          icon={Users}
          label={t('stats.activeMasternodes')}
          value={activeCount}
          hint={t('stats.activeHint')}
          accent
        />
        <StatTile
          icon={Clock}
          label={t('stats.confirmationBlocks')}
          value={formatNumber(CONFIRMATION_BLOCKS)}
          hint={t('stats.confirmationHint')}
        />
        <StatTile
          icon={Coins}
          label={t('stats.rewardSplit')}
          value={`${REWARD_SPLIT.masternode}% / ${REWARD_SPLIT.staker}%`}
          hint={t('stats.rewardSplitHint')}
        />
      </StatTileGrid>

      {/* Reward distribution — premium panel */}
      <RewardPanel t={t} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
          <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
          <TabsTrigger value="list">{t('tabs.list')}</TabsTrigger>
          <TabsTrigger value="guide">{t('tabs.guide')}</TabsTrigger>
          <TabsTrigger value="budget">{t('tabs.budget')}</TabsTrigger>
          <TabsTrigger value="requirements">{t('tabs.requirements')}</TabsTrigger>
          <TabsTrigger value="troubleshooting">{t('tabs.troubleshooting')}</TabsTrigger>
        </TabsList>

        {/* Live list */}
        <TabsContent value="list" className="space-y-4">
          <MasternodeListPanel t={t} />
        </TabsContent>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <SectionCard title={t('overview.whatAreMasternodes.title')} icon={Shield}>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t('overview.whatAreMasternodes.description')}
                </p>
                <ul className="space-y-2">
                  <FeatureItem>{t('overview.whatAreMasternodes.features.security')}</FeatureItem>
                  <FeatureItem>{t('overview.whatAreMasternodes.features.instantTx')}</FeatureItem>
                  <FeatureItem>{t('overview.whatAreMasternodes.features.governance')}</FeatureItem>
                  <FeatureItem>{t('overview.whatAreMasternodes.features.rewards')}</FeatureItem>
                </ul>
              </div>
            </SectionCard>

            <SectionCard title={t('overview.benefits.title')} icon={Award}>
              <ul className="space-y-2">
                <FeatureItem>{t('overview.benefits.earnRewards')}</FeatureItem>
                <FeatureItem>{t('overview.benefits.secureNetwork')}</FeatureItem>
                <FeatureItem>{t('overview.benefits.governance')}</FeatureItem>
                <FeatureItem>{t('overview.benefits.ecosystem')}</FeatureItem>
              </ul>
            </SectionCard>
          </div>

          <Callout tone="info" icon={Info} title={t('overview.important.title')}>
            {t('overview.important.description')}
          </Callout>
        </TabsContent>

        {/* Guide */}
        <TabsContent value="guide" className="space-y-4">
          <SectionCard title={t('guide.title')} icon={Terminal}>
            <p className="text-sm text-muted-foreground">{t('guide.subtitle')}</p>
          </SectionCard>

          <div className="space-y-3">
            {STEP_ICONS.map((Icon, index) => (
              <SectionCard key={index}>
                <div className="flex items-start gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold tabular-nums text-primary ring-1 ring-primary/20">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Icon className="size-4 text-primary" />
                      <h3 className="text-sm font-semibold">{t(`guide.steps.${index}.title`)}</h3>
                    </div>
                    <p className="text-sm font-medium text-primary">
                      {t(`guide.steps.${index}.description`)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t(`guide.steps.${index}.details`)}
                    </p>
                  </div>
                </div>
              </SectionCard>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SectionCard title={t('guide.configuration.faircoinConf.title')} icon={FileText}>
              <CodeBlock code={FAIRCOIN_CONF} copyLabel={t('guide.configuration.faircoinConf.copy')} />
            </SectionCard>
            <SectionCard title={t('guide.configuration.masternodeConf.title')} icon={FileText}>
              <CodeBlock code={MASTERNODE_CONF} copyLabel={t('guide.configuration.masternodeConf.copy')} />
            </SectionCard>
          </div>

          <Callout tone="warning" icon={AlertCircle} title={t('guide.configuration.notes.title')}>
            <ul className="mt-1 space-y-1">
              <li>• {t('guide.configuration.notes.note1')}</li>
              <li>• {t('guide.configuration.notes.note2')}</li>
              <li>• {t('guide.configuration.notes.note3')}</li>
              <li>• {t('guide.configuration.notes.note4')}</li>
            </ul>
          </Callout>
        </TabsContent>

        {/* Budget */}
        <TabsContent value="budget" className="space-y-4">
          <SectionCard title={t('budget.title')} icon={Vote}>
            <p className="text-sm text-muted-foreground">{t('budget.description')}</p>
          </SectionCard>

          <SectionCard title={t('budget.sections.budgetStages')} icon={Calendar}>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {BUDGET_STAGE_KEYS.map(({ key, icon: Icon }, index) => (
                <div
                  key={key}
                  className="space-y-1.5 rounded-xl border bg-muted/50 p-3 transition-colors hover:bg-muted/70"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold tabular-nums text-primary">
                      {index + 1}
                    </span>
                    <Icon className="size-4 text-primary" />
                    {t(`budget.stages.${key}.title`)}
                  </div>
                  <p className="text-sm font-medium text-primary">
                    {t(`budget.stages.${key}.description`)}
                  </p>
                  <p className="text-xs text-muted-foreground">{t(`budget.stages.${key}.details`)}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title={t('budget.sections.budgetCommands')} icon={Terminal}>
            <div className="space-y-3">
              {BUDGET_COMMAND_KEYS.map((key) => (
                <div key={key} className="space-y-2.5 rounded-xl border bg-muted/30 p-3.5">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Terminal className="size-3.5" />
                    </span>
                    {t(`budget.commands.${key}.name`)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(`budget.commands.${key}.description`)}
                  </p>
                  <LabeledCode
                    label={t('budget.sections.example')}
                    code={t(`budget.commands.${key}.example`)}
                    copyLabel={t(`budget.commands.${key}.copy`)}
                  />
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {t('budget.sections.output')}
                    </span>
                    <div className="rounded-lg bg-background/60 p-3 font-mono text-xs break-all text-muted-foreground ring-1 ring-border/60">
                      {t(`budget.commands.${key}.output`)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <Callout tone="info" icon={Info} title={t('budget.sections.important')}>
            {t('budget.alerts.votingRequirement')}
          </Callout>
          <Callout tone="warning" icon={AlertCircle} title={t('budget.sections.warning')}>
            {t('budget.alerts.collateralWarning')}
          </Callout>
        </TabsContent>

        {/* Requirements */}
        <TabsContent value="requirements" className="space-y-4">
          <SectionCard title={t('requirements.title')} icon={Server}>
            <p className="text-sm text-muted-foreground">{t('requirements.subtitle')}</p>
          </SectionCard>

          <div className="grid gap-4 lg:grid-cols-3">
            {REQUIREMENT_GROUPS.map(({ key, icon }) => (
              <SectionCard key={key} title={t(`requirements.${key}.title`)} icon={icon}>
                <ul className="space-y-2.5">
                  {[0, 1, 2, 3].map((index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span className="text-sm text-muted-foreground">
                        {t(`requirements.${key}.items.${index}`)}
                      </span>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            ))}
          </div>

          <Callout tone="info" icon={Info} title={t('requirements.title')}>
            {t('requirements.note')}
          </Callout>
        </TabsContent>

        {/* Troubleshooting */}
        <TabsContent value="troubleshooting" className="space-y-4">
          <SectionCard title={t('troubleshooting.title')} icon={AlertCircle}>
            <p className="text-sm text-muted-foreground">{t('troubleshooting.subtitle')}</p>
          </SectionCard>

          <div className="space-y-3">
            {[0, 1, 2, 3].map((index) => (
              <SectionCard key={index}>
                <div className="flex items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <AlertCircle className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <h4 className="text-sm font-semibold">
                      {t(`troubleshooting.issues.${index}.issue`)}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {t(`troubleshooting.issues.${index}.solution`)}
                    </p>
                  </div>
                </div>
              </SectionCard>
            ))}
          </div>

          <Callout tone="info" icon={Info} title={t('troubleshooting.help.title')}>
            {t('troubleshooting.help.description')}
          </Callout>
        </TabsContent>
      </Tabs>
    </div>
  )
}

const LIST_PAGE_SIZE = 25

function formatActiveDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—'
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3_600)
  if (days > 0) return `${days}d ${hours}h`
  const minutes = Math.floor((seconds % 3_600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function MasternodeListPanel({ t }: { t: Translate }) {
  const common = useTranslations('common')
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const offset = (page - 1) * LIST_PAGE_SIZE
  const { data, isLoading, isError, error, isFetching, refetch } = useMasternodeList(
    LIST_PAGE_SIZE,
    offset,
  )

  const filtered = useMemo(() => {
    const rows = data?.masternodes ?? []
    const query = searchQuery.trim().toLowerCase()
    if (!query) return rows
    return rows.filter((mn) => {
      return (
        mn.address.toLowerCase().includes(query) ||
        mn.txid.toLowerCase().includes(query) ||
        mn.status.toLowerCase().includes(query) ||
        String(mn.rank).includes(query)
      )
    })
  }, [data?.masternodes, searchQuery])

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / LIST_PAGE_SIZE))

  if (isLoading) {
    return (
      <SectionCard title={t('list.title')} icon={List}>
        <div className="space-y-2 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </SectionCard>
    )
  }

  if (isError || !data) {
    return (
      <SectionCard title={t('list.title')} icon={List}>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="size-6" />
          </span>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : t('list.error')}
          </p>
          <Button variant="outline" onClick={() => void refetch()}>
            {common('tryAgain')}
          </Button>
        </div>
      </SectionCard>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative w-full sm:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('list.searchPlaceholder')}
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value)
            setPage(1)
          }}
          className="w-full pl-10"
        />
      </div>
      {searchQuery.trim() ? (
        <p className="text-xs text-muted-foreground">{t('list.filterPageOnly')}</p>
      ) : null}

      <SectionCard
        title={t('list.title')}
        icon={List}
        flush
        action={
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {formatNumber(total)}
          </span>
        }
      >
        {filtered.length > 0 ? (
          <>
            <div className="hidden items-center gap-3 border-b px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground lg:flex">
              <span className="w-12">{t('list.rank')}</span>
              <span className="flex-1">{t('list.status')}</span>
              <span className="w-40">{t('list.address')}</span>
              <span className="w-28 text-right">{t('list.active')}</span>
              <span className="w-28 text-right">{t('list.lastSeen')}</span>
              <span className="min-w-0 flex-1">{t('list.collateral')}</span>
            </div>
            <ul className="divide-y">
              {filtered.map((mn) => (
                <MasternodeRow key={`${mn.txid}:${mn.outidx}`} mn={mn} t={t} />
              ))}
            </ul>
          </>
        ) : (
          <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 px-4 py-8 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Users className="size-5" />
            </span>
            <p className="text-sm text-muted-foreground">{t('list.empty')}</p>
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
            <span className="text-xs text-muted-foreground tabular-nums">
              {common('page', { current: page, total: totalPages })}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {common('previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || isFetching}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                {common('next')}
              </Button>
            </div>
          </div>
        ) : null}
      </SectionCard>
    </div>
  )
}

function MasternodeRow({ mn, t }: { mn: MasternodeEntry; t: Translate }) {
  const enabled = mn.status.toUpperCase() === 'ENABLED'
  return (
    <li className="flex flex-col gap-2 px-4 py-3 lg:flex-row lg:items-center lg:gap-3">
      <span className="w-12 font-mono text-sm tabular-nums text-muted-foreground">
        #{formatNumber(mn.rank)}
      </span>
      <span
        className={cn(
          'inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium lg:w-28',
          enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
        )}
      >
        {mn.status || t('list.unknownStatus')}
      </span>
      <div className="min-w-0 flex-1">
        {mn.address ? (
          <HashCell value={mn.address} to="address" textClassName="text-sm" />
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </div>
      <span className="w-28 text-sm tabular-nums text-muted-foreground lg:text-right">
        {formatActiveDuration(mn.activeTime)}
      </span>
      <span className="w-28 text-sm text-muted-foreground lg:text-right">
        {mn.lastSeen > 0 ? <RelativeTime timestamp={mn.lastSeen} /> : '—'}
      </span>
      <div className="min-w-0 flex-1">
        {mn.txid ? (
          <HashCell value={mn.txid} to="tx" textClassName="text-xs text-muted-foreground" />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>
    </li>
  )
}

/**
 * Premium reward-distribution panel modelled on the home supply bar: a hero
 * collateral figure, a single dual-fill gradient bar that reads the 50/50 split
 * at a glance, and richer per-share sub-stat tiles. All token-coloured.
 */
function RewardPanel({ t }: { t: Translate }) {
  const total = REWARD_SPLIT.masternode + REWARD_SPLIT.staker
  const masternodePct = total > 0 ? (REWARD_SPLIT.masternode / total) * 100 : 0
  const stakerPct = 100 - masternodePct

  return (
    <section className="relative overflow-hidden rounded-2xl border bg-muted/30 p-4 sm:p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Coins className="size-4" />
          </span>
          <h3 className="text-sm font-semibold tracking-tight">{t('rewards.title')}</h3>
        </div>
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium tabular-nums text-primary">
          {REWARD_SPLIT.masternode}% / {REWARD_SPLIT.staker}%
        </span>
      </header>

      {/* Hero figure: locked collateral against per-block split context. */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
            {formatNumber(MASTERNODE_COLLATERAL)}
          </span>
          <span className="text-sm font-medium text-muted-foreground">FAIR</span>
        </div>
        <span className="text-xs text-muted-foreground">{t('stats.collateralHint')}</span>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">{t('rewards.description')}</p>

      {/* Single split bar: masternode (primary→accent gradient) vs staker (muted). */}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(masternodePct)}
        aria-label={t('rewards.title')}
        className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="relative h-full transition-[width] duration-500 ease-out"
          style={{ width: `${masternodePct}%`, backgroundImage: REWARD_GRADIENT }}
        >
          <span className="absolute inset-y-0 right-0 w-1.5 bg-accent" aria-hidden />
        </div>
        <div className="h-full flex-1 bg-primary/25" />
      </div>

      {/* Per-share sub-stat tiles. */}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <RewardShareTile
          icon={Server}
          label={t('rewards.masternodeShare')}
          percent={REWARD_SPLIT.masternode}
          tone="primary"
        />
        <RewardShareTile
          icon={Wallet}
          label={t('rewards.stakerShare')}
          percent={REWARD_SPLIT.staker}
          tone="muted"
        />
      </div>

      {/* Hidden-but-present staker fraction keeps the split self-describing. */}
      <span className="sr-only">{stakerPct}%</span>
    </section>
  )
}

function RewardShareTile({
  icon: Icon,
  label,
  percent,
  tone,
}: {
  icon: LucideIcon
  label: string
  percent: number
  tone: 'primary' | 'muted'
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-3 transition-colors hover:bg-muted/80">
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full',
          tone === 'primary' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="flex items-baseline gap-1">
          <span
            className={cn(
              'text-xl font-bold tabular-nums',
              tone === 'primary' ? 'text-primary' : 'text-foreground',
            )}
          >
            {percent}%
          </span>
        </p>
      </div>
    </div>
  )
}

function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-muted-foreground">
      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
      <span>{children}</span>
    </li>
  )
}

function CodeBlock({ code, copyLabel }: { code: string; copyLabel: string }) {
  return (
    <div className="space-y-2">
      <pre className="overflow-x-auto rounded-lg bg-background/60 p-4 font-mono text-xs whitespace-pre-wrap break-all ring-1 ring-border/60">
        {code}
      </pre>
      <CopyButton text={code} label={copyLabel} className="w-full" />
    </div>
  )
}

function LabeledCode({
  label,
  code,
  copyLabel,
}: {
  label: string
  code: string
  copyLabel: string
}) {
  return (
    <div className="space-y-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex items-start gap-2">
        <code className="flex-1 overflow-x-auto rounded-lg bg-background/60 p-3 font-mono text-xs break-all ring-1 ring-border/60">
          {code}
        </code>
        <CopyButton text={code} label={copyLabel} hideLabel className="shrink-0" />
      </div>
    </div>
  )
}

function Callout({
  tone,
  icon: Icon,
  title,
  children,
}: {
  tone: 'info' | 'warning' | 'danger'
  icon: LucideIcon
  title: string
  children: React.ReactNode
}) {
  const toneClass =
    tone === 'danger'
      ? 'border-destructive/30 bg-destructive/10 text-destructive'
      : 'border-primary/30 bg-primary/10 text-primary'

  return (
    <div className={cn('flex items-start gap-2 rounded-xl border p-4', toneClass)}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="space-y-1 text-sm">
        <p className="font-semibold">{title}</p>
        <div className="text-foreground/80">{children}</div>
      </div>
    </div>
  )
}
