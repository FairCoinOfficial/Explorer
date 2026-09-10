import { AlertTriangle } from 'lucide-react'
import { useNodeHealth } from '@/hooks/use-node-health'
import { decideHealthBanner } from '@/lib/node-health-banner'
import { useTranslations } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/**
 * Tells the visitor when the chain data on screen may not be current.
 *
 * Without this, a node that stopped following the chain looks identical to a
 * healthy one: every page renders a plausible height and nothing indicates it
 * is an hour stale. Renders nothing at all while the node is on the tip — see
 * `decideHealthBanner` for when it is considered worth interrupting for.
 */
export function NodeHealthBanner() {
  const t = useTranslations('nodeHealth')
  const { data, isLoading } = useNodeHealth()
  const decision = decideHealthBanner(isLoading ? undefined : data)

  if (!decision) {
    return null
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center gap-2 border-b px-3 py-2 text-sm sm:px-4 md:px-6 lg:px-8',
        decision.tone === 'danger'
          ? 'border-destructive/30 bg-destructive/10 text-destructive'
          : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
      )}
    >
      <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
      <span>
        {t(decision.messageKey)}
        {decision.lagBlocks > 0 ? ` ${t('lagSuffix').replace('{blocks}', String(decision.lagBlocks))}` : ''}
      </span>
    </div>
  )
}
