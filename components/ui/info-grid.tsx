"use client"

import { ReactNode } from 'react'

interface InfoItem {
    label: string
    value: string | number | ReactNode
    className?: string
}

interface InfoGridProps {
    items: InfoItem[]
    columns?: 1 | 2 | 3
    className?: string
}

export function InfoGrid({
    items,
    columns = 2,
    className = ""
}: InfoGridProps) {
    const gridClasses = {
        1: 'grid-cols-1',
        2: 'grid-cols-1 sm:grid-cols-2',
        3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
    }

    return (
        <div className={`grid gap-3 sm:gap-4 ${gridClasses[columns]} ${className}`}>
            {items.map((item, index) => (
                <div key={index} className={`space-y-1 sm:space-y-2 ${item.className || ''}`}>
                    <div>
                        <label className="text-xs sm:text-sm font-medium text-muted-foreground block">
                            {item.label}
                        </label>
                        <div className="mt-1">
                            {typeof item.value === 'string' || typeof item.value === 'number' ? (
                                <p className="text-sm sm:text-base break-words">{item.value}</p>
                            ) : (
                                item.value
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
