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
import { useTranslations } from 'next-intl'

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
    const t = useTranslations('navigation')

    const handleNavigation = () => {
        setOpenMobile(false)
    }

    return (
        <SidebarGroup>
            <SidebarGroupLabel>Explorer</SidebarGroupLabel>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip={t('home')}>
                        <Link href="/" onClick={handleNavigation}>
                            <Home />
                            <span>{t('home')}</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip={t('search')}>
                        <Link href="/search" onClick={handleNavigation}>
                            <Search />
                            <span>{t('search')}</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip={t('blocks')}>
                        <Link href="/blocks" onClick={handleNavigation}>
                            <Blocks />
                            <span>{t('blocks')}</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip={t('transactions')}>
                        <Link href="/tx" onClick={handleNavigation}>
                            <Receipt />
                            <span>{t('transactions')}</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip={t('stats')}>
                        <Link href="/stats" onClick={handleNavigation}>
                            <BarChart3 />
                            <span>{t('stats')}</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip={t('masternodes')}>
                        <Link href="/masternodes" onClick={handleNavigation}>
                            <Shield />
                            <span>{t('masternodes')}</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip={t('mempool')}>
                        <Link href="/mempool" onClick={handleNavigation}>
                            <Clock />
                            <span>{t('mempool')}</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarGroup>
    )
}
