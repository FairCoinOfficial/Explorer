"use client"

import { ReactNode } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from './empty-state'
import { LucideIcon } from 'lucide-react'

interface SimpleDataTableProps {
    headers: string[]
    data: ReactNode[][]
    emptyState?: {
        icon: LucideIcon
        title: string
        description: string
    }
    className?: string
}

export function SimpleDataTable({
    headers,
    data,
    emptyState,
    className = ""
}: SimpleDataTableProps) {
    if (data.length === 0 && emptyState) {
        return <EmptyState {...emptyState} />
    }

    return (
        <div className={`rounded-md border overflow-x-auto custom-scrollbar ${className}`}>
            <Table className="min-w-full">
                <TableHeader>
                    <TableRow>
                        {headers.map((header, index) => (
                            <TableHead key={index} className="whitespace-nowrap text-xs sm:text-sm h-8 px-2">
                                {header}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                                <TableCell key={cellIndex} className="text-xs sm:text-sm whitespace-nowrap py-2 px-2">
                                    {cell}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
