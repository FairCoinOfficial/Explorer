import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Search, X, Blocks, Receipt, Wallet, Sun, Moon, ShoppingCart, type LucideIcon } from 'lucide-react'
import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { useNetwork } from '@/contexts/network-context'
import { useTranslations } from '@/lib/i18n'

/** Stable id for the desktop navbar search input so other components (sidebar) can focus it. */
export const HEADER_SEARCH_INPUT_ID = 'navbar-search-input'

/** Custom DOM event the header listens for to focus/open its search from anywhere in the app. */
export const FOCUS_SEARCH_EVENT = 'faircoin:focus-search'

/** Shapes returned by GET /api/search (the `type` discriminator drives routing). */
type SearchResultType = 'block_height' | 'block_hash' | 'transaction' | 'address' | 'partial_hash' | 'not_found'

interface SearchResponse {
  query: string
  network: string
  type: SearchResultType
  results: { height?: number; hash?: string; txid?: string; address?: string } | null
}

/** A resolved destination derived from the search query or API response. */
interface SearchTarget {
  type: 'block' | 'transaction' | 'address'
  /** The value used to build the detail route (height/hash/txid/address). */
  value: string
  path: string
}

const TARGET_ICONS: Record<SearchTarget['type'], LucideIcon> = {
  block: Blocks,
  transaction: Receipt,
  address: Wallet,
}

/** Keys into the `common` i18n namespace (common.block / common.transaction / common.address). */
const TARGET_LABEL_KEYS: Record<SearchTarget['type'], string> = {
  block: 'block',
  transaction: 'transaction',
  address: 'address',
}

const HEX_64 = /^[0-9a-fA-F]{64}$/
const ALL_DIGITS = /^\d+$/
// FairCoin / Bitcoin-family base58 addresses (mainnet typically 'f', testnet 'm'/'n'/'2').
const BASE58_ADDRESS = /^[fmn2][1-9A-HJ-NP-Za-km-z]{24,38}$/

function buildTarget(type: SearchTarget['type'], value: string): SearchTarget {
  const path =
    type === 'block' ? `/block/${value}` : type === 'transaction' ? `/tx/${value}` : `/address/${value}`
  return { type, value, path }
}

/**
 * Best-effort local classification so Enter can route instantly without waiting on the API.
 * 64-hex is ambiguous (block hash vs txid); we optimistically treat it as a transaction and
 * fall back to the API's authoritative `type` when results arrive.
 */
function detectTargetFromQuery(raw: string): SearchTarget | null {
  const q = raw.trim()
  if (!q) return null
  if (ALL_DIGITS.test(q)) return buildTarget('block', q)
  if (HEX_64.test(q)) return buildTarget('transaction', q)
  if (BASE58_ADDRESS.test(q)) return buildTarget('address', q)
  return null
}

/** Map an authoritative API response to a navigation target. */
function targetFromResponse(data: SearchResponse): SearchTarget | null {
  const r = data.results
  switch (data.type) {
    case 'block_height':
    case 'block_hash':
      return buildTarget('block', r?.hash ?? r?.height?.toString() ?? data.query)
    case 'transaction':
      return buildTarget('transaction', r?.txid ?? data.query)
    case 'address':
      return buildTarget('address', r?.address ?? data.query)
    default:
      return null
  }
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
  const tc = useTranslations('common')
  const { currentNetwork } = useNetwork()

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const trimmed = searchQuery.trim()
  const canSearch = trimmed.length >= 2

  const searchResults = useQuery<SearchResponse>({
    queryKey: ['search', debouncedQuery, currentNetwork],
    queryFn: async ({ signal }): Promise<SearchResponse> => {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(debouncedQuery)}&network=${currentNetwork}`,
        { headers: { Accept: 'application/json' }, signal },
      )
      if (!res.ok) throw new Error(`Search failed (${res.status})`)
      return (await res.json()) as SearchResponse
    },
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 30_000,
    retry: 0,
  })

  // Authoritative target from the API; falls back to local detection so the first suggestion
  // and Enter routing are always sensible even before the network round-trip resolves.
  const apiTarget = useMemo<SearchTarget | null>(() => {
    const data = searchResults.data
    if (!data || data.query !== debouncedQuery) return null
    return targetFromResponse(data)
  }, [searchResults.data, debouncedQuery])

  const localTarget = useMemo(() => detectTargetFromQuery(trimmed), [trimmed])
  const target = apiTarget ?? localTarget

  const isLoading = canSearch && (searchResults.isFetching || debouncedQuery !== trimmed)
  const notFound =
    canSearch &&
    !isLoading &&
    !target &&
    searchResults.data?.type === 'not_found' &&
    searchResults.data.query === debouncedQuery

  // Suggestion list: the single resolved target, if any. When none resolves the dropdown
  // shows the loading or not-found state instead.
  const suggestions = useMemo<SearchTarget[]>(() => (target ? [target] : []), [target])

  const resetSearch = useCallback(() => {
    setSearchQuery('')
    setDebouncedQuery('')
    setActiveIndex(0)
    setIsFocused(false)
    setIsSearchExpanded(false)
    inputRef.current?.blur()
    mobileInputRef.current?.blur()
  }, [])

  const goToTarget = useCallback(
    (next: SearchTarget) => {
      resetSearch()
      navigate(next.path)
    },
    [navigate, resetSearch],
  )

  const handleInputChange = (value: string) => {
    setSearchQuery(value)
    setActiveIndex(0)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const next = value.trim()
    if (next.length < 2) {
      setDebouncedQuery('')
      return
    }
    debounceRef.current = setTimeout(() => setDebouncedQuery(next), 250)
  }

  const submitBestMatch = useCallback(() => {
    if (!trimmed) return
    if (suggestions.length > 0) {
      goToTarget(suggestions[Math.min(activeIndex, suggestions.length - 1)])
    }
    // No resolvable target: keep the box open so the user can refine; the dropdown shows
    // either the loading or the not-found state.
  }, [trimmed, suggestions, activeIndex, goToTarget])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      resetSearch()
      return
    }
    if (suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault()
        submitBestMatch()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      submitBestMatch()
    }
  }

  // Allow other parts of the app (e.g. the sidebar "Search" item) to summon this search.
  useEffect(() => {
    const focusSearch = () => {
      if (window.matchMedia('(min-width: 768px)').matches) {
        setIsFocused(true)
        inputRef.current?.focus()
      } else {
        setIsSearchExpanded(true)
      }
    }
    window.addEventListener(FOCUS_SEARCH_EVENT, focusSearch)
    return () => window.removeEventListener(FOCUS_SEARCH_EVENT, focusSearch)
  }, [])

  // Click-outside closes the desktop dropdown.
  useEffect(() => {
    if (!isFocused) return
    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [isFocused])

  const showDesktopDropdown = isFocused && canSearch
  const hasContent = isLoading || suggestions.length > 0 || notFound

  const renderResults = (variant: 'desktop' | 'mobile') => (
    <div className="py-1" role="listbox" aria-label={t('searchBlockchain')}>
      {isLoading ? (
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">{t('searching')}</span>
        </div>
      ) : (
        <>
          {suggestions.map((s, index) => {
            const Icon = TARGET_ICONS[s.type]
            const active = index === activeIndex
            return (
              <button
                key={`${s.type}-${s.value}`}
                type="button"
                role="option"
                aria-selected={active}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  goToTarget(s)
                }}
                className={
                  'flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-left transition-colors cursor-pointer ' +
                  (active ? 'bg-background/60' : 'hover:bg-background/40')
                }
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate font-mono">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{tc(TARGET_LABEL_KEYS[s.type])}</div>
                </div>
              </button>
            )
          })}

          {notFound ? (
            <div className="flex items-center gap-3 px-4 py-2.5">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">
                {variant === 'desktop' ? t('noResults', { query: trimmed }) : t('noResultsFound')}
              </span>
            </div>
          ) : null}
        </>
      )}
    </div>
  )

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 relative">
      <div className="flex w-full items-center gap-2 px-4">
        {/* Sidebar trigger (mobile) */}
        <SidebarTrigger className="-ml-1 md:hidden" />

        {/* Search bar with morph autocomplete - desktop */}
        <div ref={containerRef} className="hidden md:flex flex-1 max-w-xl mx-auto relative z-50">
          {/* Invisible spacer to reserve layout space */}
          <div className="w-full h-10" />
          {/* Actual search box - absolute so it can grow over content */}
          <div
            className="absolute inset-x-0 top-0 bg-muted/60 rounded-[20px] hover:bg-muted focus-within:bg-muted transition-colors duration-150 overflow-hidden"
            style={showDesktopDropdown && hasContent ? { backgroundColor: 'hsl(var(--muted))' } : undefined}
          >
            <form onSubmit={(e) => e.preventDefault()} className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
                id={HEADER_SEARCH_INPUT_ID}
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onKeyDown={handleKeyDown}
                className="w-full h-10 pl-11 pr-10 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                aria-label={t('searchBlockchain')}
                role="combobox"
                aria-expanded={showDesktopDropdown && hasContent}
                aria-controls="navbar-search-listbox"
                autoComplete="off"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={resetSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-background/60 hover:text-foreground transition-colors cursor-pointer"
                  aria-label={t('toggleSearch')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </form>

            {/* Results - slides down inside same container, overlays page content */}
            <div
              id="navbar-search-listbox"
              className="transition-[max-height,opacity] duration-200 ease-out"
              style={{
                maxHeight: showDesktopDropdown && hasContent ? '320px' : '0',
                opacity: showDesktopDropdown && hasContent ? 1 : 0,
              }}
            >
              <div className="mx-4" style={{ borderTop: '1px solid hsl(var(--border))' }} />
              {renderResults('desktop')}
            </div>
          </div>
        </div>

        {/* Right side - clean, minimal */}
        <div className="flex items-center gap-1 ml-auto">
          <ThemeToggle />

          <a
            href="https://fairco.in/buy"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center gap-1.5 h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            {t('buyFair')}
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
        <div
          className="md:hidden absolute top-14 left-0 right-0 z-20 bg-background px-4 py-3"
          style={{ borderBottom: '1px solid hsl(var(--border))' }}
        >
          <div className="bg-muted/60 rounded-[20px] overflow-hidden focus-within:bg-muted transition-colors duration-150">
            <form onSubmit={(e) => e.preventDefault()} className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                ref={mobileInputRef}
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
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
                maxHeight: canSearch && hasContent ? '320px' : '0',
                opacity: canSearch && hasContent ? 1 : 0,
              }}
            >
              <div className="mx-4" style={{ borderTop: '1px solid hsl(var(--border))' }} />
              {renderResults('mobile')}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
