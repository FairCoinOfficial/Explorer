import { BlockchainProvider } from '@/contexts/blockchain-context'
import { NetworkProvider } from '@/contexts/network-context'
import { explorerScrollAdapter } from '@/lib/explorer-navigation'
import { useLocale } from '@/lib/i18n'
import { queryClient } from '@/lib/query-client'
import { ErrorBoundary } from '@oxy.so/bloom/error-boundary'
import { BloomProvider } from '@oxy.so/bloom/provider'
import { webLocalStorage } from '@oxy.so/bloom/theme'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'

export function AppProviders({ children }: { children: ReactNode }) {
  const locale = useLocale()
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <BloomProvider
          locale={locale}
          colorPreset="faircoin"
          defaultMode="dark"
          persistKey="faircoin-bloom-theme"
          storage={webLocalStorage}
          scrollAdapter={explorerScrollAdapter}
        >
          <QueryClientProvider client={queryClient}>
            <NetworkProvider>
              <BlockchainProvider>{children}</BlockchainProvider>
            </NetworkProvider>
          </QueryClientProvider>
        </BloomProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
