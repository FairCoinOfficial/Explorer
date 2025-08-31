"use client"

import * as React from "react"
import { ChevronsUpDown, Plus, Check } from "lucide-react"
import { useNetwork } from "@/contexts/network-context"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"

export function TeamSwitcher() {
    const { isMobile } = useSidebar()
    const { currentNetwork, setNetwork, networkConfig, networks } = useNetwork()

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-primary data-[state=open]:text-primary-foreground"
                        >
                            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                <span className="text-sm font-bold">{networkConfig.shortName}</span>
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">FairCoin</span>
                                <span className="truncate text-xs">{networkConfig.displayName.replace('FairCoin ', '')}</span>
                            </div>
                            <ChevronsUpDown className="ml-auto" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                        align="start"
                        side={isMobile ? "bottom" : "right"}
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                            Networks
                        </DropdownMenuLabel>
                        <DropdownMenuItem 
                            onClick={() => setNetwork('mainnet')}
                            className="cursor-pointer"
                        >
                            <div className="flex size-6 items-center justify-center rounded-sm border bg-background">
                                <span className="text-xs font-bold">{networks.mainnet.shortName}</span>
                            </div>
                            {networks.mainnet.displayName}
                            {currentNetwork === 'mainnet' && <Check className="ml-auto size-4" />}
                            <DropdownMenuShortcut>⌘M</DropdownMenuShortcut>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            onClick={() => setNetwork('testnet')}
                            className="cursor-pointer"
                        >
                            <div className="flex size-6 items-center justify-center rounded-sm border bg-background">
                                <span className="text-xs font-bold">{networks.testnet.shortName}</span>
                            </div>
                            {networks.testnet.displayName}
                            {currentNetwork === 'testnet' && <Check className="ml-auto size-4" />}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled>
                            <div className="flex size-6 items-center justify-center rounded-sm border bg-background">
                                <Plus className="size-4" />
                            </div>
                            <span>Add Network</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}
