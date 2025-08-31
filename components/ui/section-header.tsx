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
    <div className={`flex items-center gap-2 pb-2 border-b ${className}`}>
      <Icon className="h-5 w-5 text-primary" />
      <h3 className="text-lg font-semibold">{title}</h3>
      {badge && (
        <Badge variant={badge.variant || 'secondary'} className="ml-auto">
          {badge.text}
        </Badge>
      )}
      {children}
    </div>
  )
}
