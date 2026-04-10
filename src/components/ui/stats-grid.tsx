import { ReactNode } from 'react'

interface StatsGridProps {
    children: ReactNode
    className?: string
}

export function StatsGrid({
    children,
    className = ""
}: StatsGridProps) {
    return (
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-6 ${className}`}>
            {children}
        </div>
    )
}
