import { SiteActions } from '@/components/site/header'
import { useDetailPane } from '@/contexts/detail-pane-context'
import { useExplorerNavigate as useNavigate } from '@/lib/explorer-navigation'
import { useTranslations } from '@/lib/i18n'
import {
  AppShellHeader,
  AppShellMenuButton,
  useAppShell,
} from '@oxy.so/bloom/app-shell'
import { Breadcrumb, BreadcrumbItem } from '@oxy.so/bloom/breadcrumb'
import { Button } from '@oxy.so/bloom/button'
import { useContainerWidth } from '@oxy.so/bloom/hooks'
import { PageHeader } from '@oxy.so/bloom/page-header'
import { BREAKPOINTS } from '@oxy.so/bloom/styles'
import { Muted, Text } from '@oxy.so/bloom/typography'
import { RefreshCw, X } from 'lucide-react'
import { View } from 'react-native'

interface DetailHeaderProps {
  title: string
  subtitle?: string
  breadcrumb?: React.ReactNode
  onRefresh?: () => void
  isRefreshing?: boolean
  action?: React.ReactNode
}

export function DetailHeader({
  title,
  subtitle,
  breadcrumb,
  onRefresh,
  isRefreshing = false,
  action,
}: DetailHeaderProps) {
  const common = useTranslations('common')
  const panels = useTranslations('panels')
  const { width, onLayout } = useContainerWidth()
  const pane = useDetailPane()
  const navigate = useNavigate()
  const shell = useAppShell()
  if (pane)
    return (
      <PageHeader
        title={
          pane.mobile ? (
            <Text variant="headline-medium" role="heading" aria-level={1}>
              {title}
            </Text>
          ) : (
            title
          )
        }
        subtitle={subtitle}
        headingLevel={pane.mobile ? 1 : 2}
        sticky={false}
        safeArea={false}
        leading={pane.mobile ? <AppShellMenuButton /> : undefined}
        actions={
          <>
            {action}
            {pane.mobile && <SiteActions compact />}
            {onRefresh && (
              <Button
                appearance="plain"
                onPress={onRefresh}
                loading={isRefreshing}
                icon={<RefreshCw size={18} />}
                accessibilityLabel={common('refresh')}
              />
            )}
            <Button
              appearance="plain"
              onPress={pane.close}
              icon={<X size={18} />}
              accessibilityLabel={panels('close')}
            />
          </>
        }
      />
    )
  return (
    <View onLayout={onLayout} style={{ gap: 4 }}>
      <AppShellHeader
        title={title}
        breadcrumb={
          breadcrumb ?? (
            <Breadcrumb>
              <BreadcrumbItem href="/" onPress={() => navigate('/')}>
                FairCoin Explorer
              </BreadcrumbItem>
              <BreadcrumbItem current>{title}</BreadcrumbItem>
            </Breadcrumb>
          )
        }
        showMenu={shell.drawerAvailable}
        menuOpen={shell.drawerOpen}
        onMenuPress={shell.toggleDrawer}
        actions={
          <>
            {action}
            {onRefresh && (
              <Button
                onPress={onRefresh}
                appearance="outline"
                loading={isRefreshing}
                icon={<RefreshCw size={18} />}
                accessibilityLabel={common('refresh')}
              />
            )}
            <SiteActions compact={(width ?? 0) < BREAKPOINTS.md} />
          </>
        }
      />
      {subtitle && <Muted>{subtitle}</Muted>}
    </View>
  )
}
