import Link from 'next/link'
import {
    ExternalLink,
    Globe,
    Github,
    MessageCircle,
    BookOpen,
} from "lucide-react"
import Image from "next/image"

import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavProjects() {
    return (
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel className="flex items-center gap-2">
                <Image
                    src="/images/FairCoin-Logo.jpg"
                    alt="FairCoin"
                    width={16}
                    height={16}
                    className="rounded-sm"
                />
                FairCoin Resources
            </SidebarGroupLabel>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Official FairCoin Website">
                        <Link href="https://fairco.in" target="_blank" rel="noopener noreferrer">
                            <Globe />
                            <span>Official Website</span>
                            <ExternalLink className="ml-auto h-3 w-3" />
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="FairCoin GitHub Repository">
                        <Link href="https://github.com/FairCoinOfficial/" target="_blank" rel="noopener noreferrer">
                            <Github />
                            <span>GitHub</span>
                            <ExternalLink className="ml-auto h-3 w-3" />
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                        <Link href="https://t.me/FairCoinOfficial" target="_blank" rel="noopener noreferrer">
                            <MessageCircle />
                            <span>Telegram</span>
                            <ExternalLink className="ml-auto h-3 w-3" />
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                        <Link href="https://docs.fairco.in" target="_blank" rel="noopener noreferrer">
                            <BookOpen />
                            <span>Documentation</span>
                            <ExternalLink className="ml-auto h-3 w-3" />
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarGroup>
    )
}
