import { Link } from 'react-router-dom'
import {
  Home,
  Search,
  Blocks,
  Receipt,
  BarChart3,
  Shield,
  Clock,
  Users,
} from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavMain() {
  const { setOpenMobile } = useSidebar()

  const handleNavigation = () => {
    setOpenMobile(false)
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Explorer</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip="Home">
            <Link to="/" onClick={handleNavigation}>
              <Home />
              <span>Home</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip="Search">
            <Link to="/search" onClick={handleNavigation}>
              <Search />
              <span>Search</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip="Blocks">
            <Link to="/blocks" onClick={handleNavigation}>
              <Blocks />
              <span>Blocks</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip="Transactions">
            <Link to="/tx" onClick={handleNavigation}>
              <Receipt />
              <span>Transactions</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip="Stats">
            <Link to="/stats" onClick={handleNavigation}>
              <BarChart3 />
              <span>Stats</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip="Masternodes">
            <Link to="/masternodes" onClick={handleNavigation}>
              <Shield />
              <span>Masternodes</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip="Mempool">
            <Link to="/mempool" onClick={handleNavigation}>
              <Clock />
              <span>Mempool</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip="Peers">
            <Link to="/peers" onClick={handleNavigation}>
              <Users />
              <span>Peers</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
