import { LanguageSelector } from '@/components/language-selector'
import { FOCUS_SEARCH_EVENT } from '@/components/site/header'
import { useNetwork } from '@/contexts/network-context'
import {
  isDetailPath,
  masterLocation,
  useExplorerNavigate as useNavigate,
} from '@/lib/explorer-navigation'
import { useTranslations } from '@/lib/i18n'
import type { SidebarIcon, SidebarProps } from '@oxy.so/bloom/sidebar'
import {
  BarChart3,
  Blocks,
  BookOpen,
  Calculator,
  Clock,
  Home,
  LineChart,
  Network,
  Plug,
  Radio,
  Receipt,
  Search,
  Shield,
  ShieldCheck,
  Users,
  Waypoints,
  type LucideIcon,
} from 'lucide-react'
import { useLocation } from 'react-router-dom'

// Adapt the existing outline icons to Bloom's sized/color-aware icon slot.
function icon(Icon: LucideIcon): SidebarIcon {
  return ({ width = 20, height = 20, fill }) => (
    <Icon width={width} height={height} color={fill} />
  )
}
const icons = {
  home: icon(Home),
  search: icon(Search),
  blocks: icon(Blocks),
  transactions: icon(Receipt),
  stats: icon(BarChart3),
  charts: icon(LineChart),
  masternodes: icon(Shield),
  mempool: icon(Clock),
  peers: icon(Users),
  network: icon(Network),
  bridge: icon(Waypoints),
  feeCalculator: icon(Calculator),
  addressValidator: icon(ShieldCheck),
  broadcast: icon(Radio),
  apiDocs: icon(BookOpen),
  mcp: icon(Plug),
}

export function useExplorerSidebar(): SidebarProps {
  const location = useLocation()
  const { pathname } = isDetailPath(location.pathname)
    ? masterLocation(location)
    : location
  const navigate = useNavigate()
  const { currentNetwork, setNetwork } = useNetwork()
  const t = useTranslations('nav')
  const ts = useTranslations('sidebar')
  const routes = [
    ['home', '/'],
    ['blocks', '/blocks'],
    ['transactions', '/tx'],
    ['stats', '/stats'],
    ['charts', '/charts'],
    ['masternodes', '/masternodes'],
    ['mempool', '/mempool'],
    ['peers', '/peers'],
    ['network', '/network-status'],
    ['bridge', '/bridge'],
  ] as const
  const tools = [
    ['feeCalculator', '/tools/fee-calculator'],
    ['addressValidator', '/tools/address-validator'],
    ['broadcast', '/tools/broadcast'],
    ['apiDocs', '/tools/api'],
    ['mcp', '/tools/mcp'],
  ] as const
  return {
    logo: {
      icon: (
        <img
          src="/images/FairCoin-Logo.jpg"
          alt=""
          className="size-7 rounded-lg"
        />
      ),
      wordmark: 'FairCoin Explorer',
      href: '/',
      onPress: () => navigate('/'),
    },
    surface: 'card',
    size: 'sm',
    showSearch: false,
    showThemeToggle: false,
    accessibilityLabel: 'FairCoin Explorer',
    collapseLabel: ts('collapseSidebar'),
    expandLabel: ts('expandSidebar'),
    items: [
      ...routes.map(([key, href]) => ({
        key: href,
        href,
        label: t(key),
        icon: icons[key],
      })),
      {
        key: 'search',
        label: t('search'),
        icon: icons.search,
        onPress: () => window.dispatchEvent(new Event(FOCUS_SEARCH_EVENT)),
      },
    ],
    selected: pathname.startsWith('/block/')
      ? '/blocks'
      : (routes.find(
          ([, href]) => href !== '/' && pathname.startsWith(href),
        )?.[1] ?? pathname),
    onNavigate: (item) => {
      if (item.href) navigate(item.href)
    },
    modes: [
      { key: 'mainnet', label: ts('mainnet'), icon: icons.network },
      { key: 'testnet', label: ts('testnet'), icon: icons.network },
    ],
    mode: currentNetwork,
    onModeChange: (key) => {
      if (key === 'mainnet' || key === 'testnet') setNetwork(key)
    },
    tree: {
      label: 'Explorer',
      folders: [
        {
          key: 'tools',
          label: t('tools'),
          defaultOpen: pathname.startsWith('/tools'),
          items: tools.map(([key, href]) => ({
            key: href,
            href,
            label: t(key),
          })),
        },
      ],
    },
    selectedTreeItem: pathname,
    onTreeItemPress: (item) => {
      if (item.href) navigate(item.href)
    },
    footer: ({ collapsed }) => <LanguageSelector collapsed={collapsed} />,
  }
}
