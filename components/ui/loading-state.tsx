"use client"

import { LucideIcon } from 'lucide-react'

interface LoadingStateProps {
    message?: string
    icon?: LucideIcon
    className?: string
}

export function LoadingState({
    message = "Loading...",
    icon: Icon,
    className = ""
}: LoadingStateProps) {
    return (
        <div className={`flex items-center justify-center h-48 sm:h-64 px-4 ${className}`}>
            <div className="text-center">
                {Icon && <Icon className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary mx-auto mb-3 sm:mb-4" />}
                <p className="text-sm sm:text-base text-muted-foreground">{message}</p>
            </div>
        </div>
    )
}
