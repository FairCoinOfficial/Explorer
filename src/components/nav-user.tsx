import { Link } from 'react-router-dom'
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
    const { isMobile, setOpenMobile } = useSidebar()
    const { currentNetwork } = useNetwork()

    const handleNavigation = () => {
        setOpenMobile(false)
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-primary data-[state=open]:text-primary-foreground"
                            tooltip="Explorer Tools"
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
                        <DropdownMenuLabel className="text-xs text-muted-foreground">Quick Tools</DropdownMenuLabel>
                        <DropdownMenuGroup>
                            <DropdownMenuItem asChild>
                                <Link to="/search" className="cursor-pointer" onClick={handleNavigation}>
                                    <Search className="size-4" />Advanced Search
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link to="/tools/fee-calculator" className="cursor-pointer" onClick={handleNavigation}>
                                    <Calculator className="size-4" />Fee Calculator
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link to="/tools/address-validator" className="cursor-pointer" onClick={handleNavigation}>
                                    <Wallet className="size-4" />Address Validator
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs text-muted-foreground">Network Info</DropdownMenuLabel>
                        <DropdownMenuGroup>
                            <DropdownMenuItem asChild>
                                <Link to="/stats" className="cursor-pointer" onClick={handleNavigation}>
                                    <TrendingUp className="size-4" />Network Statistics
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link to="/network-status" className="cursor-pointer" onClick={handleNavigation}>
                                    <Activity className="size-4" />Network Status
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem asChild>
                                <a href="https://docs.fairco.in" target="_blank" rel="noopener noreferrer" className="cursor-pointer" onClick={handleNavigation}>
                                    <Info className="size-4" />API Documentation<ExternalLink className="ml-auto size-3" />
                                </a>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}
