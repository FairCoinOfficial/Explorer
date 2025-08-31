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
        <div className={`flex items-center justify-center h-64 ${className}`}>
            <div className="text-center">
                {Icon && <Icon className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />}
                <p className="text-sm text-muted-foreground">{message}</p>
            </div>
        </div>
    )
}
