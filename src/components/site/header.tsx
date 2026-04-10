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
import { Search, X, Globe, Code, Github, ExternalLink, Users } from 'lucide-react'
import { useState } from 'react'

export function SiteHeader() {
  const navigate = useNavigate()
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  const handleMobileSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setIsSearchExpanded(false)
      setSearchQuery('')
    }
  }

  const externalLinks = [
    { label: 'FairCoin Website', href: 'https://fairco.in', icon: ExternalLink, description: 'Official project website' },
    { label: 'GitHub Repository', href: 'https://github.com/FairCoinOfficial', icon: Github, description: 'View source code' },
    { label: 'Documentation', href: 'https://docs.fairco.in', icon: Code, description: 'User guides and tutorials' },
    { label: 'Community', href: 'https://community.fairco.in', icon: Users, description: 'Join discussions' },
  ]

  return (
    <header className="flex h-14 shrink-0 items-center gap-2">
      <div className="flex w-full items-center gap-2 px-4">
        {/* Sidebar trigger (mobile) */}
        <SidebarTrigger className="-ml-1 md:hidden" />

        {/* Search bar - fully rounded like Google Photos */}
        <div className="hidden md:flex flex-1 max-w-xl mx-auto">
          <form onSubmit={handleSearch} className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none transition-colors group-focus-within:text-foreground" />
            <input
              type="text"
              placeholder="Search blocks, transactions, addresses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-11 pr-4 rounded-full bg-muted/60 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all duration-200 hover:bg-muted focus:bg-muted focus:ring-2 focus:ring-primary/20"
              aria-label="Search blockchain"
            />
          </form>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1.5 ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" aria-label="External resources">
                <Globe className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 p-1.5">
              <DropdownMenuLabel className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-foreground">
                <Globe className="h-3 w-3 text-primary" />
                Resources
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
            className="md:hidden h-9 w-9 rounded-xl"
            onClick={() => setIsSearchExpanded(!isSearchExpanded)}
            aria-label="Toggle search"
          >
            {isSearchExpanded ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile search expanded */}
      {isSearchExpanded && (
        <div className="md:hidden absolute top-14 left-0 right-0 z-20 bg-background px-4 py-3 border-b border-border">
          <form onSubmit={handleMobileSearch} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search blocks, transactions, addresses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-11 pr-4 rounded-full bg-muted/60 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Search blockchain"
              autoFocus
            />
          </form>
        </div>
      )}
    </header>
  )
}
