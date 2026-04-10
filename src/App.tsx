import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { NetworkProvider } from './contexts/network-context'
import { BlockchainProvider } from './contexts/blockchain-context'
import { Layout } from './components/layout'
import HomePage from './pages/home'
import BlocksPage from './pages/blocks'
import BlockPage from './pages/block'
import TxIndexPage from './pages/tx-index'
import TxPage from './pages/tx'
import AddressPage from './pages/address'
import MempoolPage from './pages/mempool'
import MasternodesPage from './pages/masternodes'
import NetworkStatusPage from './pages/network-status'
import StatsPage from './pages/stats'
import PeersPage from './pages/peers'
import SearchPage from './pages/search'
import FeeCalculatorPage from './pages/fee-calculator'
import AddressValidatorPage from './pages/address-validator'
import NotFoundPage from './pages/not-found'

export default function App() {
  return (
    <BrowserRouter>
      <NetworkProvider>
        <BlockchainProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="blocks" element={<BlocksPage />} />
              <Route path="block/:hashOrHeight" element={<BlockPage />} />
              <Route path="tx" element={<TxIndexPage />} />
              <Route path="tx/:txid" element={<TxPage />} />
              <Route path="address/:address" element={<AddressPage />} />
              <Route path="mempool" element={<MempoolPage />} />
              <Route path="masternodes" element={<MasternodesPage />} />
              <Route path="network-status" element={<NetworkStatusPage />} />
              <Route path="stats" element={<StatsPage />} />
              <Route path="peers" element={<PeersPage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="tools/fee-calculator" element={<FeeCalculatorPage />} />
              <Route path="tools/address-validator" element={<AddressValidatorPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BlockchainProvider>
      </NetworkProvider>
    </BrowserRouter>
  )
}
