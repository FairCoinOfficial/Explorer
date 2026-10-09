import { useExplorerNavigate as useNavigate } from '@/lib/explorer-navigation'
import { useTranslations } from '@/lib/i18n'
import { Breadcrumb, BreadcrumbItem } from '@oxy.so/bloom/breadcrumb'

export interface DetailBreadcrumbItem {
  label: string
  to?: string
}
export function DetailBreadcrumbs({
  items,
}: {
  items: DetailBreadcrumbItem[]
}) {
  const common = useTranslations('common')
  const navigate = useNavigate()
  return (
    <Breadcrumb>
      <BreadcrumbItem href="/" onPress={() => navigate('/')}>
        {common('home')}
      </BreadcrumbItem>
      {items.map((item, index) => (
        <BreadcrumbItem
          key={`${item.label}-${index}`}
          current={index === items.length - 1 || !item.to}
          href={item.to}
          onPress={item.to ? () => navigate(item.to!) : undefined}
        >
          {item.label}
        </BreadcrumbItem>
      ))}
    </Breadcrumb>
  )
}
