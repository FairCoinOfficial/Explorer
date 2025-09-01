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
            {/* Table View */}
            <div>
                <Card className="overflow-hidden shadow-sm">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto custom-scrollbar">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="w-[100px] font-semibold whitespace-nowrap h-8 px-2">{t('height')}</TableHead>
                                        <TableHead className="min-w-[200px] lg:min-w-[280px] font-semibold whitespace-nowrap h-8 px-2">{t('hash')}</TableHead>
                                        <TableHead className="w-[140px] font-semibold whitespace-nowrap h-8 px-2">{t('time')}</TableHead>
                                        <TableHead className="w-[110px] font-semibold whitespace-nowrap h-8 px-2">{t('transactions')}</TableHead>
                                        <TableHead className="w-[90px] font-semibold whitespace-nowrap h-8 px-2">{t('size')}</TableHead>
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
                                                {new Date(block.time * 1000).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap py-2 px-2">
                                                <Badge variant="secondary" className="text-xs font-medium bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors">
                                                    {block.nTx?.toLocaleString() ?? block.tx?.length?.toLocaleString() ?? 0}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground font-medium whitespace-nowrap py-2 px-2">
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
