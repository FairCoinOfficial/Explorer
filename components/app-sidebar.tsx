"use client"

import * as React from "react"
import {
    AudioWaveform,
    BookOpen,
    Bot,
    Command,
    Frame,
    GalleryVerticalEnd,
    Map,
    PieChart,
    Settings2,
    SquareTerminal,
    Home,
    Layers,
    List,
    Hash,
    Search,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
} from "@/components/ui/sidebar"

// This is sample data.
const data = {
    user: {
        name: "Explorer",
        email: "explorer@fairco.in",
        avatar: "/avatars/shadcn.jpg",
    },
    teams: [
        {
            name: "FairCoin",
            logo: GalleryVerticalEnd,
            plan: "Explorer",
        },
    ],
    navMain: [
        {
            title: "Overview",
            url: "/",
            icon: Home,
            isActive: true,
        },
        {
            title: "Blocks",
            url: "/blocks",
            icon: Layers,
        },
        {
            title: "Transactions",
            url: "/tx",
            icon: List,
        },
        {
            title: "Search",
            url: "/search",
            icon: Search,
        },
    ],
    projects: [
        {
            name: "FairCoin Network",
            url: "https://fairco.in",
            icon: Frame,
        },
    ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <TeamSwitcher />
            </SidebarHeader>
            <SidebarContent>
                <NavMain />
                <NavProjects />
            </SidebarContent>
            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
