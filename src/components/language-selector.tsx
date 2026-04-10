import { useLocale, setLocale, SUPPORTED_LOCALES } from '@/lib/i18n'
import { Globe } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

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
            className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-muted cursor-pointer"
            title={current?.nativeName}
          >
            <Globe size={18} className="text-muted-foreground" />
          </button>
        ) : (
          <button className="flex flex-row items-center gap-2 rounded-full h-[36px] w-full px-3 mx-2.5 hover:bg-muted transition-colors cursor-pointer">
            <Globe size={18} className="text-muted-foreground" />
            <span className="text-sm text-foreground font-semibold">{current?.nativeName ?? 'English'}</span>
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={collapsed ? 'center' : 'start'} side="top" sideOffset={8} className="w-48">
        {SUPPORTED_LOCALES.map((loc) => (
          <DropdownMenuItem
            key={loc.code}
            onClick={() => {
              setLocale(loc.code)
              toast.success(`Language changed to ${loc.name}`)
            }}
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
