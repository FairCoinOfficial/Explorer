import { isDetailPath, masterLocation } from '@/lib/explorer-navigation'
import { lazy, Suspense } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from './components/layout'
import { PageLoading } from './components/page-loading'

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
const BroadcastPage = lazy(() => import('./pages/broadcast'))
const ApiDocsPage = lazy(() => import('./pages/api-docs'))
const ChartsPage = lazy(() => import('./pages/charts'))
const McpPage = lazy(() => import('./pages/mcp'))
const BridgePage = lazy(() => import('./pages/bridge'))
const NotFoundPage = lazy(() => import('./pages/not-found'))

export default function App() {
  const location = useLocation()
  const detail = isDetailPath(location.pathname)
  return (
    <Layout
      detail={
        detail ? (
          <Suspense fallback={<PageLoading />}>
            <Routes location={location}>
              <Route path="block/:hashOrHeight" element={<BlockPage />} />
              <Route path="tx/:txid" element={<TxPage />} />
            </Routes>
          </Suspense>
        ) : undefined
      }
    >
      <Suspense fallback={<PageLoading />}>
        <Routes location={detail ? masterLocation(location) : location}>
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
          <Route
            path="tools/address-validator"
            element={<AddressValidatorPage />}
          />
          <Route path="tools/broadcast" element={<BroadcastPage />} />
          <Route path="tools/api" element={<ApiDocsPage />} />
          <Route path="tools/mcp" element={<McpPage />} />
          <Route path="bridge" element={<BridgePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}
