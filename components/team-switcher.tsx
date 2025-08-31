"use client"

import * as React from "react"
import { ChevronsUpDown, Plus, Check } from "lucide-react"
import { useNetwork } from "@/contexts/network-context"
import Image from "next/image"

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
                            tooltip="Switch Network"
                        >
                            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-white p-1">
                                <Image
                                    src="/images/FairCoin-Logo.jpg"
                                    alt="FairCoin Logo"
                                    width={24}
                                    height={24}
                                    className="rounded-sm"
                                />
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
                            <div className="flex size-6 items-center justify-center rounded-sm border bg-white p-0.5">
                                <Image
                                    src="/images/FairCoin-Logo.jpg"
                                    alt="FairCoin"
                                    width={16}
                                    height={16}
                                    className="rounded-xs"
                                />
                            </div>
                            {networks.mainnet.displayName}
                            {currentNetwork === 'mainnet' && <Check className="ml-auto size-4" />}
                            <DropdownMenuShortcut>⌘M</DropdownMenuShortcut>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => setNetwork('testnet')}
                            className="cursor-pointer"
                        >
                            <div className="flex size-6 items-center justify-center rounded-sm border bg-white p-0.5">
                                <Image
                                    src="/images/FairCoin-Logo.jpg"
                                    alt="FairCoin"
                                    width={16}
                                    height={16}
                                    className="rounded-xs opacity-60"
                                />
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
