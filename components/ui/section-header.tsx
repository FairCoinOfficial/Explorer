"use client"

import { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { LucideIcon } from 'lucide-react'

interface SectionHeaderProps {
    icon: LucideIcon
    title: string
    badge?: {
        text: string
        variant?: 'default' | 'secondary' | 'destructive' | 'outline'
    }
    children?: ReactNode
    className?: string
}

export function SectionHeader({
    icon: Icon,
    title,
    badge,
    children,
    className = ""
}: SectionHeaderProps) {
    return (
        <div className={`flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pb-2 border-b ${className}`}>
            <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <h3 className="text-base sm:text-lg font-semibold">{title}</h3>
            </div>
            <div className="flex items-center gap-2">
                {badge && (
                    <Badge variant={badge.variant || 'secondary'} className="text-xs">
                        {badge.text}
                    </Badge>
                )}
                {children}
            </div>
        </div>
    )
}
