"use client"

import { useTranslations } from 'next-intl'
import { useNetwork } from '@/contexts/network-context'
import { NetworkStatus } from '@/components/network-status'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Clock, Zap, RefreshCw, Home, Hash, Database } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { SectionHeader, StatsCard, StatsGrid, LoadingState, EmptyState } from '@/components/ui'

interface MempoolTransaction {
    txid: string
    size: number
    fee: number
    feeRate: number
    time: number
    depends: string[]
}

interface MempoolInfo {
    size: number
    bytes: number
    usage: number
    maxmempool: number
    mempoolminfee: number
    transactions: MempoolTransaction[]
}

export default function MempoolContent() {
  const t = useTranslations('mempool')
  const tCommon = useTranslations('common')
  const { currentNetwork } = useNetwork()
  const [mempoolInfo, setMempoolInfo] = useState<MempoolInfo | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchMempool = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch(`/api/mempool?network=${currentNetwork}`)
            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to fetch mempool information')
            }

            const data = await response.json()
            setMempoolInfo(data.mempoolInfo)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchMempool()
        // Auto-refresh every 10 seconds
        const interval = setInterval(fetchMempool, 10000)
        return () => clearInterval(interval)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentNetwork])

    if (loading) {
        return (
            <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
                <LoadingState message={t('loading')} />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
                <EmptyState
                    icon={Database}
                    title={t('error_loading')}
                    description={error}
                    action={{
                        label: tCommon('try_again'),
                        onClick: fetchMempool
                    }}
                />
            </div>
        )
    }

    if (!mempoolInfo) {
        return (
            <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
                <div className="flex items-center justify-center h-64">
                    <p className="text-lg text-muted-foreground">{t('no_mempool_info')}</p>
                </div>
            </div>
        )
    }

    const utilizationPercent = mempoolInfo.maxmempool > 0
        ? (mempoolInfo.bytes / mempoolInfo.maxmempool) * 100
        : 0

    return (
        <div className="flex-1 space-y-3 sm:space-y-4 p-2 pt-3 sm:p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('title')}</h2>
                    <p className="text-sm text-muted-foreground sm:text-base">
                        {t('description')}
                    </p>
                </div>
                <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
                    <div className="flex items-center space-x-2">
                        <NetworkStatus />
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {t('auto_refresh', { seconds: '10' })}
                        </Badge>
                    </div>
                    <Button onClick={fetchMempool} variant="outline" size="sm" className="w-full sm:w-auto">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Mempool Stats */}
            <div className="space-y-4">
                <SectionHeader
                    icon={Database}
                    title={t('statistics')}
                />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="border rounded-lg p-4">
                        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <h4 className="text-sm font-medium">{t('pending_transactions')}</h4>
                            <Hash className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-2xl font-bold">{mempoolInfo.size.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">{t('unconfirmed_transactions')}</p>
                    </div>

                    <div className="border rounded-lg p-4">
                        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <h4 className="text-sm font-medium">{t('memory_usage')}</h4>
                            <Database className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-2xl font-bold">
                            {(mempoolInfo.bytes / 1024 / 1024).toFixed(1)} MB
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('capacity_usage', { percentage: utilizationPercent.toFixed(1) })}
                        </p>
                    </div>

                    <div className="border rounded-lg p-4">
                        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <h4 className="text-sm font-medium">{t('min_fee_rate')}</h4>
                            <Zap className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-2xl font-bold">
                            {(mempoolInfo.mempoolminfee * 100000000).toFixed(0)}
                        </div>
                        <p className="text-xs text-muted-foreground">{t('sat_vb_minimum')}</p>
                    </div>

                    <div className="border rounded-lg p-4">
                        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <h4 className="text-sm font-medium">{t('avg_tx_size')}</h4>
                            <Database className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-2xl font-bold">
                            {mempoolInfo.size > 0 ? Math.round(mempoolInfo.bytes / mempoolInfo.size) : 0}
                        </div>
                        <p className="text-xs text-muted-foreground">{t('bytes_per_transaction')}</p>
                    </div>
                </div>
            </div>

            {/* Mempool Utilization */}
            <div className="space-y-4">
                <SectionHeader
                    icon={Database}
                    title={t('utilization')}
                />
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{t('memory_used')}</span>
                        <span className="text-sm text-muted-foreground">
                            {(mempoolInfo.bytes / 1024 / 1024).toFixed(2)} MB / {(mempoolInfo.maxmempool / 1024 / 1024).toFixed(0)} MB
                        </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                        <div
                            className={`h-3 rounded-full transition-all duration-300 ${utilizationPercent > 80 ? 'bg-destructive' :
                                utilizationPercent > 60 ? 'bg-yellow-500' : 'bg-primary'
                                }`}
                            style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0%</span>
                        <span className="font-medium">{utilizationPercent.toFixed(1)}%</span>
                        <span>100%</span>
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="space-y-4">
                <SectionHeader
                    icon={Clock}
                    title={t('recent_transactions')}
                    badge={{
                        text: t('pending_count', { count: mempoolInfo.transactions.length }),
                        variant: 'secondary'
                    }}
                />

                {mempoolInfo.transactions.length > 0 ? (
                    <div className="rounded-md border overflow-auto custom-scrollbar">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('transaction_id')}</TableHead>
                                    <TableHead>{tCommon('size')}</TableHead>
                                    <TableHead>{tCommon('fee')}</TableHead>
                                    <TableHead>{t('fee_rate')}</TableHead>
                                    <TableHead>{t('time_in_pool')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {mempoolInfo.transactions.slice(0, 20).map((tx) => (
                                    <TableRow key={tx.txid}>
                                        <TableCell className="font-mono text-sm">
                                            <Link
                                                href={`/tx/${tx.txid}`}
                                                className="hover:underline break-all"
                                            >
                                                {tx.txid.substring(0, 16)}...
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {tx.size.toLocaleString()} bytes
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono">
                                            {(tx.fee * 100000000).toFixed(0)} sat
                                        </TableCell>
                                        <TableCell className="font-mono">
                                            {tx.feeRate.toFixed(1)} sat/vB
                                        </TableCell>
                                        <TableCell>
                                                                    <TableCell>
                            {t('time_ago', { minutes: Math.round((Date.now() / 1000 - tx.time) / 60) })}
                        </TableCell>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">{t('mempool_empty')}</h3>
                        <p className="text-muted-foreground">
                            {t('mempool_empty_description')}
                        </p>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                    <Zap className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">{t('quick_actions')}</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="border rounded-lg p-4">
                        <h4 className="text-sm font-medium mb-3">{tCommon('navigation')}</h4>
                        <div className="space-y-3">
                            <Button asChild variant="outline" className="w-full justify-start">
                                <Link href="/blocks">
                                    <Database className="h-4 w-4 mr-2" />
                                    {tCommon('view_recent_blocks')}
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="w-full justify-start">
                                <Link href="/stats">
                                    <Hash className="h-4 w-4 mr-2" />
                                    {tCommon('network_statistics')}
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <div className="border rounded-lg p-4">
                        <h4 className="text-sm font-medium mb-3">{t('mempool_tips')}</h4>
                        <div className="space-y-2 text-sm text-muted-foreground">
                            <p>• {t('tip_1')}</p>
                            <p>• {t('tip_2', { rate: (mempoolInfo.mempoolminfee * 100000000).toFixed(0) })}</p>
                            <p>• {t('tip_3')}</p>
                            <p>• {t('tip_4')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-center">
                <Button asChild variant="outline">
                    <Link href="/">
                        <Home className="h-4 w-4 mr-2" />
                        {tCommon('back_to_home')}
                    </Link>
                </Button>
            </div>
        </div>
    )
}
