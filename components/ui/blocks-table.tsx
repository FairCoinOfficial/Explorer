"use client"

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { CopyButton } from '@/components/copy-button'
import { useTranslations } from 'next-intl'

interface Block {
    height: number
    hash: string
    time: number
    nTx: number
    size: number
    tx: string[]
}

interface BlocksTableProps {
    blocks: Block[]
    currentPage: number
    totalPages: number
    onPageChange?: (page: number) => void
    loading?: boolean
}

export function BlocksTable({ blocks, currentPage, totalPages, onPageChange, loading = false }: BlocksTableProps) {
    const t = useTranslations('common.table')

    if (loading) {
        return (
            <Card className="overflow-hidden shadow-sm">
                <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex space-x-4">
                                <div className="h-4 bg-muted rounded w-20"></div>
                                <div className="h-4 bg-muted rounded flex-1"></div>
                                <div className="h-4 bg-muted rounded w-32"></div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            {/* Mobile Card View */}
            <div className="block md:hidden space-y-2">
                {blocks.map((block) => (
                    <Card key={block.height} className="hover:shadow-md transition-all duration-200 border-l-4 border-l-primary/30 hover:border-l-primary">
                        <CardContent className="p-3">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <Link
                                        href={`/block/${block.height}`}
                                        className="font-semibold text-base hover:underline text-primary truncate"
                                    >
                                        #{block.height.toLocaleString()}
                                    </Link>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <Badge variant="secondary" className="text-xs font-medium bg-primary/10 text-primary border-primary/20">
                                        {block.nTx?.toLocaleString() ?? block.tx?.length?.toLocaleString() ?? 0} TX
                                    </Badge>
                                    <CopyButton text={block.hash} className="h-5 w-5" />
                                </div>
                            </div>

                            <div className="space-y-1 mb-2">
                                <div className="flex items-start gap-2">
                                    <span className="text-xs text-muted-foreground font-medium flex-shrink-0 mt-0.5">{t('hash')}:</span>
                                    <div className="flex items-center gap-1 min-w-0 flex-1">
                                        <Link
                                            href={`/block/${block.hash}`}
                                            className="font-mono text-sm hover:underline text-primary flex-1 min-w-0 truncate"
                                        >
                                            {block.hash.slice(0, 16)}...
                                        </Link>
                                        <CopyButton text={block.hash} className="h-4 w-4 flex-shrink-0" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1 text-muted-foreground min-w-0 flex-1">
                                    <span className="truncate">
                                        {new Date(block.time * 1000).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                </div>
                                {block.size && (
                                    <div className="flex items-center gap-1 text-muted-foreground ml-2 flex-shrink-0">
                                        <span className="text-xs">{(block.size / 1024).toFixed(1)} KB</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block">
                <Card className="overflow-hidden shadow-sm">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto custom-scrollbar">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="w-[100px] font-semibold whitespace-nowrap h-8 px-2">{t('height')}</TableHead>
                                        <TableHead className="min-w-[200px] lg:min-w-[280px] font-semibold whitespace-nowrap h-8 px-2">{t('hash')}</TableHead>
                                        <TableHead className="w-[140px] font-semibold whitespace-nowrap h-8 px-2">{t('time')}</TableHead>
                                        <TableHead className="w-[110px] hidden lg:table-cell font-semibold whitespace-nowrap h-8 px-2">{t('transactions')}</TableHead>
                                        <TableHead className="w-[90px] hidden lg:table-cell font-semibold whitespace-nowrap h-8 px-2">{t('size')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {blocks.map((block, index) => (
                                        <TableRow key={block.height} className={`group hover:bg-muted/50 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}>
                                            <TableCell className="font-medium whitespace-nowrap py-2 px-2">
                                                <div className="flex items-center gap-2">
                                                    <Link
                                                        href={`/block/${block.height}`}
                                                        className="hover:underline text-primary font-semibold transition-colors"
                                                    >
                                                        {block.height.toLocaleString()}
                                                    </Link>
                                                    <CopyButton text={block.hash} className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm min-w-0 whitespace-nowrap py-2 px-2">
                                                <div className="flex items-center gap-2">
                                                    <Link
                                                        href={`/block/${block.hash}`}
                                                        className="hover:underline text-primary transition-colors flex-1 min-w-0"
                                                    >
                                                        <span className="block truncate">{block.hash}</span>
                                                    </Link>
                                                    <CopyButton text={block.hash} className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap py-2 px-2">
                                                <span className="hidden lg:inline">
                                                    {new Date(block.time * 1000).toLocaleString()}
                                                </span>
                                                <span className="lg:hidden">
                                                    {new Date(block.time * 1000).toLocaleDateString()}
                                                </span>
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell whitespace-nowrap py-2 px-2">
                                                <Badge variant="secondary" className="text-xs font-medium bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors">
                                                    {block.nTx?.toLocaleString() ?? block.tx?.length?.toLocaleString() ?? 0}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground font-medium whitespace-nowrap py-2 px-2">
                                                {block.size ? `${(block.size / 1024).toFixed(1)} KB` : 'N/A'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <span>{t('pagination.page')} {currentPage} {t('pagination.of')} {totalPages}</span>
                        <span>•</span>
                        <span>{blocks.length} {t('pagination.blocks')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange?.(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            {t('pagination.previous')}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange?.(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            {t('pagination.next')}
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
