import { Link, useLocation } from 'react-router-dom'
import {
  Home,
  Search,
  Blocks,
  Receipt,
  BarChart3,
  Shield,
  Clock,
  Users,
  Network,
  Wrench,
  ChevronsLeft,
  ChevronsRight,
  type LucideIcon,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { useNetwork } from "@/contexts/network-context"
import { useTranslations } from "@/lib/i18n"
import { LanguageSelector } from "@/components/language-selector"
import { toast } from 'sonner'

interface NavItemProps {
  icon: LucideIcon
  label: string
  to: string
  collapsed?: boolean
}

function NavItem({ icon: Icon, label, to, collapsed }: NavItemProps) {
  const location = useLocation()
  const { setOpenMobile } = useSidebar()
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to))

  if (collapsed) {
    return (
      <Link
        to={to}
        title={label}
        onClick={() => setOpenMobile(false)}
        className={cn(
          "group/nav-icon flex w-10 h-10 rounded-full items-center justify-center transition-colors",
          isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted active:bg-muted/80",
        )}
      >
        <Icon
          size={20}
          className={cn(
            "transition-transform group-hover/nav-icon:scale-110",
            isActive ? "text-primary-foreground" : "text-foreground",
          )}
        />
      </Link>
    )
  }

  return (
    <div className="relative flex w-full min-w-0 flex-col px-1.5 py-0.5 shrink-0">
      <div className="flex w-full min-w-0 flex-col gap-px">
        <div className="group/menu-item whitespace-nowrap font-semibold mx-1 relative">
          <Link
            to={to}
            onClick={() => setOpenMobile(false)}
            className={cn(
              "flex flex-row items-center gap-2 overflow-hidden rounded-full text-left h-[36px] w-full px-3 transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted active:bg-muted/80",
            )}
          >
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              <Icon size={18} className={isActive ? "text-primary-foreground" : "text-foreground"} />
            </div>
            <span className={cn(
              "text-sm select-none font-semibold",
              isActive ? "text-primary-foreground" : "text-foreground",
            )}>
              {label}
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { state, isMobile, toggleSidebar } = useSidebar()
  const { currentNetwork, setNetwork } = useNetwork()
  const collapsed = state === 'collapsed' && !isMobile
  const t = useTranslations('nav')
  const tSidebar = useTranslations('sidebar')

  const mainNav = [
    { icon: Home, label: t('home'), to: '/' },
    { icon: Search, label: t('search'), to: '/search' },
    { icon: Blocks, label: t('blocks'), to: '/blocks' },
    { icon: Receipt, label: t('transactions'), to: '/tx' },
  ]

  const networkNav = [
    { icon: BarChart3, label: t('stats'), to: '/stats' },
    { icon: Shield, label: t('masternodes'), to: '/masternodes' },
    { icon: Clock, label: t('mempool'), to: '/mempool' },
    { icon: Users, label: t('peers'), to: '/peers' },
    { icon: Network, label: t('network'), to: '/network-status' },
  ]

  const toolsNav = [
    { icon: Wrench, label: t('tools'), to: '/tools/fee-calculator' },
  ]

  return (
    <Sidebar {...props}>
      {/* Header: logo + collapse toggle */}
      <SidebarHeader className={cn(
        "h-14 flex-row items-center px-2",
        collapsed && "justify-center px-0"
      )}>
        {collapsed ? (
          <Link to="/" className="flex items-center justify-center no-underline">
            <img src="/images/FairCoin-Logo.jpg" alt="FairCoin" className="w-8 h-8 rounded-lg" />
          </Link>
        ) : (
          <>
            <Link to="/" className="flex items-center gap-2 p-1 mx-0.5 shrink-0 rounded-xl hover:bg-muted no-underline">
              <img src="/images/FairCoin-Logo.jpg" alt="FairCoin" className="w-6 h-6 rounded" />
              <span className="text-sm font-bold text-foreground">FairCoin</span>
            </Link>
            <div className="ms-auto shrink-0">
              <button
                onClick={toggleSidebar}
                className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-muted cursor-pointer"
                aria-label={tSidebar('collapseSidebar')}
              >
                <ChevronsLeft size={18} className="text-muted-foreground" />
              </button>
            </div>
          </>
        )}
      </SidebarHeader>

      {/* Network switcher */}
      {collapsed ? (
        <div className="shrink-0 flex justify-center py-1">
          <button
            onClick={() => {
              const next = currentNetwork === 'mainnet' ? 'testnet' : 'mainnet'
              setNetwork(next)
              toast.success(`Switched to ${next === 'mainnet' ? 'Mainnet' : 'Testnet'}`)
            }}
            className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-muted cursor-pointer"
            title={currentNetwork === 'mainnet' ? tSidebar('mainnetSwitch') : tSidebar('testnetSwitch')}
          >
            <span
              className={cn(
                "w-2.5 h-2.5 rounded-full",
                currentNetwork === 'mainnet' ? "bg-green-500" : "bg-orange-500"
              )}
            />
          </button>
        </div>
      ) : (
        <div className="shrink-0 px-3 pb-1">
          <div className="relative flex flex-col rounded-xl bg-muted/60 p-1 gap-0">
            {/* Sliding indicator */}
            <div
              className="absolute left-1 right-1 h-8 rounded-lg bg-background shadow-sm transition-transform duration-200 ease-out"
              style={{ transform: currentNetwork === 'mainnet' ? 'translateY(0)' : 'translateY(100%)' }}
            />
            <button
              onClick={() => { setNetwork('mainnet'); toast.success('Switched to Mainnet') }}
              className={cn(
                "relative z-10 flex items-center gap-2 rounded-lg px-2 h-8 text-sm transition-colors duration-200 cursor-pointer",
                currentNetwork === 'mainnet'
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {tSidebar('mainnet')}
            </button>
            <button
              onClick={() => { setNetwork('testnet'); toast.success('Switched to Testnet') }}
              className={cn(
                "relative z-10 flex items-center gap-2 rounded-lg px-2 h-8 text-sm transition-colors duration-200 cursor-pointer",
                currentNetwork === 'testnet'
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              {tSidebar('testnet')}
            </button>
          </div>
        </div>
      )}

      {/* Nav items */}
      <SidebarContent>
        {collapsed ? (
          <>
            {/* Collapsed: icon columns */}
            <div className="flex flex-col items-center gap-1 py-1 shrink-0">
              {mainNav.map((item) => (
                <NavItem key={item.to} {...item} collapsed />
              ))}
            </div>
            <div className="w-8 mx-auto my-1" style={{ borderTop: '1px solid hsl(var(--border) / 0.3)' }} />
            <div className="flex flex-col items-center gap-1 py-1 shrink-0">
              {networkNav.map((item) => (
                <NavItem key={item.to} {...item} collapsed />
              ))}
            </div>
            <div className="w-8 mx-auto my-1" style={{ borderTop: '1px solid hsl(var(--border) / 0.3)' }} />
            <div className="flex flex-col items-center gap-1 py-1 shrink-0">
              {toolsNav.map((item) => (
                <NavItem key={item.to} {...item} collapsed />
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Expanded: full nav items */}
            <div className="shrink-0">
              {mainNav.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>
            <div className="mx-2 my-1" style={{ borderTop: '1px solid hsl(var(--border) / 0.3)' }} />
            <div className="shrink-0">
              {networkNav.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>
            <div className="mx-2 my-1" style={{ borderTop: '1px solid hsl(var(--border) / 0.3)' }} />
            <div className="shrink-0">
              {toolsNav.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>
          </>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className={cn(collapsed && "items-center")}>
        <LanguageSelector collapsed={collapsed} />
        {collapsed && (
          <button
            onClick={toggleSidebar}
            className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label={tSidebar('expandSidebar')}
          >
            <ChevronsRight size={18} />
          </button>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
