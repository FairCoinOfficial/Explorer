import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Home, Layers, List, Hash } from 'lucide-react';

export function Sidebar() {
    return (
        <aside className="hidden md:flex flex-col gap-4 p-4 w-60 border rounded-lg bg-background/50 dark:bg-background/30">
            <div className="px-1">
                <nav className="flex flex-col space-y-1">
                    <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold px-2 py-2 rounded-md hover:bg-accent">
                        <Home className="w-4 h-4" /> <span>Overview</span>
                    </Link>

                    <Link href="/blocks" className="inline-flex items-center gap-2 text-sm px-2 py-2 rounded-md hover:bg-accent">
                        <Layers className="w-4 h-4" /> <span>Blocks</span>
                    </Link>

                    <Link href="/tx" className="inline-flex items-center gap-2 text-sm px-2 py-2 rounded-md hover:bg-accent">
                        <List className="w-4 h-4" /> <span>Transactions</span>
                    </Link>

                    <Link href="/search" className="inline-flex items-center gap-2 text-sm px-2 py-2 rounded-md hover:bg-accent">
                        <Hash className="w-4 h-4" /> <span>Search</span>
                    </Link>
                </nav>
            </div>

            <Separator />

            <div className="px-1 text-sm text-muted-foreground">
                <div className="mb-2 font-medium">Explorer</div>
                <div className="text-xs">Lightweight explorer for FairCoin. Fast, private, and minimal.</div>
            </div>
        </aside>
    );
}

export default Sidebar;
