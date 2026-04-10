import {
  ExternalLink,
  Globe,
  Github,
  MessageCircle,
  BookOpen,
} from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavProjects() {
  const { setOpenMobile, state, isMobile } = useSidebar()
  const collapsed = state === "collapsed" && !isMobile

  const handleNavigation = () => {
    setOpenMobile(false)
  }

  if (collapsed) {
    return null
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center gap-2">
        <img src="/images/FairCoin-Logo.jpg" alt="FairCoin" width={16} height={16} className="rounded-sm" />
        FairCoin Resources
      </SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip="Official FairCoin Website">
            <a href="https://fairco.in" target="_blank" rel="noopener noreferrer" onClick={handleNavigation}>
              <Globe /><span>Official Website</span><ExternalLink className="ml-auto h-3 w-3" />
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip="FairCoin GitHub Repository">
            <a href="https://github.com/FairCoinOfficial/" target="_blank" rel="noopener noreferrer" onClick={handleNavigation}>
              <Github /><span>GitHub</span><ExternalLink className="ml-auto h-3 w-3" />
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip="Join FairCoin Telegram Community">
            <a href="https://t.me/FairCoinOfficial" target="_blank" rel="noopener noreferrer" onClick={handleNavigation}>
              <MessageCircle /><span>Telegram</span><ExternalLink className="ml-auto h-3 w-3" />
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip="FairCoin Documentation">
            <a href="https://docs.fairco.in" target="_blank" rel="noopener noreferrer" onClick={handleNavigation}>
              <BookOpen /><span>Documentation</span><ExternalLink className="ml-auto h-3 w-3" />
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
