import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
    title: string
    value: string | number
    description?: string
    icon?: LucideIcon
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
        <div className={className}>
            <p className="text-xs text-muted-foreground mb-1">{title}</p>
            <p className={`text-2xl font-bold tabular-nums ${valueClassName}`}>
                {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {description && (
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
        </div>
    )
}
