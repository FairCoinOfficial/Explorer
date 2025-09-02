import './globals.css';
import type { Metadata, Viewport } from 'next';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { SiteHeader } from '@/components/site/header';
import { PWAInstallPrompt } from '@/components/pwa-install-prompt';
import { NetworkProvider } from '@/contexts/network-context';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f0f23' }
  ],
  colorScheme: 'dark light',
};

export const metadata: Metadata = {
  title: {
    default: 'FairCoin Explorer - Blockchain Explorer & Analytics',
    template: '%s | FairCoin Explorer'
  },
  description: 'Explore the FairCoin blockchain with our comprehensive explorer. View blocks, transactions, addresses, and network statistics in real-time. Fast, secure, and user-friendly blockchain analytics.',
  keywords: [
    'blockchain explorer',
    'faircoin',
    'cryptocurrency',
    'blockchain analytics',
    'crypto explorer',
    'block explorer',
    'transaction history',
    'blockchain data',
    'crypto analytics',
    'faircoin explorer',
    'blockchain search',
    'crypto transactions',
    'blockchain statistics',
    'faircoin blockchain',
    'crypto network'
  ],
  authors: [
    { name: 'FairCoin Team', url: 'https://fairco.in' },
    { name: 'FairCoin Explorer', url: 'http://localhost:3000' }
  ],
  creator: 'FairCoin Team',
  publisher: 'FairCoin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('http://localhost:3000'),
  alternates: {
    canonical: '/',
    languages: {
      'en': '/en',
      'es': '/es',
      'fr': '/fr',
      'de': '/de',
      'ja': '/ja',
      'ko': '/ko',
      'zh': '/zh',
      'ru': '/ru'
    }
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FairCoin Explorer',
  },
  applicationName: 'FairCoin Explorer',
  category: 'finance',
  classification: 'blockchain explorer',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
    yahoo: 'your-yahoo-verification-code',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'http://localhost:3000',
    siteName: 'FairCoin Explorer',
    title: 'FairCoin Explorer - Blockchain Explorer & Analytics',
    description: 'Explore the FairCoin blockchain with our comprehensive explorer. View blocks, transactions, addresses, and network statistics in real-time.',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@faircoin',
    creator: '@faircoin',
    title: 'FairCoin Explorer - Blockchain Explorer & Analytics',
    description: 'Explore the FairCoin blockchain with our comprehensive explorer. View blocks, transactions, addresses, and network statistics in real-time.',
  },
  other: {
    'msapplication-TileColor': '#6366f1',
    'msapplication-config': '/browserconfig.xml',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'FairCoin Explorer',
    'mobile-web-app-capable': 'yes',
    'format-detection': 'telephone=no',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/icons/icon-192x192.png',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="application-name" content="FairCoin Explorer" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="FairCoin Explorer" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#6366f1" />
        <meta name="msapplication-tap-highlight" content="no" />

        {/* Theme Colors */}
        <meta name="theme-color" content="#0f0f23" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />

        {/* SEO Meta Tags */}
        <meta name="author" content="FairCoin Team" />
        <meta name="copyright" content="FairCoin" />
        <meta name="language" content="English" />
        <meta name="revisit-after" content="1 days" />
        <meta name="distribution" content="global" />
        <meta name="rating" content="general" />
        <meta name="coverage" content="worldwide" />
        <meta name="target" content="all" />
        <meta name="HandheldFriendly" content="true" />
        <meta name="MobileOptimized" content="width" />

        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-192x192.png" />
        <link rel="shortcut icon" href="/icons/icon-192x192.png" />

        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* DNS Prefetch for performance */}
        <link rel="dns-prefetch" href="//fairco.in" />
        <link rel="dns-prefetch" href="//api.fairco.in" />

        {/* Service Worker Registration Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />

        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "FairCoin Explorer",
              "description": "Explore the FairCoin blockchain with our comprehensive explorer. View blocks, transactions, addresses, and network statistics in real-time.",
              "url": "http://localhost:3000",
              "applicationCategory": "FinanceApplication",
              "operatingSystem": "Web Browser",
              "browserRequirements": "Requires JavaScript. Requires HTML5.",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "author": {
                "@type": "Organization",
                "name": "FairCoin Team",
                "url": "https://fairco.in"
              },
              "publisher": {
                "@type": "Organization",
                "name": "FairCoin",
                "url": "https://fairco.in"
              },
              "softwareVersion": "1.0.0",
              "featureList": [
                "Blockchain Explorer",
                "Transaction History",
                "Address Lookup",
                "Network Statistics",
                "Real-time Data",
                "Mobile Responsive"
              ]
            })
          }}
        />
      </head>
      <body className={`${inter.className} min-h-screen bg-background text-foreground`}>
        <NextIntlClientProvider messages={messages}>
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
        </NextIntlClientProvider>

        {/* PWA Install Prompt */}
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
