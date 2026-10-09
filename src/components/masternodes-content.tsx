import { DetailHeader } from '@/components/detail/detail-header'
import { HashCell } from '@/components/detail/hash-cell'
import { RelativeTime } from '@/components/detail/relative-time'
import {
  MASTERNODE_COLLATERAL,
  REWARD_SPLIT,
  useMasternodeList,
  useMasternodes,
  type MasternodeEntry,
} from '@/hooks/use-masternodes'
import { formatNumber } from '@/lib/format'
import { useTranslations } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import {
  AdmonitionContent,
  AdmonitionIcon,
  AdmonitionRoot,
  AdmonitionRow,
  AdmonitionText,
} from '@oxy.so/bloom/admonition'
import { Card, CardBody, CardHeader, CardTitle } from '@oxy.so/bloom/card'
import { CodeBlock } from '@oxy.so/bloom/code'
import { EmptyState } from '@oxy.so/bloom/empty-state'
import { Item } from '@oxy.so/bloom/item'
import { Pagination } from '@oxy.so/bloom/pagination'
import { Box } from '@oxy.so/bloom/skeleton'
import { StatBar } from '@oxy.so/bloom/stat-bar'
import { StatCards } from '@oxy.so/bloom/stat-cards'
import { Tabs, TabsTrigger } from '@oxy.so/bloom/tabs'
import { TextFieldInput as Input } from '@oxy.so/bloom/text-field'
import { Text } from '@oxy.so/bloom/typography'
import type { LucideIcon } from 'lucide-react'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Database,
  DollarSign,
  FileText,
  Key,
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
import { useMemo, useState } from 'react'
import { View } from 'react-native'

type Translate = (
  key: string,
  params?: Record<string, string | number>,
) => string

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
  const t = useTranslations('masternodes')
  const [activeTab, setActiveTab] = useState('overview')
  const { data: stats, refetch, isFetching } = useMasternodes()

  const activeCount =
    stats && stats.enabled > 0 ? formatNumber(stats.enabled) : '—'

  return (
    <View style={{ gap: 16 }}>
      <DetailHeader
        title={t('header.title')}
        subtitle={t('header.subtitle')}
        onRefresh={() => void refetch()}
        isRefreshing={isFetching}
      />

      {/* Live stats */}
      <StatCards
        stats={[
          {
            label: t('stats.requiredCollateral'),
            value: `${formatNumber(MASTERNODE_COLLATERAL)} FAIR`,
            icon: (props) => (
              <Shield
                width={props.width}
                height={props.height}
                color={props.fill}
              />
            ),
            delta: '—',
            deltaColor: 'neutral',
            hint: t('stats.collateralHint'),
          },
          {
            label: t('stats.activeMasternodes'),
            value: activeCount,
            icon: (props) => (
              <Users
                width={props.width}
                height={props.height}
                color={props.fill}
              />
            ),
            delta: '—',
            deltaColor: 'neutral',
            hint: t('stats.activeHint'),
          },
          {
            label: t('stats.confirmationBlocks'),
            value: formatNumber(CONFIRMATION_BLOCKS),
            icon: (props) => (
              <Clock
                width={props.width}
                height={props.height}
                color={props.fill}
              />
            ),
            delta: '—',
            deltaColor: 'neutral',
            hint: t('stats.confirmationHint'),
          },
          {
            label: t('stats.rewardSplit'),
            value: `${REWARD_SPLIT.masternode}% / ${REWARD_SPLIT.staker}%`,
            icon: (props) => (
              <Coins
                width={props.width}
                height={props.height}
                color={props.fill}
              />
            ),
            delta: '—',
            deltaColor: 'neutral',
            hint: t('stats.rewardSplitHint'),
          },
        ]}
      />

      {/* Reward distribution */}
      <RewardPanel t={t} />

      <div className="w-full space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsTrigger value="overview" label={t('tabs.overview')} />
          <TabsTrigger value="list" label={t('tabs.list')} />
          <TabsTrigger value="guide" label={t('tabs.guide')} />
          <TabsTrigger value="budget" label={t('tabs.budget')} />
          <TabsTrigger value="requirements" label={t('tabs.requirements')} />
          <TabsTrigger
            value="troubleshooting"
            label={t('tabs.troubleshooting')}
          />
        </Tabs>

        {/* Live list */}
        {activeTab === 'list' && (
          <div className="space-y-4">
            <MasternodeListPanel t={t} />
          </div>
        )}

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {t('overview.whatAreMasternodes.title')}
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {t('overview.whatAreMasternodes.description')}
                    </p>
                    <ul className="space-y-2">
                      <FeatureItem>
                        {t('overview.whatAreMasternodes.features.security')}
                      </FeatureItem>
                      <FeatureItem>
                        {t('overview.whatAreMasternodes.features.instantTx')}
                      </FeatureItem>
                      <FeatureItem>
                        {t('overview.whatAreMasternodes.features.governance')}
                      </FeatureItem>
                      <FeatureItem>
                        {t('overview.whatAreMasternodes.features.rewards')}
                      </FeatureItem>
                    </ul>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t('overview.benefits.title')}</CardTitle>
                </CardHeader>
                <CardBody>
                  <ul className="space-y-2">
                    <FeatureItem>
                      {t('overview.benefits.earnRewards')}
                    </FeatureItem>
                    <FeatureItem>
                      {t('overview.benefits.secureNetwork')}
                    </FeatureItem>
                    <FeatureItem>
                      {t('overview.benefits.governance')}
                    </FeatureItem>
                    <FeatureItem>
                      {t('overview.benefits.ecosystem')}
                    </FeatureItem>
                  </ul>
                </CardBody>
              </Card>
            </div>

            <AdmonitionRoot type="info">
              <AdmonitionRow>
                <AdmonitionIcon />
                <AdmonitionContent>
                  <Text variant="body-bold">
                    {t('overview.important.title')}
                  </Text>
                  <AdmonitionText>
                    {t('overview.important.description')}
                  </AdmonitionText>
                </AdmonitionContent>
              </AdmonitionRow>
            </AdmonitionRoot>
          </div>
        )}

        {/* Guide */}
        {activeTab === 'guide' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('guide.title')}</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-muted-foreground">
                  {t('guide.subtitle')}
                </p>
              </CardBody>
            </Card>

            <div className="space-y-3">
              {STEP_ICONS.map((Icon, index) => (
                <Card key={index}>
                  <CardBody>
                    <div className="flex items-start gap-4">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold tabular-nums text-primary ring-1 ring-primary/20">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Icon className="size-4 text-primary" />
                          <h3 className="text-sm font-semibold">
                            {t(`guide.steps.${index}.title`)}
                          </h3>
                        </div>
                        <p className="text-sm font-medium text-primary">
                          {t(`guide.steps.${index}.description`)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t(`guide.steps.${index}.details`)}
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {t('guide.configuration.faircoinConf.title')}
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  <CodeBlock
                    code={FAIRCOIN_CONF}
                    labels={{
                      copy: t('guide.configuration.faircoinConf.copy'),
                    }}
                    wrap
                    lineNumbers={false}
                  />
                </CardBody>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {t('guide.configuration.masternodeConf.title')}
                  </CardTitle>
                </CardHeader>
                <CardBody>
                  <CodeBlock
                    code={MASTERNODE_CONF}
                    labels={{
                      copy: t('guide.configuration.masternodeConf.copy'),
                    }}
                    wrap
                    lineNumbers={false}
                  />
                </CardBody>
              </Card>
            </div>

            <AdmonitionRoot type="warning">
              <AdmonitionRow>
                <AdmonitionIcon />
                <AdmonitionContent>
                  <Text variant="body-bold">
                    {t('guide.configuration.notes.title')}
                  </Text>
                  <ul className="mt-1 space-y-1">
                    <li>• {t('guide.configuration.notes.note1')}</li>
                    <li>• {t('guide.configuration.notes.note2')}</li>
                    <li>• {t('guide.configuration.notes.note3')}</li>
                    <li>• {t('guide.configuration.notes.note4')}</li>
                  </ul>
                </AdmonitionContent>
              </AdmonitionRow>
            </AdmonitionRoot>
          </div>
        )}

        {/* Budget */}
        {activeTab === 'budget' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('budget.title')}</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-muted-foreground">
                  {t('budget.description')}
                </p>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('budget.sections.budgetStages')}</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {BUDGET_STAGE_KEYS.map(({ key, icon: Icon }, index) => (
                    <Card clipContent key={key}>
                      <div className="space-y-1.5 p-3">
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
                        <p className="text-xs text-muted-foreground">
                          {t(`budget.stages.${key}.details`)}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('budget.sections.budgetCommands')}</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  {BUDGET_COMMAND_KEYS.map((key) => (
                    <Card clipContent key={key}>
                      <div className="space-y-2.5 p-3.5">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <span className="flex size-6 shrink-0 items-center justify-center text-primary">
                            <Terminal className="size-3.5" />
                          </span>
                          {t(`budget.commands.${key}.name`)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {t(`budget.commands.${key}.description`)}
                        </p>
                        <CodeBlock
                          filename={t('budget.sections.example')}
                          code={t(`budget.commands.${key}.example`)}
                          labels={{ copy: t(`budget.commands.${key}.copy`) }}
                          wrap
                          lineNumbers={false}
                        />
                        <div className="space-y-1">
                          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            {t('budget.sections.output')}
                          </span>
                          <Card clipContent>
                            <div className="p-3 font-mono text-xs break-all text-muted-foreground">
                              {t(`budget.commands.${key}.output`)}
                            </div>
                          </Card>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardBody>
            </Card>

            <AdmonitionRoot type="info">
              <AdmonitionRow>
                <AdmonitionIcon />
                <AdmonitionContent>
                  <Text variant="body-bold">
                    {t('budget.sections.important')}
                  </Text>
                  <AdmonitionText>
                    {t('budget.alerts.votingRequirement')}
                  </AdmonitionText>
                </AdmonitionContent>
              </AdmonitionRow>
            </AdmonitionRoot>
            <AdmonitionRoot type="warning">
              <AdmonitionRow>
                <AdmonitionIcon />
                <AdmonitionContent>
                  <Text variant="body-bold">
                    {t('budget.sections.warning')}
                  </Text>
                  <AdmonitionText>
                    {t('budget.alerts.collateralWarning')}
                  </AdmonitionText>
                </AdmonitionContent>
              </AdmonitionRow>
            </AdmonitionRoot>
          </div>
        )}

        {/* Requirements */}
        {activeTab === 'requirements' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('requirements.title')}</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-muted-foreground">
                  {t('requirements.subtitle')}
                </p>
              </CardBody>
            </Card>

            <div className="grid gap-4 lg:grid-cols-3">
              {REQUIREMENT_GROUPS.map(({ key }) => (
                <Card key={key}>
                  <CardHeader>
                    <CardTitle>{t(`requirements.${key}.title`)}</CardTitle>
                  </CardHeader>
                  <CardBody>
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
                  </CardBody>
                </Card>
              ))}
            </div>

            <AdmonitionRoot type="info">
              <AdmonitionRow>
                <AdmonitionIcon />
                <AdmonitionContent>
                  <Text variant="body-bold">{t('requirements.title')}</Text>
                  <AdmonitionText>{t('requirements.note')}</AdmonitionText>
                </AdmonitionContent>
              </AdmonitionRow>
            </AdmonitionRoot>
          </div>
        )}

        {/* Troubleshooting */}
        {activeTab === 'troubleshooting' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('troubleshooting.title')}</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-muted-foreground">
                  {t('troubleshooting.subtitle')}
                </p>
              </CardBody>
            </Card>

            <div className="space-y-3">
              {[0, 1, 2, 3].map((index) => (
                <Card key={index}>
                  <CardBody>
                    <div className="flex items-start gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center text-primary">
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
                  </CardBody>
                </Card>
              ))}
            </div>

            <AdmonitionRoot type="info">
              <AdmonitionRow>
                <AdmonitionIcon />
                <AdmonitionContent>
                  <Text variant="body-bold">
                    {t('troubleshooting.help.title')}
                  </Text>
                  <AdmonitionText>
                    {t('troubleshooting.help.description')}
                  </AdmonitionText>
                </AdmonitionContent>
              </AdmonitionRow>
            </AdmonitionRoot>
          </div>
        )}
      </div>
    </View>
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
  const { data, isLoading, isError, error, isFetching, refetch } =
    useMasternodeList(LIST_PAGE_SIZE, offset)

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
      <Card>
        <CardHeader>
          <CardTitle>{t('list.title')}</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Box key={i} width={'100%'} height={40} />
            ))}
          </div>
        </CardBody>
      </Card>
    )
  }

  if (isError || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('list.title')}</CardTitle>
        </CardHeader>
        <CardBody>
          <EmptyState
            variant="compact"
            title={common('error')}
            description={
              error instanceof Error ? error.message : t('list.error')
            }
            illustration={<AlertCircle size={28} />}
            action={{
              label: common('tryAgain'),
              onPress: () => void refetch(),
            }}
          />
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative w-full sm:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          label={t('searchPlaceholder')}
          placeholder={t('list.searchPlaceholder')}
          value={searchQuery}
          onValueChange={(value) => {
            setSearchQuery(value)
            setPage(1)
          }}
        />
      </div>
      {searchQuery.trim() ? (
        <p className="text-xs text-muted-foreground">
          {t('list.filterPageOnly')}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('list.title')}</CardTitle>
          {
            <span className="text-xs tabular-nums text-muted-foreground">
              {formatNumber(total)}
            </span>
          }
        </CardHeader>
        <CardBody style={{ padding: 0 }}>
          {filtered.length > 0 ? (
            <>
              <div className="hidden items-center gap-4 border-b px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground lg:flex">
                <span className="w-12">{t('list.rank')}</span>
                <span className="w-28">{t('list.status')}</span>
                <span className="min-w-0 flex-1">{t('list.address')}</span>
                <span className="w-28 text-right">{t('list.active')}</span>
                <span className="w-28 text-right">{t('list.lastSeen')}</span>
                <span className="min-w-0 flex-1">{t('list.collateral')}</span>
              </div>
              <ul className="divide-y">
                {filtered.map((mn) => (
                  <MasternodeRow
                    key={`${mn.txid}:${mn.outidx}`}
                    mn={mn}
                    t={t}
                  />
                ))}
              </ul>
            </>
          ) : (
            <EmptyState
              variant="compact"
              illustration={<Users size={24} />}
              title={t('list.empty')}
            />
          )}

          {totalPages > 1 ? (
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={(next) => {
                if (!isFetching) setPage(next)
              }}
              accessibilityLabel={common('page', {
                current: page,
                total: totalPages,
              })}
              previousLabel={common('previous')}
              nextLabel={common('next')}
            />
          ) : null}
        </CardBody>
      </Card>
    </div>
  )
}

function MasternodeRow({ mn, t }: { mn: MasternodeEntry; t: Translate }) {
  const enabled = mn.status.toUpperCase() === 'ENABLED'
  return (
    <li className="group flex flex-col gap-2 px-4 py-2.5 transition-colors hover:bg-muted/40 lg:flex-row lg:items-center lg:gap-4">
      <span className="w-12 font-mono text-sm tabular-nums text-muted-foreground">
        #{formatNumber(mn.rank)}
      </span>
      <span
        className={cn(
          'inline-flex w-fit items-center gap-1.5 text-xs font-medium lg:w-28',
          enabled ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        <span
          className={cn(
            'size-1.5 shrink-0 rounded-full',
            enabled ? 'bg-primary' : 'bg-muted-foreground/50',
          )}
          aria-hidden
        />
        {mn.status || t('list.unknownStatus')}
      </span>
      <div className="min-w-0 flex-1">
        {mn.address ? (
          <HashCell
            value={mn.address}
            to="address"
            fill
            hideCopy
            textClassName="text-sm"
          />
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
          <HashCell
            value={mn.txid}
            to="tx"
            fill
            hideCopy
            textClassName="text-xs text-muted-foreground"
          />
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
    <Card clipContent>
      <section className="relative overflow-hidden p-4 sm:p-5">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center text-primary">
              <Coins className="size-4" />
            </span>
            <h3 className="text-sm font-semibold tracking-tight">
              {t('rewards.title')}
            </h3>
          </div>
          <span className="text-xs font-medium tabular-nums text-primary">
            {REWARD_SPLIT.masternode}% / {REWARD_SPLIT.staker}%
          </span>
        </header>

        {/* Hero figure: locked collateral against per-block split context. */}
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
              {formatNumber(MASTERNODE_COLLATERAL)}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              FAIR
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {t('stats.collateralHint')}
          </span>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">
          {t('rewards.description')}
        </p>

        <StatBar
          variant="split"
          label={t('rewards.title')}
          percent={masternodePct}
          leftValue={`${REWARD_SPLIT.masternode}% ${t('rewards.masternodeShare')}`}
          rightValue={`${REWARD_SPLIT.staker}% ${t('rewards.stakerShare')}`}
        />

        {/* Per-share sub-stat tiles. */}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <RewardShareTile
            icon={Server}
            label={t('rewards.masternodeShare')}
            percent={REWARD_SPLIT.masternode}
          />
          <RewardShareTile
            icon={Wallet}
            label={t('rewards.stakerShare')}
            percent={REWARD_SPLIT.staker}
          />
        </div>

        {/* Hidden-but-present staker fraction keeps the split self-describing. */}
        <span className="sr-only">{stakerPct}%</span>
      </section>
    </Card>
  )
}

function RewardShareTile({
  icon: Icon,
  label,
  percent,
}: {
  icon: LucideIcon
  label: string
  percent: number
}) {
  return (
    <Item
      title={label}
      leading={<Icon size={20} />}
      trailing={<Text>{percent}%</Text>}
    />
  )
}

function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-muted-foreground">
      <span
        className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
        aria-hidden
      />
      <span>{children}</span>
    </li>
  )
}
