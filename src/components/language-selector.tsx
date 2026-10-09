import { setLocale, SUPPORTED_LOCALES, useLocale } from '@/lib/i18n'
import { Button } from '@oxy.so/bloom/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@oxy.so/bloom/dropdown-menu'
import { Globe } from 'lucide-react'

export function LanguageSelector({ collapsed }: { collapsed?: boolean }) {
  const locale = useLocale()
  const current = SUPPORTED_LOCALES.find((item) => item.code === locale)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          appearance="plain"
          iconOnly={collapsed}
          icon={<Globe className="size-4" />}
          accessibilityLabel={current?.nativeName}
        >
          {collapsed ? undefined : current?.nativeName}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {SUPPORTED_LOCALES.map((item) => (
          <DropdownMenuItem
            key={item.code}
            onPress={() => setLocale(item.code)}
          >
            {item.nativeName}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
