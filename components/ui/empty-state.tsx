"use client"

import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
    icon: LucideIcon
    title: string
    description: string
    action?: {
        label: string
        onClick: () => void
        variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
    }
    className?: string
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className = ""
}: EmptyStateProps) {
    return (
        <div className={`text-center py-6 sm:py-8 px-4 ${className}`}>
            <Icon className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-medium mb-2">{title}</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 max-w-sm mx-auto leading-relaxed">{description}</p>
            {action && (
                <Button
                    onClick={action.onClick}
                    variant={action.variant || 'outline'}
                    className="w-full sm:w-auto"
                >
                    {action.label}
                </Button>
            )}
        </div>
    )
}
