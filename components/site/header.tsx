'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { LanguageSelector } from '@/components/language-selector';
import { NetworkStatus } from '@/components/network-status';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, X, Globe, Code, BookOpen, Github, ExternalLink, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SiteHeader() {
  const t = useTranslations('navigation');
  const router = useRouter();
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to search page with query parameter
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleMobileSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to search page with query parameter
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      // Close mobile search after navigation
      setIsSearchExpanded(false);
    }
  };

  // External resources and links
  const externalLinks = [
    { label: 'FairCoin Website', href: 'https://fairco.in', icon: ExternalLink, description: 'Official project website' },
    { label: 'GitHub Repository', href: 'https://github.com/faircoin', icon: Github, description: 'View source code' },
    { label: 'User Documentation', href: 'https://docs.fairco.in', icon: Code, description: 'User guides and tutorials' },
    { label: 'Community Forum', href: 'https://community.fairco.in', icon: Users, description: 'Join discussions' },
  ];

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex w-full items-center gap-2 px-4">
        {/* Left Section - Sidebar Trigger */}
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
        </div>

        {/* Center Section - Search Bar */}
        <div className="flex flex-1 items-center gap-2 px-2">
          <div className="hidden md:flex flex-1 max-w-2xl">
            <div className="relative w-full group">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none transition-colors duration-200 group-focus-within:text-primary/70" />
                <Input
                  type="text"
                  placeholder="Search blocks, transactions, addresses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 h-9 bg-muted/50 border-0 focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all duration-200 hover:bg-muted/70"
                  aria-label="Search blockchain"
                />
              </form>
            </div>
          </div>
        </div>

        {/* Right Section - Actions and Settings */}
        <div className="flex items-center gap-2 ml-auto">
          {/* External Resources Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="External resources"
              >
                <Globe className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-2">
              <DropdownMenuLabel className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-foreground">
                <Globe className="h-3 w-3 text-primary" />
                External Resources
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="grid gap-1">
                {externalLinks.map((link) => (
                  <DropdownMenuItem key={link.href} asChild className="cursor-pointer p-1 rounded-md">
                    <Link
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary/10 text-secondary-foreground flex-shrink-0">
                        <link.icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground leading-tight">{link.label}</div>
                        <div className="text-xs text-muted-foreground leading-tight mt-0.5 line-clamp-2">{link.description}</div>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Network Status */}
          <div className="hidden sm:block">
            <NetworkStatus />
          </div>

          {/* Language Selector */}
          <LanguageSelector />

          {/* Mobile Search Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8"
            onClick={() => setIsSearchExpanded(!isSearchExpanded)}
            aria-label="Toggle search"
          >
            {isSearchExpanded ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      {isSearchExpanded && (
        <div className="md:hidden border-t px-4 py-3">
          <form onSubmit={handleMobileSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search blocks, transactions, addresses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 h-10 bg-muted/50 border-0 focus:bg-background focus:ring-2 focus:ring-primary/20"
              aria-label="Search blockchain"
              autoFocus
            />
          </form>
        </div>
      )}
    </header>
  );
}

