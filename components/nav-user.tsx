"use client"

import {
    Calculator,
    Search,
    TrendingUp,
    Settings,
    Info,
    ExternalLink,
    Wallet,
    Activity,
    Wrench,
} from "lucide-react"
import { useNetwork } from "@/contexts/network-context"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"

export function NavUser() {
    const { isMobile } = useSidebar()
    const { currentNetwork } = useNetwork()

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
                                <Wrench className="size-4" />
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">Explorer Tools</span>
                                <span className="truncate text-xs">Utilities & Settings</span>
                            </div>
                            <Settings className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                            Quick Tools
                        </DropdownMenuLabel>
                        <DropdownMenuGroup>
                            <DropdownMenuItem asChild>
                                <a href="/search" className="cursor-pointer">
                                    <Search className="size-4" />
                                    Advanced Search
                                </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <a href="/tools/fee-calculator" className="cursor-pointer">
                                    <Calculator className="size-4" />
                                    Fee Calculator
                                </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <a href="/tools/address-validator" className="cursor-pointer">
                                    <Wallet className="size-4" />
                                    Address Validator
                                </a>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                            Network Info
                        </DropdownMenuLabel>
                        <DropdownMenuGroup>
                            <DropdownMenuItem asChild>
                                <a href="/stats" className="cursor-pointer">
                                    <TrendingUp className="size-4" />
                                    Network Statistics
                                </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <a href="/network-status" className="cursor-pointer">
                                    <Activity className="size-4" />
                                    Network Status
                                </a>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem asChild>
                                <a href="https://docs.fairco.in" target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                                    <Info className="size-4" />
                                    API Documentation
                                    <ExternalLink className="ml-auto size-3" />
                                </a>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}
