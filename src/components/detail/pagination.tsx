import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaginationProps {
  page: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
  /** Centered status label, e.g. "Page 2 of 10" — caller supplies the i18n text. */
  label: string
  prevLabel: string
  nextLabel: string
  /** Disable both controls (e.g. while a page is fetching). */
  disabled?: boolean
}

/**
 * Canonical list pagination footer: Prev on the left, a centered status label,
 * Next on the right — both outlined chevron buttons. Shared by the blocks / tx /
 * address / block-detail lists so every paged footer is identical.
 */
export function Pagination({
  page,
  totalPages,
  onPrev,
  onNext,
  label,
  prevLabel,
  nextLabel,
  disabled = false,
}: PaginationProps) {
  return (
    <div className="flex items-center justify-between gap-2 border-t px-4 py-2.5">
      <Button variant="outline" size="sm" disabled={disabled || page <= 1} onClick={onPrev}>
        <ChevronLeft className="size-4" />
        {prevLabel}
      </Button>
      <span className="text-xs tabular-nums text-muted-foreground">{label}</span>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || page >= totalPages}
        onClick={onNext}
      >
        {nextLabel}
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}
