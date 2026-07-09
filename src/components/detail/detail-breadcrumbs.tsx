import { Link } from 'react-router-dom'
import { useTranslations } from '@/lib/i18n'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export interface DetailBreadcrumbItem {
  label: string
  /** When omitted, the item is the current page (non-link). */
  to?: string
}

interface DetailBreadcrumbsProps {
  items: DetailBreadcrumbItem[]
}

/**
 * Compact breadcrumb trail for block / tx / address detail pages.
 * First crumb is always Home; callers pass the rest of the trail.
 */
export function DetailBreadcrumbs({ items }: DetailBreadcrumbsProps) {
  const common = useTranslations('common')

  return (
    <Breadcrumb className="mb-1">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/">{common('home')}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <span key={`${item.label}-${index}`} className="contents">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast || !item.to ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={item.to}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
