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
        <div className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${className}`}>
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h4 className="text-sm font-medium">{title}</h4>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className={`text-2xl font-bold ${valueClassName}`}>
                {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
        </div>
    )
}
