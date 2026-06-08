import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { NetworkProvider } from './contexts/network-context'
import { BlockchainProvider } from './contexts/blockchain-context'
import { ErrorBoundary } from './components/error-boundary'
import { Layout } from './components/layout'
import { PageLoading } from './components/page-loading'
import { queryClient } from './lib/query-client'

// Pages are code-split: each becomes its own chunk that loads on demand, so the
// initial bundle no longer ships every route (e.g. /bridge, /masternodes, /stats
// stay out of the home payload). The Layout (app chrome) is imported eagerly
// above so the shell paints instantly while a page chunk streams in behind the
// <Suspense> fallback below.
const HomePage = lazy(() => import('./pages/home'))
const BlocksPage = lazy(() => import('./pages/blocks'))
const BlockPage = lazy(() => import('./pages/block'))
const TxIndexPage = lazy(() => import('./pages/tx-index'))
const TxPage = lazy(() => import('./pages/tx'))
const AddressPage = lazy(() => import('./pages/address'))
const MempoolPage = lazy(() => import('./pages/mempool'))
const MasternodesPage = lazy(() => import('./pages/masternodes'))
const NetworkStatusPage = lazy(() => import('./pages/network-status'))
const StatsPage = lazy(() => import('./pages/stats'))
const PeersPage = lazy(() => import('./pages/peers'))
const FeeCalculatorPage = lazy(() => import('./pages/fee-calculator'))
const AddressValidatorPage = lazy(() => import('./pages/address-validator'))
const BridgePage = lazy(() => import('./pages/bridge'))
const NotFoundPage = lazy(() => import('./pages/not-found'))

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <NetworkProvider>
            <BlockchainProvider>
              <Routes>
                <Route element={<Layout />}>
                  <Route
                    index
                    element={
                      <Suspense fallback={<PageLoading />}>
                        <HomePage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="blocks"
                    element={
                      <Suspense fallback={<PageLoading />}>
                        <BlocksPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="block/:hashOrHeight"
                    element={
                      <Suspense fallback={<PageLoading />}>
                        <BlockPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="tx"
                    element={
                      <Suspense fallback={<PageLoading />}>
                        <TxIndexPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="tx/:txid"
                    element={
                      <Suspense fallback={<PageLoading />}>
                        <TxPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="address/:address"
                    element={
                      <Suspense fallback={<PageLoading />}>
                        <AddressPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="mempool"
                    element={
                      <Suspense fallback={<PageLoading />}>
                        <MempoolPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="masternodes"
                    element={
                      <Suspense fallback={<PageLoading />}>
                        <MasternodesPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="network-status"
                    element={
                      <Suspense fallback={<PageLoading />}>
                        <NetworkStatusPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="stats"
                    element={
                      <Suspense fallback={<PageLoading />}>
                        <StatsPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="peers"
                    element={
                      <Suspense fallback={<PageLoading />}>
                        <PeersPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="tools/fee-calculator"
                    element={
                      <Suspense fallback={<PageLoading />}>
                        <FeeCalculatorPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="tools/address-validator"
                    element={
                      <Suspense fallback={<PageLoading />}>
                        <AddressValidatorPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="bridge"
                    element={
                      <Suspense fallback={<PageLoading />}>
                        <BridgePage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="*"
                    element={
                      <Suspense fallback={<PageLoading />}>
                        <NotFoundPage />
                      </Suspense>
                    }
                  />
                </Route>
              </Routes>
            </BlockchainProvider>
          </NetworkProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
