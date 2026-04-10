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
          "group/nav-icon flex w-10 h-10 rounded-xl items-center justify-center",
          isActive ? "bg-muted" : "hover:bg-muted active:bg-muted/80",
        )}
      >
        <Icon
          size={20}
          className="text-foreground transition-transform group-hover/nav-icon:scale-110"
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
              "flex flex-row items-center gap-1 overflow-hidden rounded-xl text-left h-[36px] border border-transparent w-full p-1.5 no-underline",
              isActive
                ? "bg-muted"
                : "hover:bg-muted active:bg-muted/80",
            )}
          >
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              <Icon size={18} className="text-foreground" />
            </div>
            <span className="text-sm text-foreground select-none font-semibold">
              {label}
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}

const mainNav = [
  { icon: Home, label: 'Home', to: '/' },
  { icon: Search, label: 'Search', to: '/search' },
  { icon: Blocks, label: 'Blocks', to: '/blocks' },
  { icon: Receipt, label: 'Transactions', to: '/tx' },
]

const networkNav = [
  { icon: BarChart3, label: 'Stats', to: '/stats' },
  { icon: Shield, label: 'Masternodes', to: '/masternodes' },
  { icon: Clock, label: 'Mempool', to: '/mempool' },
  { icon: Users, label: 'Peers', to: '/peers' },
  { icon: Network, label: 'Network', to: '/network-status' },
]

const toolsNav = [
  { icon: Wrench, label: 'Tools', to: '/tools/fee-calculator' },
]

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { state, isMobile, toggleSidebar } = useSidebar()
  const collapsed = state === 'collapsed' && !isMobile

  return (
    <Sidebar {...props}>
      {/* Header: logo + collapse toggle */}
      <SidebarHeader className={cn(
        "h-14 flex-row items-center shrink-0 px-2",
        collapsed && "justify-center px-0"
      )}>
        {collapsed ? (
          <Link to="/" className="flex items-center justify-center">
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
                className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-muted cursor-pointer"
                aria-label="Collapse sidebar"
              >
                <ChevronsLeft size={18} className="text-muted-foreground" />
              </button>
            </div>
          </>
        )}
      </SidebarHeader>

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
            <div className="mx-2 border-t border-border/30 w-8 my-1" />
            <div className="flex flex-col items-center gap-1 py-1 shrink-0">
              {networkNav.map((item) => (
                <NavItem key={item.to} {...item} collapsed />
              ))}
            </div>
            <div className="mx-2 border-t border-border/30 w-8 my-1" />
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
            <div className="mx-2 border-t border-border/30 my-1" />
            <div className="shrink-0">
              {networkNav.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>
            <div className="mx-2 border-t border-border/30 my-1" />
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
        {collapsed && (
          <button
            onClick={toggleSidebar}
            className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Expand sidebar"
          >
            <ChevronsRight size={18} />
          </button>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
