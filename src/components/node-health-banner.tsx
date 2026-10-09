import { useNodeHealth } from '@/hooks/use-node-health'
import { useTranslations } from '@/lib/i18n'
import { decideHealthBanner } from '@/lib/node-health-banner'
import { Admonition } from '@oxy.so/bloom/admonition'

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
    <div role="status" aria-live="polite" className="mb-4">
      <Admonition type={decision.tone === 'danger' ? 'error' : 'warning'}>
        {t(decision.messageKey)}
        {decision.lagBlocks > 0
          ? ` ${t('lagSuffix').replace('{blocks}', String(decision.lagBlocks))}`
          : ''}
      </Admonition>
    </div>
  )
}
