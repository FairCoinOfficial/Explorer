"use client"

import Link from 'next/link'
import {
    Home,
    Search,
    Blocks,
    Receipt,
    Settings,
    BarChart3,
    Shield,
    Clock,
    Database
} from "lucide-react"

import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useSidebar } from "@/components/ui/sidebar"

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
                    <SidebarMenuButton asChild tooltip="Home Dashboard">
                        <Link href="/" onClick={handleNavigation}>
                            <Home />
                            <span>Dashboard</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Search Blockchain">
                        <Link href="/search" onClick={handleNavigation}>
                            <Search />
                            <span>Search</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Browse Blocks">
                        <Link href="/blocks" onClick={handleNavigation}>
                            <Blocks />
                            <span>Blocks</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="View Transactions">
                        <Link href="/tx" onClick={handleNavigation}>
                            <Receipt />
                            <span>Transactions</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Network Statistics">
                        <Link href="/stats" onClick={handleNavigation}>
                            <BarChart3 />
                            <span>Statistics</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Masternode Network">
                        <Link href="/masternodes" onClick={handleNavigation}>
                            <Shield />
                            <span>Masternodes</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Transaction Pool">
                        <Link href="/mempool" onClick={handleNavigation}>
                            <Clock />
                            <span>Mempool</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarGroup>
    )
}
