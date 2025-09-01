'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HeroSearch } from '@/components/site/hero-search';
import { NetworkStatus } from '@/components/network-status';
import { BlocksTable } from '@/components/ui/blocks-table';
import { Activity, Blocks, TrendingUp, Clock, Hash, Users, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface PageContentProps {
    height: number;
    blocks: any[];
    txFeed: string[];
}

export function PageContent({ height, blocks, txFeed }: PageContentProps) {
    const t = useTranslations('common');
    const nav = useTranslations('navigation');

    const latest = blocks[0] ?? null;

    return (
        <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <div className="flex-1">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">FairCoin Explorer</h1>
                    <p className="text-sm text-muted-foreground mt-1 hidden sm:block">{t('exploreFairCoin')}</p>
                </div>
                <div className="flex items-center space-x-2">
                    <NetworkStatus />
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                        <Activity className="w-3 h-3 mr-1" />
                        <span className="hidden sm:inline">{t('live')}</span>
                    </Badge>
                </div>
            </div>

            {/* Quick Navigation */}
            <div className="flex flex-wrap gap-2 sm:gap-3">
                <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
                    <Link href="/blocks">
                        <Blocks className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">{t('viewAllBlocks')}</span>
                        <span className="sm:hidden">{nav('blocks')}</span>
                    </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
                    <Link href="/tx">
                        <Hash className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">{t('viewAllTransactions')}</span>
                        <span className="sm:hidden">{nav('transactions')}</span>
                    </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
                    <Link href="/stats">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">{t('networkStats')}</span>
                        <span className="sm:hidden">{nav('stats')}</span>
                    </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
                    <Link href="/masternodes">
                        <Users className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">{nav('masternodes')}</span>
                    </Link>
                </Button>
            </div>

            {/* Hero Search */}
            <div className="my-6 sm:my-8">
                <HeroSearch />
            </div>

            {/* Stats Cards */}
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('currentHeight')}</CardTitle>
                        <Blocks className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{height.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            {t('latestBlock')}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('latestTransactions')}</CardTitle>
                        <Hash className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{latest?.nTx || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {t('inLatestBlock')}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('blockTime')}</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">~3{t('minutes')}</div>
                        <p className="text-xs text-muted-foreground">
                            {t('averageTime')}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('network')}</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{t('active')}</div>
                        <p className="text-xs text-muted-foreground">
                            {t('mainnet')}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Latest Content */}
            <Tabs defaultValue="blocks" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="blocks">{t('latestBlocks')}</TabsTrigger>
                    <TabsTrigger value="transactions">{t('latestTransactions')}</TabsTrigger>
                </TabsList>

                <TabsContent value="blocks" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-lg font-semibold">{t('recentBlocks')}</CardTitle>
                            <Button asChild variant="ghost" size="sm">
                                <Link href="/blocks" className="text-primary hover:text-primary/80">
                                    {t('viewAll')} <ArrowUpRight className="ml-1 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <BlocksTable blocks={blocks} currentPage={1} totalPages={1} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="transactions" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-lg font-semibold">{t('recentTransactions')}</CardTitle>
                            <Button asChild variant="ghost" size="sm">
                                <Link href="/tx" className="text-primary hover:text-primary/80">
                                    {t('viewAll')} <ArrowUpRight className="ml-1 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {txFeed.length > 0 ? (
                                <div className="rounded-md border overflow-auto custom-scrollbar">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead className="font-semibold whitespace-nowrap h-8 px-2">{t('transactionId')}</TableHead>
                                                <TableHead className="font-semibold whitespace-nowrap h-8 px-2">{t('status')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {txFeed.slice(0, 10).map((txid, index) => (
                                                <TableRow key={txid} className={`group hover:bg-muted/50 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}>
                                                    <TableCell className="font-mono text-sm py-2 px-2">
                                                        <Link href={`/tx/${txid}`} className="hover:underline text-primary font-medium">
                                                            {txid.slice(0, 16)}...
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell className="py-2 px-2">
                                                        <Badge variant="secondary" className="text-xs">
                                                            {t('confirmed')}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <p className="text-center text-muted-foreground py-8">
                                    {t('noTransactions')}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
