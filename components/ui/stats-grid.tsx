"use client"

import { ReactNode } from 'react'

interface StatsGridProps {
    children: ReactNode
    columns?: {
        default: number
        sm?: number
        md?: number
        lg?: number
        xl?: number
    }
    className?: string
}

export function StatsGrid({
    children,
    columns = { default: 1, sm: 2, lg: 4 },
    className = ""
}: StatsGridProps) {
    const gridClasses = [
        `grid gap-4`,
        `grid-cols-${columns.default}`,
        columns.sm && `sm:grid-cols-${columns.sm}`,
        columns.md && `md:grid-cols-${columns.md}`,
        columns.lg && `lg:grid-cols-${columns.lg}`,
        columns.xl && `xl:grid-cols-${columns.xl}`
    ].filter(Boolean).join(' ')

    return (
        <div className={`${gridClasses} ${className}`}>
            {children}
        </div>
    )
}
