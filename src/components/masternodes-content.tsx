import { useState } from 'react'
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
  Monitor,
  Network,
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
  useMasternodes,
} from '@/hooks/use-masternodes'
import { formatNumber } from '@/lib/format'
import { DetailHeader } from '@/components/detail/detail-header'
import { SectionCard } from '@/components/detail/section-card'
import { StatTile, StatTileGrid } from '@/components/detail/stat-tile'
import { ProgressBar } from '@/components/detail/progress-bar'
import { CopyButton } from '@/components/copy-button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Translate = (key: string, params?: Record<string, string | number>) => string

const CONFIRMATION_BLOCKS = 15

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
    <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
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

      {/* Reward distribution */}
      <SectionCard title={t('rewards.title')} icon={Coins}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('rewards.description')}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <RewardShare
              label={t('rewards.masternodeShare')}
              percent={REWARD_SPLIT.masternode}
              icon={Server}
            />
            <RewardShare
              label={t('rewards.stakerShare')}
              percent={REWARD_SPLIT.staker}
              icon={Wallet}
            />
          </div>
        </div>
      </SectionCard>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
          <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
          <TabsTrigger value="guide">{t('tabs.guide')}</TabsTrigger>
          <TabsTrigger value="budget">{t('tabs.budget')}</TabsTrigger>
          <TabsTrigger value="requirements">{t('tabs.requirements')}</TabsTrigger>
          <TabsTrigger value="troubleshooting">{t('tabs.troubleshooting')}</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <SectionCard title={t('overview.whatAreMasternodes.title')} icon={Shield}>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t('overview.whatAreMasternodes.description')}
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• {t('overview.whatAreMasternodes.features.security')}</li>
                  <li>• {t('overview.whatAreMasternodes.features.instantTx')}</li>
                  <li>• {t('overview.whatAreMasternodes.features.governance')}</li>
                  <li>• {t('overview.whatAreMasternodes.features.rewards')}</li>
                </ul>
              </div>
            </SectionCard>

            <SectionCard title={t('overview.benefits.title')} icon={Award}>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• {t('overview.benefits.earnRewards')}</li>
                <li>• {t('overview.benefits.secureNetwork')}</li>
                <li>• {t('overview.benefits.governance')}</li>
                <li>• {t('overview.benefits.ecosystem')}</li>
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
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
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
              {BUDGET_STAGE_KEYS.map(({ key, icon: Icon }) => (
                <div key={key} className="space-y-1 rounded-lg bg-muted/60 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
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
            <div className="space-y-4">
              {BUDGET_COMMAND_KEYS.map((key) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Terminal className="size-4 text-primary" />
                    {t(`budget.commands.${key}.name`)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(`budget.commands.${key}.description`)}
                  </p>
                  <div className="space-y-2">
                    <LabeledCode
                      label={t('budget.sections.example')}
                      code={t(`budget.commands.${key}.example`)}
                      copyLabel={t(`budget.commands.${key}.copy`)}
                    />
                    <div className="space-y-1">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t('budget.sections.output')}
                      </span>
                      <div className="rounded-lg bg-muted/60 p-4 font-mono text-xs break-all">
                        {t(`budget.commands.${key}.output`)}
                      </div>
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
                <ul className="space-y-2">
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
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-primary" />
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

function RewardShare({
  label,
  percent,
  icon: Icon,
}: {
  label: string
  percent: number
  icon: LucideIcon
}) {
  return (
    <div className="space-y-2 rounded-lg bg-muted/60 p-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Icon className="size-4 text-primary" />
          {label}
        </span>
        <span className="text-sm font-semibold tabular-nums text-primary">{percent}%</span>
      </div>
      <ProgressBar value={percent / 100} label={label} />
    </div>
  )
}

function CodeBlock({ code, copyLabel }: { code: string; copyLabel: string }) {
  return (
    <div className="space-y-2">
      <pre className="overflow-x-auto rounded-lg bg-muted/60 p-4 font-mono text-xs whitespace-pre-wrap break-all">
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
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex items-start gap-2">
        <code className="flex-1 overflow-x-auto rounded-lg bg-muted/60 p-4 font-mono text-xs break-all">
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
    <div className={`flex items-start gap-2 rounded-xl border p-4 ${toneClass}`}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="space-y-1 text-sm">
        <p className="font-semibold">{title}</p>
        <div className="text-foreground/80">{children}</div>
      </div>
    </div>
  )
}
