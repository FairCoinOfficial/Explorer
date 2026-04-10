import { useLocale, setLocale, SUPPORTED_LOCALES, type Locale } from '@/lib/i18n'
import { Globe } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LanguageSelectorProps {
  collapsed?: boolean
}

export function LanguageSelector({ collapsed }: LanguageSelectorProps) {
  const locale = useLocale()
  const current = SUPPORTED_LOCALES.find((l) => l.code === locale)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {collapsed ? (
          <button
            className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-muted cursor-pointer"
            title={current?.nativeName}
          >
            <Globe size={18} className="text-muted-foreground" />
          </button>
        ) : (
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-2 h-9 text-sm font-normal">
            <Globe size={16} className="text-muted-foreground shrink-0" />
            <span className="truncate">{current?.nativeName ?? 'English'}</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={collapsed ? 'center' : 'start'} side="top" className="w-48">
        {SUPPORTED_LOCALES.map((loc) => (
          <DropdownMenuItem
            key={loc.code}
            onClick={() => setLocale(loc.code)}
            className={cn(
              'cursor-pointer',
              locale === loc.code && 'bg-muted font-medium',
            )}
          >
            <span className="flex-1">{loc.nativeName}</span>
            <span className="text-xs text-muted-foreground">{loc.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
