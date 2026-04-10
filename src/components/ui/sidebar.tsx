import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { PanelLeft } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useIsMobile } from "@/hooks/use-mobile"

const SIDEBAR_COOKIE_NAME = "sidebar_state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH = "256px"
const SIDEBAR_WIDTH_COLLAPSED = "48px"
const SIDEBAR_WIDTH_MOBILE = "288px"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

/* ------------------------------------------------------------------ */
/*  Context                                                           */
/* ------------------------------------------------------------------ */

type SidebarContextValue = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

function useSidebar(): SidebarContextValue {
  const ctx = React.useContext(SidebarContext)
  if (!ctx) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }
  return ctx
}

/* ------------------------------------------------------------------ */
/*  Provider                                                          */
/* ------------------------------------------------------------------ */

function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = React.useState(false)

  const [_open, _setOpen] = React.useState(defaultOpen)
  const open = openProp ?? _open

  const setOpen = React.useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof value === "function" ? value(open) : value
      if (setOpenProp) {
        setOpenProp(next)
      } else {
        _setOpen(next)
      }
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${next}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
    },
    [setOpenProp, open],
  )

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((prev) => !prev)
    } else {
      setOpen((prev) => !prev)
    }
  }, [isMobile, setOpen])

  // Keyboard shortcut (Ctrl/Cmd + B) — useEffect is acceptable for global listeners
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === SIDEBAR_KEYBOARD_SHORTCUT && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggleSidebar])

  const state = open ? "expanded" : "collapsed"

  const value = React.useMemo<SidebarContextValue>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar],
  )

  return (
    <SidebarContext.Provider value={value}>
      <div
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-collapsed": SIDEBAR_WIDTH_COLLAPSED,
            ...style,
          } as React.CSSProperties
        }
        className={cn("flex min-h-screen w-full", className)}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

/* ------------------------------------------------------------------ */
/*  Sidebar                                                           */
/* ------------------------------------------------------------------ */

function Sidebar({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar()

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          side="left"
          className="w-[288px] p-0 [&>button]:hidden"
          showCloseButton={false}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Navigation sidebar.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col bg-background">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <>
      {/* Gap div that pushes main content */}
      <div
        className="hidden md:block shrink-0 transition-[width] duration-200 ease-out"
        style={{
          width: state === "expanded" ? SIDEBAR_WIDTH : SIDEBAR_WIDTH_COLLAPSED,
        }}
      />
      {/* Fixed sidebar */}
      <aside
        data-state={state}
        className={cn(
          "fixed inset-y-0 left-0 z-10 hidden md:flex flex-col",
          "bg-background border-r border-border",
          "transition-[width] duration-200 ease-out overflow-hidden",
          className,
        )}
        style={{
          width: state === "expanded" ? SIDEBAR_WIDTH : SIDEBAR_WIDTH_COLLAPSED,
        }}
        {...props}
      >
        {children}
      </aside>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  SidebarInset (main content area)                                  */
/* ------------------------------------------------------------------ */

function SidebarInset({
  className,
  ...props
}: React.ComponentProps<"main">) {
  return (
    <main
      className={cn("flex flex-1 flex-col min-w-0 bg-background", className)}
      {...props}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  SidebarTrigger                                                    */
/* ------------------------------------------------------------------ */

function SidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={(e) => {
        onClick?.(e)
        toggleSidebar()
      }}
      {...props}
    >
      <PanelLeft className="h-4 w-4" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
}

/* ------------------------------------------------------------------ */
/*  Layout sections                                                   */
/* ------------------------------------------------------------------ */

function SidebarHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex shrink-0", className)} {...props} />
  )
}

function SidebarContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-1 flex-col overflow-y-auto overflow-x-hidden", className)}
      {...props}
    />
  )
}

function SidebarFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex shrink-0 mt-auto", className)}
      {...props}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  SidebarGroup / Label / Content                                    */
/* ------------------------------------------------------------------ */

function SidebarGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex w-full flex-col p-2", className)} {...props} />
  )
}

function SidebarGroupLabel({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const { state } = useSidebar()
  const Comp = asChild ? Slot : "div"

  if (state === "collapsed") {
    return null
  }

  return (
    <Comp
      className={cn(
        "flex items-center gap-2 px-2 h-8 text-xs font-semibold text-foreground shrink-0",
        className,
      )}
      {...props}
    />
  )
}

function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("w-full", className)} {...props} />
}

/* ------------------------------------------------------------------ */
/*  SidebarSeparator                                                  */
/* ------------------------------------------------------------------ */

function SidebarSeparator({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("border-t border-border/30 mx-2 my-1", className)}
      {...props}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  SidebarMenu / MenuItem / MenuButton                               */
/* ------------------------------------------------------------------ */

function SidebarMenu({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul className={cn("flex w-full flex-col gap-0.5", className)} {...props} />
  )
}

function SidebarMenuItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return <li className={cn("list-none", className)} {...props} />
}

function SidebarMenuButton({
  asChild = false,
  isActive = false,
  size = "default",
  tooltip,
  className,
  children,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean
  isActive?: boolean
  size?: "default" | "sm" | "lg"
  tooltip?: string | React.ComponentProps<typeof TooltipContent>
}) {
  const Comp = asChild ? Slot : "button"
  const { state, isMobile } = useSidebar()
  const collapsed = state === "collapsed" && !isMobile

  const button = (
    <Comp
      data-active={isActive}
      className={cn(
        // Shared
        "w-full cursor-pointer transition-colors outline-none",
        "disabled:pointer-events-none disabled:opacity-50",
        collapsed
          ? // Collapsed: centered square icon button
            cn(
              "flex items-center justify-center w-10 h-10 rounded-xl mx-auto",
              "[&_svg]:w-5 [&_svg]:h-5 [&_svg]:shrink-0",
              isActive ? "bg-muted" : "hover:bg-muted",
            )
          : // Expanded: full-width row
            cn(
              "flex items-center gap-2 rounded-xl h-[36px] px-2 text-sm font-semibold text-foreground",
              "[&_svg]:w-[18px] [&_svg]:h-[18px] [&_svg]:shrink-0",
              isActive ? "bg-muted" : "hover:bg-muted",
              size === "lg" && "h-12",
              size === "sm" && "h-7 text-xs",
            ),
        className,
      )}
      {...props}
    >
      {collapsed ? (
        // Only render icons (first SVG child) when collapsed
        <CollapsedChildren>{children}</CollapsedChildren>
      ) : (
        children
      )}
    </Comp>
  )

  if (!tooltip) {
    return button
  }

  const tooltipProps: React.ComponentProps<typeof TooltipContent> =
    typeof tooltip === "string" ? { children: tooltip } : tooltip

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent
        side="right"
        align="center"
        hidden={state !== "collapsed" || isMobile}
        {...tooltipProps}
      />
    </Tooltip>
  )
}

/**
 * When the sidebar is collapsed we only want to show SVG icons, not text spans.
 * This component filters children to only render SVG elements (icons).
 */
function CollapsedChildren({ children }: { children: React.ReactNode }) {
  const icons: React.ReactNode[] = []

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    // Keep SVG elements (lucide-react icons render as <svg>)
    // Also keep elements whose type name suggests an icon component
    const typeName =
      typeof child.type === "function" || typeof child.type === "object"
        ? (child.type as { displayName?: string }).displayName ??
          (child.type as { name?: string }).name ??
          ""
        : ""

    if (
      child.type === "svg" ||
      typeName.toLowerCase().includes("icon") ||
      (typeof child.props?.className === "string" &&
        child.props.className.includes("lucide"))
    ) {
      icons.push(child)
    }
    // For Slot/asChild patterns: if the child has children, check those too
    // But for our use case the Link > Icon + span pattern means the Slot wrapper
    // will forward props, so the icons are direct children
  })

  // If no icon was extracted, try to render the first element (fallback)
  if (icons.length === 0) {
    const first = React.Children.toArray(children)[0]
    if (React.isValidElement(first)) {
      return <>{first}</>
    }
  }

  return <>{icons}</>
}

export {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarTrigger,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarSeparator,
  useSidebar,
}
