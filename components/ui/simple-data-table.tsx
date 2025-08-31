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
        <div className={`rounded-md border ${className}`}>
            <Table>
                <TableHeader>
                    <TableRow>
                        {headers.map((header, index) => (
                            <TableHead key={index}>{header}</TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                                <TableCell key={cellIndex}>{cell}</TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
