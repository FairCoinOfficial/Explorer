import { useNavigate } from 'react-router-dom'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Search, X, Blocks, Receipt, Wallet, Hash, Sun, Moon, ShoppingCart } from 'lucide-react'
import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { useTranslations } from '@/lib/i18n'

interface SearchResult {
  type: 'block' | 'transaction' | 'address' | 'not_found'
  query: string
  results: Record<string, unknown> | null
}

const RESULT_ICONS: Record<string, typeof Blocks> = {
  block: Blocks,
  transaction: Receipt,
  address: Wallet,
}

const RESULT_LABELS: Record<string, string> = {
  block: 'Block',
  transaction: 'Transaction',
  address: 'Address',
}

function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('faircoin-theme', next ? 'dark' : 'light')
  }

  return (
    <button
      onClick={toggle}
      className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors cursor-pointer"
      aria-label="Toggle theme"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}

export function SiteHeader() {
  const navigate = useNavigate()
  const t = useTranslations('header')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [results, setResults] = useState<SearchResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)

  const doSearch = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim() || query.trim().length < 2) {
      setResults(null)
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data)
        } else {
          toast.error('Search failed')
        }
      } catch {
        toast.error('Search failed')
        setResults(null)
      } finally {
        setIsSearching(false)
      }
    }, 300)
  }, [])

  const handleInputChange = (value: string) => {
    setSearchQuery(value)
    doSearch(value)
  }

  const navigateToResult = (result: SearchResult) => {
    setSearchQuery('')
    setResults(null)
    setIsFocused(false)
    setIsSearchExpanded(false)
    inputRef.current?.blur()
    mobileInputRef.current?.blur()

    if (result.type === 'block') navigate(`/block/${result.query}`)
    else if (result.type === 'transaction') navigate(`/tx/${result.query}`)
    else if (result.type === 'address') navigate(`/address/${result.query}`)
    else navigate(`/search?q=${encodeURIComponent(result.query)}`)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    if (results && results.type !== 'not_found') {
      navigateToResult(results)
    } else {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      setResults(null)
      setIsFocused(false)
      inputRef.current?.blur()
    }
  }

  const handleMobileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    if (results && results.type !== 'not_found') {
      navigateToResult(results)
    } else {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      setResults(null)
      setIsSearchExpanded(false)
    }
  }

  const showDropdown = isFocused && searchQuery.trim().length >= 2
  const hasContent = isSearching || results !== null
  const ResultIcon = results ? RESULT_ICONS[results.type] : null

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 relative">
      <div className="flex w-full items-center gap-2 px-4">
        {/* Sidebar trigger (mobile) */}
        <SidebarTrigger className="-ml-1 md:hidden" />

        {/* Search bar with morph autocomplete - desktop */}
        <div className="hidden md:flex flex-1 max-w-xl mx-auto relative z-50">
          {/* Invisible spacer to reserve layout space */}
          <div className="w-full h-10" />
          {/* Actual search box - absolute so it can grow over content */}
          <div
            className="absolute inset-x-0 top-0 bg-muted/60 rounded-[20px] hover:bg-muted focus-within:bg-muted transition-colors duration-150 overflow-hidden"
            style={showDropdown && hasContent ? { backgroundColor: 'hsl(var(--muted))' } : undefined}
          >
            <form onSubmit={handleSubmit} className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                className="w-full h-10 pl-11 pr-4 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                aria-label={t('searchBlockchain')}
                autoComplete="off"
              />
            </form>

            {/* Results - slides down inside same container, overlays page content */}
            <div
              className="transition-[max-height,opacity] duration-200 ease-out"
              style={{
                maxHeight: showDropdown && hasContent ? '300px' : '0',
                opacity: showDropdown && hasContent ? 1 : 0,
              }}
            >
              <div className="mx-4" style={{ borderTop: '1px solid hsl(var(--border))' }} />
              <div className="py-1">
                {isSearching ? (
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-muted-foreground">{t('searching')}</span>
                  </div>
                ) : results && results.type !== 'not_found' && ResultIcon ? (
                  <button
                    type="button"
                    className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-background/40 rounded-lg text-left transition-colors cursor-pointer"
                    onMouseDown={(e) => { e.preventDefault(); navigateToResult(results) }}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                      <ResultIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{results.query}</div>
                      <div className="text-xs text-muted-foreground">{RESULT_LABELS[results.type]}</div>
                    </div>
                    <Hash className="h-3 w-3 text-muted-foreground shrink-0" />
                  </button>
                ) : results?.type === 'not_found' ? (
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground">{t('noResults', { query: searchQuery })}</span>
                  </div>
                ) : null}

                <button
                  type="button"
                  className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-background/40 rounded-lg text-left transition-colors cursor-pointer"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
                    setSearchQuery('')
                    setResults(null)
                    setIsFocused(false)
                  }}
                >
                  <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">Search for "<span className="text-foreground font-medium">{searchQuery}</span>"</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - clean, minimal */}
        <div className="flex items-center gap-1 ml-auto">
          <ThemeToggle />

          <a
            href="https://buy.fairco.in/"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center gap-1.5 h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Buy FAIR
          </a>

          {/* Mobile search toggle */}
          <button
            className="md:hidden h-9 w-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors cursor-pointer"
            onClick={() => setIsSearchExpanded(!isSearchExpanded)}
            aria-label={t('toggleSearch')}
          >
            {isSearchExpanded ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile search expanded */}
      {isSearchExpanded && (
        <div className="md:hidden absolute top-14 left-0 right-0 z-20 bg-background px-4 py-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <div className="bg-muted/60 rounded-[20px] overflow-hidden focus-within:bg-muted transition-colors duration-150">
            <form onSubmit={handleMobileSubmit} className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                ref={mobileInputRef}
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => handleInputChange(e.target.value)}
                className="w-full h-10 pl-11 pr-4 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                aria-label={t('searchBlockchain')}
                autoFocus
                autoComplete="off"
              />
            </form>

            {/* Mobile results - same morph pattern */}
            <div
              className="transition-[max-height,opacity] duration-200 ease-out"
              style={{
                maxHeight: searchQuery.trim().length >= 2 && hasContent ? '300px' : '0',
                opacity: searchQuery.trim().length >= 2 && hasContent ? 1 : 0,
              }}
            >
              <div className="mx-4" style={{ borderTop: '1px solid hsl(var(--border))' }} />
              <div className="py-1">
                {isSearching ? (
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-muted-foreground">{t('searching')}</span>
                  </div>
                ) : results && results.type !== 'not_found' && ResultIcon ? (
                  <button
                    type="button"
                    className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-background/40 rounded-lg text-left transition-colors cursor-pointer"
                    onClick={() => navigateToResult(results)}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                      <ResultIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{results.query}</div>
                      <div className="text-xs text-muted-foreground">{RESULT_LABELS[results.type]}</div>
                    </div>
                  </button>
                ) : results?.type === 'not_found' ? (
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-sm text-muted-foreground">{t('noResultsFound')}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
