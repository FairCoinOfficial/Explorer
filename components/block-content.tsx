"use client"

import { useNetwork } from '@/contexts/network-context'
import { NetworkStatus } from '@/components/network-status'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CopyButton } from '@/components/copy-button'
import { Hash, Clock, Database, ArrowLeft, ArrowRight, RefreshCw, Home, Receipt } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

interface Block {
    hash: string
    height: number
    version: number
    merkleroot: string
    time: number
    nonce: number
    bits: string
    difficulty: number
    chainwork: string
    nTx: number
    size: number
    weight?: number
    tx: string[]
    previousblockhash?: string
    nextblockhash?: string
    confirmations: number
}

export function BlockContent({ hashOrHeight }: { hashOrHeight: string }) {
    const { currentNetwork } = useNetwork()
    const [block, setBlock] = useState<Block | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const t = useTranslations('blocks')
    const common = useTranslations('common')

    const fetchBlock = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch(`/api/block/${hashOrHeight}?network=${currentNetwork}`)
            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to fetch block')
            }

            const data = await response.json()
            setBlock(data.block)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchBlock()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentNetwork, hashOrHeight])

    if (loading) {
        return (
            <div className="flex-1 space-y-4 p-8">
                <div className="text-center">
                    <p>{common('loading')}</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex-1 space-y-4 p-8">
                <div className="text-center text-red-500">
                    <p>{common('error')}: {error}</p>
                </div>
            </div>
        )
    }

    if (!block) {
        return (
            <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-8">
                <div className="flex items-center justify-center h-64">
                    <p className="text-lg text-muted-foreground">Block not found</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('block')} #{block.height}</h2>
                    <p className="text-sm text-muted-foreground sm:text-base">
                        {t('details')}
                    </p>
                </div>
                <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
                    <div className="flex items-center space-x-2">
                        <NetworkStatus />
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                            <Database className="w-3 h-3 mr-1" />
                            {block.tx.length} TX
                        </Badge>
                    </div>
                    <Button onClick={fetchBlock} variant="outline" size="sm" className="w-full sm:w-auto">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {t('refresh')}
                    </Button>
                </div>
            </div>

            {/* Block Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('blockHeight')}</CardTitle>
                        <Hash className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{block.height.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">{t('blockNumber')}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{common('transactions')}</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{block.tx.length.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">{t('totalTransactions')}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('blockSize')}</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {(block.size / 1024).toFixed(1)} KB
                        </div>
                        <p className="text-xs text-muted-foreground">{block.size.toLocaleString()} {t('bytes')}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{common('confirmations')}</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{block.confirmations.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">{t('networkConfirmations')}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Block Details */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Hash className="h-5 w-5" />
                        {t('blockInformation')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">{t('blockHash')}</label>
                            <div className="flex items-center gap-2 mt-1">
                                <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">
                                    {block.hash}
                                </code>
                                <CopyButton text={block.hash} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">{t('timestamp')}</label>
                                <p className="mt-1">{new Date(block.time * 1000).toLocaleString()}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">{t('difficulty')}</label>
                                <p className="mt-1 font-mono">{block.difficulty.toFixed(6)}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">{t('nonce')}</label>
                                <p className="mt-1 font-mono">{block.nonce.toLocaleString()}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">{t('version')}</label>
                                <p className="mt-1 font-mono">{block.version}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">{t('bits')}</label>
                                <p className="mt-1 font-mono">{block.bits}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">{t('weight')}</label>
                                <p className="mt-1 font-mono">
                                    {block.weight ? block.weight.toLocaleString() : 'N/A'}
                                </p>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-muted-foreground">{t('merkleRoot')}</label>
                            <div className="flex items-center gap-2 mt-1">
                                <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">
                                    {block.merkleroot}
                                </code>
                                <CopyButton text={block.merkleroot} />
                            </div>
                        </div>

                        {block.previousblockhash && (
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">{t('previousBlock')}</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <Link
                                        href={`/block/${block.previousblockhash}`}
                                        className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all hover:bg-muted/80 transition-colors"
                                    >
                                        {block.previousblockhash}
                                    </Link>
                                    <CopyButton text={block.previousblockhash} />
                                </div>
                            </div>
                        )}

                        {block.nextblockhash && (
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">{t('nextBlock')}</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <Link
                                        href={`/block/${block.nextblockhash}`}
                                        className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all hover:bg-muted/80 transition-colors"
                                    >
                                        {block.nextblockhash}
                                    </Link>
                                    <CopyButton text={block.nextblockhash} />
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Block Navigation */}
            <div className="flex justify-between items-center">
                <Button
                    asChild
                    variant="outline"
                    disabled={!block.previousblockhash}
                >
                    <Link href={block.previousblockhash ? `/block/${block.height - 1}` : '#'}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {t('previousBlock')}
                    </Link>
                </Button>

                <Button asChild variant="outline">
                    <Link href="/">
                        <Home className="h-4 w-4 mr-2" />
                        {t('backToHome')}
                    </Link>
                </Button>

                <Button
                    asChild
                    variant="outline"
                    disabled={!block.nextblockhash}
                >
                    <Link href={block.nextblockhash ? `/block/${block.height + 1}` : '#'}>
                        {t('nextBlock')}
                        <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                </Button>
            </div>

            {/* Transactions */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                    <Receipt className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold">{t('transactionsList')}</h2>
                    <Badge variant="secondary" className="ml-auto">
                        {block.tx.length} {common('transactions')}
                    </Badge>
                </div>

                {block.tx.length > 0 ? (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('transactionId')}</TableHead>
                                    <TableHead className="text-right">{t('index')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {block.tx.map((txid, index) => (
                                    <TableRow key={txid}>
                                        <TableCell className="font-mono text-sm">
                                            <Link
                                                href={`/tx/${txid}`}
                                                className="hover:underline break-all"
                                            >
                                                {txid}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant="outline">#{index}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <p className="text-muted-foreground">{t('noTransactions')}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
