import { useMemo } from 'react'
import {
  Bot,
  Compass,
  Database,
  KeyRound,
  Network,
  Plug,
  ShieldCheck,
  Sparkles,
  Terminal,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslations } from '@/lib/i18n'
import { useMcpInfo, type McpInfoResult, type McpTool, type McpToolCategory } from '@/hooks/use-mcp-info'
import { DetailHeader } from '@/components/detail/detail-header'
import { SectionCard } from '@/components/detail/section-card'
import { CopyButton } from '@/components/copy-button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type Translate = (key: string, params?: Record<string, string | number>) => string

/** Public MCP endpoint shown when the live metadata has not loaded yet. */
const FALLBACK_ENDPOINT = 'https://explorer.fairco.in/mcp'

/** Brand gradient reused from the supply/fee panels: primary → bright accent. */
const HERO_GRADIENT = 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))'

/** Tool groups in display order, each with an icon and the catalog category. */
const TOOL_GROUPS: ReadonlyArray<{ category: McpToolCategory; icon: LucideIcon }> = [
  { category: 'discovery', icon: Compass },
  { category: 'blockchain', icon: Database },
  { category: 'wallet', icon: KeyRound },
]

function groupLabel(category: McpToolCategory, t: Translate): string {
  return t(`groups.${category}.title`)
}

function groupDescription(category: McpToolCategory, t: Translate): string {
  return t(`groups.${category}.description`)
}

export function McpContent() {
  const t = useTranslations('tools.mcp')
  const info: McpInfoResult | undefined = useMcpInfo().data

  // The endpoint is fixed for the deployment, but prefer the live value so the
  // copy button always reflects what the server advertises.
  const endpoint = info?.status === 'ok' ? info.data.endpoint : FALLBACK_ENDPOINT
  const transport = info?.status === 'ok' ? info.data.transport : null
  const tools = info?.status === 'ok' ? info.data.tools : []

  const toolsByCategory = useMemo(() => {
    const buckets: Record<McpToolCategory, McpTool[]> = { discovery: [], blockchain: [], wallet: [] }
    for (const tool of tools) {
      buckets[tool.category].push(tool)
    }
    return buckets
  }, [tools])

  const connectSteps: ReadonlyArray<{ icon: LucideIcon; title: string; body: string }> = [
    { icon: Bot, title: t('connect.claude.title'), body: t('connect.claude.body') },
    { icon: Sparkles, title: t('connect.chatgpt.title'), body: t('connect.chatgpt.body') },
    { icon: Terminal, title: t('connect.cursor.title'), body: t('connect.cursor.body') },
  ]

  return (
    <div className="flex-1 space-y-4 p-3 pt-4 sm:p-4 md:p-6 lg:p-8">
      <DetailHeader
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <Plug className="size-3" />
            MCP
          </span>
        }
      />

      {/* Intro */}
      <SectionCard title={t('intro.title')} icon={Sparkles}>
        <p className="text-sm leading-relaxed text-muted-foreground">{t('intro.body')}</p>
      </SectionCard>

      {/* Endpoint hero with copy-to-clipboard */}
      <SectionCard title={t('endpoint.title')} icon={Plug}>
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl"
            style={{ backgroundImage: HERO_GRADIENT }}
            aria-hidden
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <Network className="size-3.5" />
                {t('endpoint.label')}
              </span>
              <code className="block break-all font-mono text-base font-semibold text-primary sm:text-lg">
                {endpoint}
              </code>
            </div>
            <CopyButton text={endpoint} label={t('endpoint.copy')} className="shrink-0 self-start sm:self-auto" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1">
              {t('endpoint.transport', { transport: transport ?? 'Streamable HTTP' })}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="size-3" />
              {t('endpoint.readOnly')}
            </Badge>
            <Badge variant="ghost">{t('endpoint.noApiKey')}</Badge>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t('endpoint.networkNote')}</p>
      </SectionCard>

      {/* Connect quick steps */}
      <SectionCard title={t('connect.title')} icon={Bot}>
        <div className="grid gap-3 sm:grid-cols-3">
          {connectSteps.map((step) => (
            <ConnectCard key={step.title} icon={step.icon} title={step.title} body={step.body} />
          ))}
        </div>
      </SectionCard>

      {/* Tools list grouped by category */}
      <SectionCard title={t('toolsSection.title')} icon={Database}>
        {info?.status === 'unavailable' ? (
          <p className="rounded-xl bg-muted/50 px-3 py-4 text-sm text-muted-foreground">
            {t('toolsSection.unavailable')}
          </p>
        ) : tools.length === 0 ? (
          <p className="rounded-xl bg-muted/50 px-3 py-4 text-sm text-muted-foreground">
            {t('toolsSection.loading')}
          </p>
        ) : (
          <div className="space-y-5">
            {TOOL_GROUPS.map(({ category, icon: Icon }) => {
              const groupTools = toolsByCategory[category]
              if (groupTools.length === 0) return null
              const isWallet = category === 'wallet'
              return (
                <div key={category} className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-full',
                        isWallet ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary',
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 space-y-0.5">
                      <h4 className="text-sm font-semibold tracking-tight">{groupLabel(category, t)}</h4>
                      <p className="text-xs text-muted-foreground">{groupDescription(category, t)}</p>
                    </div>
                    <Badge variant="secondary" className="ml-auto shrink-0 tabular-nums">
                      {groupTools.length}
                    </Badge>
                  </div>

                  {isWallet ? (
                    <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3">
                      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-destructive" />
                      <p className="text-xs leading-relaxed text-foreground/80">{t('groups.wallet.securityNote')}</p>
                    </div>
                  ) : null}

                  <ul className="grid gap-2 sm:grid-cols-2">
                    {groupTools.map((tool) => (
                      <ToolItem key={tool.name} tool={tool} />
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

function ConnectCard({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-muted/40 p-4">
      <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <h4 className="text-sm font-semibold">{title}</h4>
      <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  )
}

function ToolItem({ tool }: { tool: McpTool }) {
  return (
    <li className="flex flex-col gap-1 rounded-xl bg-muted/50 px-3 py-2.5 transition-colors hover:bg-muted/70">
      <code className="font-mono text-sm font-semibold text-foreground">{tool.name}</code>
      <p className="text-xs leading-relaxed text-muted-foreground">{tool.description}</p>
    </li>
  )
}
