import { DetailHeader } from '@/components/detail/detail-header'
import { useLiveMode, type LiveMode } from '@/contexts/blockchain-context'
import { useTranslations } from '@/lib/i18n'
import { Chip } from '@oxy.so/bloom/chip'

export function HomeHeader() {
  const t = useTranslations('home')
  const nav = useTranslations('nav')
  const mode = useLiveMode()

  return (
    <DetailHeader
      title={nav('home')}
      subtitle={t('subtitle')}
      action={
        <LivePill
          mode={mode}
          label={
            mode === 'live'
              ? t('live')
              : mode === 'polling'
                ? t('polling')
                : t('offline')
          }
        />
      }
    />
  )
}

interface LivePillProps {
  mode: LiveMode
  label: string
}

function LivePill({ mode, label }: LivePillProps) {
  return (
    <Chip
      appearance="subtle"
      tone={
        mode === 'live' ? 'success' : mode === 'polling' ? 'warning' : 'danger'
      }
    >
      {label}
    </Chip>
  )
}
