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

export function NavMain() {
    return (
        <SidebarGroup>
            <SidebarGroupLabel>Explorer</SidebarGroupLabel>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Home Dashboard">
                        <Link href="/">
                            <Home />
                            <span>Dashboard</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Search Blockchain">
                        <Link href="/search">
                            <Search />
                            <span>Search</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Browse Blocks">
                        <Link href="/blocks">
                            <Blocks />
                            <span>Blocks</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="View Transactions">
                        <Link href="/tx">
                            <Receipt />
                            <span>Transactions</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Network Statistics">
                        <Link href="/stats">
                            <BarChart3 />
                            <span>Statistics</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Masternode Network">
                        <Link href="/masternodes">
                            <Shield />
                            <span>Masternodes</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Transaction Pool">
                        <Link href="/mempool">
                            <Clock />
                            <span>Mempool</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarGroup>
    )
}
