import './globals.css';
import type { Metadata } from 'next';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { SiteHeader } from '@/components/site/header';
import { NetworkProvider } from '@/contexts/network-context';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FairCoin Explorer',
  description: 'Fast, friendly FairCoin blockchain explorer',
  metadataBase: new URL('http://localhost:3000'),
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-background text-foreground`}>
        <NetworkProvider>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <SiteHeader />
              <div className="flex flex-1 flex-col gap-4 p-2 pt-0 md:p-3 lg:p-4">
                {children}
              </div>
            </SidebarInset>
          </SidebarProvider>
        </NetworkProvider>
      </body>
    </html>
  );
}
