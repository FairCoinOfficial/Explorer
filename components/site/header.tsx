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
import { Search, X, Zap, Globe, Code, BookOpen, Github, ExternalLink, Activity, Wrench } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';

export function SiteHeader() {
  const t = useTranslations('navigation');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  // Quick actions that complement the sidebar navigation
  const quickActions = [
    { label: 'Advanced Search', href: '/search', icon: Search, description: 'Search blocks, transactions, addresses' },
    { label: 'Network Status', href: '/network-status', icon: Activity, description: 'Check network health and performance' },
    { label: 'Blockchain Tools', href: '/tools', icon: Wrench, description: 'Address validator, fee calculator' },
    { label: 'API Documentation', href: '/api', icon: Code, description: 'Developer API reference' },
  ];

  // External resources and links
  const externalLinks = [
    { label: 'FairCoin Website', href: 'https://fairco.in', icon: ExternalLink, description: 'Official project website' },
    { label: 'GitHub Repository', href: 'https://github.com/faircoin', icon: Github, description: 'View source code' },
    { label: 'User Documentation', href: 'https://docs.fairco.in', icon: BookOpen, description: 'User guides and tutorials' },
    { label: 'Community Forum', href: 'https://community.fairco.in', icon: Github, description: 'Join discussions' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Main Header Bar */}
      <div className="container flex h-16 items-center justify-between">
        {/* Left Section - Logo and Sidebar Trigger */}
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden" />
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative h-9 w-9 rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 shadow-sm ring-1 ring-primary/10">
              <Image
                src="/images/FairCoin-Logo.jpg"
                alt="FairCoin"
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-300"
                priority
              />
            </div>
            <div className="hidden sm:block">
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary/90 to-primary/80 bg-clip-text text-transparent group-hover:from-primary/90 group-hover:via-primary group-hover:to-primary/90 transition-all duration-300">
                FairCoin Explorer
              </span>
              <div className="text-xs text-muted-foreground -mt-1 group-hover:text-muted-foreground/80 transition-colors duration-300">Blockchain Explorer</div>
            </div>
          </Link>
        </div>

        {/* Center Section - Search Bar */}
        <div className="hidden md:flex flex-1 max-w-lg mx-8">
          <div className="relative w-full group">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none transition-colors duration-200 group-focus-within:text-primary/70" />
              <Input
                type="text"
                placeholder="Search blocks, transactions, addresses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 h-10 bg-muted/50 border-0 focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all duration-200 hover:bg-muted/70 focus:shadow-lg"
                aria-label="Search blockchain"
              />
            </form>
          </div>
        </div>

        {/* Right Section - Actions and Settings */}
        <div className="flex items-center gap-2">
          {/* Quick Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 hover:bg-accent/50 transition-colors rounded-lg"
                aria-label="Quick actions"
              >
                <Zap className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 p-3">
              <DropdownMenuLabel className="flex items-center gap-2 px-2 py-2 text-sm font-semibold text-foreground">
                <Zap className="h-4 w-4 text-primary" />
                Quick Actions
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="grid gap-1">
                {quickActions.map((action) => (
                  <DropdownMenuItem key={action.href} asChild className="cursor-pointer p-2 rounded-md">
                    <Link
                      href={action.href}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <action.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground">{action.label}</div>
                        <div className="text-xs text-muted-foreground truncate">{action.description}</div>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* External Resources Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 hover:bg-accent/50 transition-colors rounded-lg"
                aria-label="External resources"
              >
                <Globe className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 p-3">
              <DropdownMenuLabel className="flex items-center gap-2 px-2 py-2 text-sm font-semibold text-foreground">
                <Globe className="h-4 w-4 text-primary" />
                External Resources
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="grid gap-1">
                {externalLinks.map((link) => (
                  <DropdownMenuItem key={link.href} asChild className="cursor-pointer p-2 rounded-md">
                    <Link
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10 text-secondary-foreground">
                        <link.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground">{link.label}</div>
                        <div className="text-xs text-muted-foreground truncate">{link.description}</div>
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
            size="sm"
            className="md:hidden h-9 w-9 p-0 hover:bg-accent/50 transition-colors rounded-lg"
            onClick={() => setIsSearchExpanded(!isSearchExpanded)}
            aria-label="Toggle search"
          >
            {isSearchExpanded ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      {isSearchExpanded && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container py-4">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search blocks, transactions, addresses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 h-11 bg-muted/50 border-0 focus:bg-background focus:ring-2 focus:ring-primary/20"
                aria-label="Search blockchain"
                autoFocus
              />
            </form>
            
            {/* Mobile Quick Actions */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <Button
                  key={action.href}
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-12 justify-start text-sm"
                >
                  <Link href={action.href} onClick={() => setIsSearchExpanded(false)}>
                    <action.icon className="h-4 w-4 mr-2" />
                    {action.label}
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

