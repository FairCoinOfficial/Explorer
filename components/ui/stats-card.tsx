"use client"

import { ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
    title: string
    value: string | number
    description: string
    icon: LucideIcon
    className?: string
    valueClassName?: string
}

export function StatsCard({
    title,
    value,
    description,
    icon: Icon,
    className = "",
    valueClassName = ""
}: StatsCardProps) {
    return (
        <div className={`border rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow ${className}`}>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h4 className="text-xs sm:text-sm font-medium truncate pr-2">{title}</h4>
                <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
            </div>
            <div className={`text-lg sm:text-2xl font-bold break-all sm:break-normal ${valueClassName}`}>
                {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
            <p className="text-xs sm:text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>
        </div>
    )
}
