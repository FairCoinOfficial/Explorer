import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 bg-background/60 backdrop-blur border-b">
      <div className="container max-w-6xl mx-auto flex items-center justify-between h-16">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden" />
          <Link href="/" className="text-lg font-bold tracking-tight inline-flex items-center gap-2">
            <span>FairCoin Explorer</span>
          </Link>
        </div>

        <nav className="hidden lg:flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/blocks">Blocks</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/tx">Transactions</Link>
          </Button>
          <Separator className="mx-2 w-px h-6" orientation="vertical" />
          <Button asChild size="sm">
            <Link href="https://fairco.in" target="_blank" rel="noreferrer">FairCoin</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

