import { useNetwork } from '@/contexts/network-context'
import { useExplorerNavigate as useNavigate } from '@/lib/explorer-navigation'
import { useTranslations } from '@/lib/i18n'
import { useAppShellPaneActive } from '@oxy.so/bloom/app-shell'
import { Button } from '@oxy.so/bloom/button'
import { Dialog, useDialogControl } from '@oxy.so/bloom/dialog'
import { EmptyState } from '@oxy.so/bloom/empty-state'
import { Item } from '@oxy.so/bloom/item'
import { Search as SearchField } from '@oxy.so/bloom/search'
import { ThemeToggle } from '@oxy.so/bloom/theme-toggle'
import { useQuery } from '@tanstack/react-query'
import { Search, ShoppingCart } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useWindowDimensions } from 'react-native'

export const FOCUS_SEARCH_EVENT = 'faircoin:focus-search'
type Target = {
  type: 'block' | 'transaction' | 'address'
  value: string
  path: string
}
type SearchResponse = {
  query: string
  type:
    | 'block_height'
    | 'block_hash'
    | 'transaction'
    | 'address'
    | 'partial_hash'
    | 'not_found'
  results: {
    height?: number
    hash?: string
    txid?: string
    address?: string
  } | null
}
function target(type: Target['type'], value: string): Target {
  return {
    type,
    value,
    path: `/${type === 'transaction' ? 'tx' : type}/${encodeURIComponent(value)}`,
  }
}
function localTarget(query: string) {
  if (/^\d+$/.test(query)) return target('block', query)
  if (/^[0-9a-fA-F]{64}$/.test(query)) return target('transaction', query)
  if (/^[fFmn2][1-9A-HJ-NP-Za-km-z]{24,38}$/.test(query))
    return target('address', query)
  return null
}
function resolvedTarget(data: SearchResponse): Target | null {
  switch (data.type) {
    case 'block_height':
      return target('block', data.results?.height?.toString() ?? data.query)
    case 'block_hash':
      return target(
        'block',
        data.results?.hash ?? data.results?.height?.toString() ?? data.query,
      )
    case 'transaction':
      return target('transaction', data.results?.txid ?? data.query)
    case 'address':
      return target('address', data.results?.address ?? data.query)
    default:
      return null
  }
}

export function SiteActions({ compact = false }: { compact?: boolean }) {
  const active = useAppShellPaneActive()
  const { width } = useWindowDimensions()
  const navigate = useNavigate()
  const t = useTranslations('header')
  const common = useTranslations('common')
  const { currentNetwork } = useNetwork()
  const [visible, setVisible] = useState(false)
  const dialog = useDialogControl()
  const open = useCallback(() => {
    setVisible(true)
    dialog.open()
  }, [dialog])
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const trimmed = query.trim()
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(trimmed), 250)
    return () => clearTimeout(timer)
  }, [trimmed])
  const close = useCallback(() => {
    setVisible(false)
    setQuery('')
    setDebounced('')
  }, [])
  useEffect(() => {
    if (!active) return
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        open()
      }
    }
    window.addEventListener(FOCUS_SEARCH_EVENT, open)
    window.addEventListener('keydown', shortcut)
    return () => {
      window.removeEventListener(FOCUS_SEARCH_EVENT, open)
      window.removeEventListener('keydown', shortcut)
    }
  }, [open, active])
  const search = useQuery<SearchResponse>({
    queryKey: ['search', debounced, currentNetwork],
    enabled: visible && debounced.length >= 1,
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(debounced)}&network=${currentNetwork}`,
        { signal, headers: { Accept: 'application/json' } },
      )
      if (!response.ok) throw new Error(`Search failed (${response.status})`)
      return response.json()
    },
    retry: 0,
    staleTime: 30_000,
  })
  const match = useMemo(
    () =>
      search.data?.query === trimmed
        ? (resolvedTarget(search.data) ?? localTarget(trimmed))
        : localTarget(trimmed),
    [search.data, trimmed],
  )
  const select = () => {
    if (match) dialog.close(() => navigate(match.path))
  }
  return (
    <>
      <Button
        appearance="subtle"
        onPress={open}
        icon={<Search size={18} />}
        accessibilityLabel={t('searchBlockchain')}
      />
      {!compact && <ThemeToggle collapsed />}
      {!compact && (
        <Button
          href="https://fairco.in/buy"
          target="_blank"
          rel="noreferrer"
          accessibilityLabel={t('buyFair')}
          tone="accent"
          icon={<ShoppingCart size={18} />}
        >
          {width >= 640 ? t('buyFair') : undefined}
        </Button>
      )}
      <Dialog control={dialog} onClose={close} title={t('searchBlockchain')}>
        <SearchField
          autoFocus
          value={query}
          onValueChange={setQuery}
          onClearText={() => setQuery('')}
          onSubmitEditing={select}
          label={t('searchPlaceholder')}
        />
        {match ? (
          <Item
            title={match.value}
            subtitle={common(match.type)}
            onPress={select}
          />
        ) : (
          <EmptyState
            variant="compact"
            title={
              search.isFetching || trimmed !== debounced
                ? t('searching')
                : t('noResultsFound')
            }
          />
        )}
      </Dialog>
    </>
  )
}
