import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 bg-background/60 backdrop-blur border-b">
      <div className="container max-w-6xl mx-auto flex items-center justify-between h-16">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-bold tracking-tight inline-flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <span>FairCoin Explorer</span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/blocks">Blocks</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/tx">TX</Link>
          </Button>
          <Separator className="mx-2 hidden lg:block w-px h-6" orientation="vertical" />
          <Button asChild size="sm">
            <a href="https://fairco.in" target="_blank" rel="noreferrer">FairCoin</a>
          </Button>
        </nav>

        <nav className="md:hidden">
          <Button asChild size="icon">
            <Link href="/blocks">☰</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

