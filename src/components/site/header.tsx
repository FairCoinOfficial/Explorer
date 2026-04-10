import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { NetworkStatus } from '@/components/network-status'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, X, Globe, Code, Github, ExternalLink, Users, Blocks, Receipt, Wallet, Hash } from 'lucide-react'
import { useState, useRef, useCallback } from 'react'

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
        }
      } catch {
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

    if (result.type === 'block') {
      navigate(`/block/${result.query}`)
    } else if (result.type === 'transaction') {
      navigate(`/tx/${result.query}`)
    } else if (result.type === 'address') {
      navigate(`/address/${result.query}`)
    } else {
      navigate(`/search?q=${encodeURIComponent(result.query)}`)
    }
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
  const ResultIcon = results ? RESULT_ICONS[results.type] : null

  const externalLinks = [
    { label: t('fairCoinWebsite'), href: 'https://fairco.in', icon: ExternalLink, description: t('fairCoinWebsiteDesc') },
    { label: t('github'), href: 'https://github.com/FairCoinOfficial', icon: Github, description: t('githubDesc') },
    { label: t('documentation'), href: 'https://docs.fairco.in', icon: Code, description: t('documentationDesc') },
    { label: t('community'), href: 'https://community.fairco.in', icon: Users, description: t('communityDesc') },
  ]

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 relative">
      <div className="flex w-full items-center gap-2 px-4">
        {/* Sidebar trigger (mobile) */}
        <SidebarTrigger className="-ml-1 md:hidden" />

        {/* Search bar with autocomplete - desktop */}
        <div className="hidden md:flex flex-1 max-w-xl mx-auto relative z-50">
          {/* Input - always rounded-full, never changes shape */}
          <div className="w-full bg-muted/60 rounded-full hover:bg-muted focus-within:bg-muted focus-within:ring-1 focus-within:ring-border transition-colors duration-200">
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
                className="w-full h-10 pl-11 pr-4 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none rounded-full"
                aria-label={t('searchBlockchain')}
                autoComplete="off"
              />
            </form>
          </div>

          {/* Floating dropdown - separate card below input */}
          {showDropdown && (
            <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-popover rounded-2xl shadow-lg ring-1 ring-border overflow-hidden">
              <div className="py-1">
                {isSearching ? (
                  <div className="flex items-center gap-3 px-4 py-2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                     <span className="text-sm text-muted-foreground">{t('searching')}</span>
                  </div>
                ) : results && results.type !== 'not_found' && ResultIcon ? (
                  <button
                    type="button"
                    className="flex items-center gap-3 w-full px-4 py-2 hover:bg-muted text-left transition-colors cursor-pointer"
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
                  <div className="flex items-center gap-3 px-4 py-2">
                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground">{t('noResults', { query: searchQuery })}</span>
                  </div>
                ) : null}

                {/* Quick search suggestion */}
                <button
                  type="button"
                  className="flex items-center gap-3 w-full px-4 py-2 hover:bg-muted text-left transition-colors cursor-pointer"
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
          )}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Buy button */}
          <a
            href="https://buy.fairco.in/"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Buy FAIR
          </a>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label={t('resources')}>
                <Globe className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-1.5">
              <DropdownMenuLabel className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold">
                <Globe className="h-3 w-3 text-primary" />
                {t('resources')}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="grid gap-0.5">
                {externalLinks.map((link) => (
                  <DropdownMenuItem key={link.href} asChild className="cursor-pointer rounded-lg p-0">
                    <a href={link.href} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-2 py-2 rounded-lg">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted shrink-0">
                        <link.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium leading-tight">{link.label}</div>
                        <div className="text-xs text-muted-foreground leading-tight mt-0.5">{link.description}</div>
                      </div>
                    </a>
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="hidden sm:block">
            <NetworkStatus />
          </div>

          {/* Mobile search toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9 rounded-full"
            onClick={() => setIsSearchExpanded(!isSearchExpanded)}
            aria-label={t('toggleSearch')}
          >
            {isSearchExpanded ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile search expanded with autocomplete */}
      {isSearchExpanded && (
        <div className="md:hidden absolute top-14 left-0 right-0 z-20 bg-background px-4 py-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <form onSubmit={handleMobileSubmit} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              ref={mobileInputRef}
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => handleInputChange(e.target.value)}
              className="w-full h-10 pl-11 pr-4 rounded-full bg-muted/60 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
              aria-label={t('searchBlockchain')}
              autoFocus
              autoComplete="off"
            />
          </form>

          {/* Mobile autocomplete results */}
          {searchQuery.trim().length >= 2 && (
            <div className="mt-2">
              {isSearching ? (
                <div className="flex items-center gap-3 px-2 py-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                   <span className="text-sm text-muted-foreground">{t('searching')}</span>
                </div>
              ) : results && results.type !== 'not_found' && ResultIcon ? (
                <button
                  type="button"
                  className="flex items-center gap-3 w-full px-2 py-2 rounded-xl hover:bg-muted text-left transition-colors cursor-pointer"
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
                <div className="flex items-center gap-3 px-2 py-2">
                  <span className="text-sm text-muted-foreground">{t('noResultsFound')}</span>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </header>
  )
}
