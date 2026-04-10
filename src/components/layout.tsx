import { Outlet } from 'react-router-dom'
import { AppSidebar } from './app-sidebar'
import { SidebarInset, SidebarProvider } from './ui/sidebar'
import { SiteHeader } from './site/header'
import { PWAInstallPrompt } from './pwa-install-prompt'
import { Toaster } from './ui/sonner'

export function Layout() {
  return (
    <>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
      <PWAInstallPrompt />
      <Toaster />
    </>
  )
}
