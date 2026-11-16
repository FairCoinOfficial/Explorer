import { isDetailPath, masterLocation } from '@/lib/explorer-navigation'
import { lazyWithRetry } from '@/lib/lazy-with-retry'
import { PanelErrorBoundary } from '@oxy.so/bloom/error-boundary'
import { Suspense } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from './components/layout'
import { PageLoading } from './components/page-loading'

const HomePage = lazyWithRetry(() => import('./pages/home'))
const BlocksPage = lazyWithRetry(() => import('./pages/blocks'))
const BlockPage = lazyWithRetry(() => import('./pages/block'))
const TxIndexPage = lazyWithRetry(() => import('./pages/tx-index'))
const TxPage = lazyWithRetry(() => import('./pages/tx'))
const AddressPage = lazyWithRetry(() => import('./pages/address'))
const MempoolPage = lazyWithRetry(() => import('./pages/mempool'))
const MasternodesPage = lazyWithRetry(() => import('./pages/masternodes'))
const NetworkStatusPage = lazyWithRetry(() => import('./pages/network-status'))
const StatsPage = lazyWithRetry(() => import('./pages/stats'))
const PeersPage = lazyWithRetry(() => import('./pages/peers'))
const FeeCalculatorPage = lazyWithRetry(() => import('./pages/fee-calculator'))
const AddressValidatorPage = lazyWithRetry(() => import('./pages/address-validator'))
const BroadcastPage = lazyWithRetry(() => import('./pages/broadcast'))
const ApiDocsPage = lazyWithRetry(() => import('./pages/api-docs'))
const ChartsPage = lazyWithRetry(() => import('./pages/charts'))
const McpPage = lazyWithRetry(() => import('./pages/mcp'))
const BridgePage = lazyWithRetry(() => import('./pages/bridge'))
const NotFoundPage = lazyWithRetry(() => import('./pages/not-found'))

export default function App() {
  const location = useLocation()
  const detail = isDetailPath(location.pathname)
  const master = detail ? masterLocation(location) : location
  return (
    <Layout
      detail={
        detail ? (
          <PanelErrorBoundary resetKey={location.pathname}>
            <Suspense fallback={<PageLoading />}>
              <Routes location={location}>
                <Route path="block/:hashOrHeight" element={<BlockPage />} />
                <Route path="tx/:txid" element={<TxPage />} />
              </Routes>
            </Suspense>
          </PanelErrorBoundary>
        ) : undefined
      }
    >
      {/* A page that fails (chunk that will not load, render error) stays inside
          its own panel: header, navigation and the other pane keep working. */}
      <PanelErrorBoundary resetKey={master.pathname}>
        <Suspense fallback={<PageLoading />}>
          <Routes location={master}>
            <Route index element={<HomePage />} />
            <Route path="blocks" element={<BlocksPage />} />
            <Route path="tx" element={<TxIndexPage />} />
            <Route path="address/:address" element={<AddressPage />} />
            <Route path="mempool" element={<MempoolPage />} />
            <Route path="masternodes" element={<MasternodesPage />} />
            <Route path="network-status" element={<NetworkStatusPage />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="charts" element={<ChartsPage />} />
            <Route path="peers" element={<PeersPage />} />
            <Route path="tools/fee-calculator" element={<FeeCalculatorPage />} />
            <Route path="tools/address-validator" element={<AddressValidatorPage />} />
            <Route path="tools/broadcast" element={<BroadcastPage />} />
            <Route path="tools/api" element={<ApiDocsPage />} />
            <Route path="tools/mcp" element={<McpPage />} />
            <Route path="bridge" element={<BridgePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </PanelErrorBoundary>
    </Layout>
  )
}
