import { formatDistanceToNow, type Locale as DateFnsLocale } from 'date-fns'
import { enUS, es, fr, de, ru, zhCN, ja, ko } from 'date-fns/locale'
import { useLocale, type Locale } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface RelativeTimeProps {
  /** Unix timestamp in seconds (as returned by the node RPC). */
  timestamp: number
  className?: string
}

const DATE_FNS_LOCALES: Record<Locale, DateFnsLocale> = {
  en: enUS,
  es,
  fr,
  de,
  ru,
  zh: zhCN,
  ja,
  ko,
}

/**
 * Relative "x minutes ago" label with the absolute local timestamp in a
 * native tooltip. Locale follows the active i18n language.
 */
export function RelativeTime({ timestamp, className }: RelativeTimeProps) {
  const locale = useLocale()

  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return <span className={cn('tabular-nums text-muted-foreground', className)}>—</span>
  }

  const date = new Date(timestamp * 1000)

  return (
    <span className={cn('tabular-nums', className)} title={date.toLocaleString(locale)}>
      {formatDistanceToNow(date, { addSuffix: true, locale: DATE_FNS_LOCALES[locale] })}
    </span>
  )
}
