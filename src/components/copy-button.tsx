import { useTranslations } from '@/lib/i18n'
import { Button } from '@oxy.so/bloom/button'
import { toast } from '@oxy.so/bloom/toast'
import { Copy } from 'lucide-react'

interface CopyButtonProps {
  text: string
  className?: string
  label?: string
  hideLabel?: boolean
}

export function CopyButton({
  text,
  className,
  label,
  hideLabel = false,
}: CopyButtonProps) {
  const t = useTranslations('common')
  const showLabel = Boolean(label) && !hideLabel
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(t('copied'))
    } catch {
      toast.error(t('copyFailed'))
    }
  }
  return (
    <Button
      appearance="plain"
      size="xs"
      className={className}
      icon={<Copy size={16} />}
      iconOnly={!showLabel}
      accessibilityLabel={label ?? t('copy')}
      onPress={copy}
    >
      {showLabel ? label : null}
    </Button>
  )
}
