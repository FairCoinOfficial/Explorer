import {
  DetailPaneContext,
  DetailSelectionContext,
} from '@/contexts/detail-pane-context'
import {
  backgroundLocation,
  masterLocation,
  useExplorerNavigate as useNavigate,
} from '@/lib/explorer-navigation'
import { useTranslations } from '@/lib/i18n'
import {
  APP_SHELL_DEFAULTS,
  AppShell,
  AppShellSplitPanes,
} from '@oxy.so/bloom/app-shell'
import { ContentPanel } from '@oxy.so/bloom/content-panel'
import { useScrollRestoration } from '@oxy.so/bloom/scroll'
import { BREAKPOINTS } from '@oxy.so/bloom/styles'
import { ToastOutlet } from '@oxy.so/bloom/toast'
import { useEffect, useState, type ReactNode } from 'react'
import { useWindowDimensions } from 'react-native'
import { useLocation } from 'react-router-dom'
import { useExplorerSidebar } from './app-sidebar'
import { NodeHealthBanner } from './node-health-banner'
import { PWAInstallPrompt } from './pwa-install-prompt'

export function Layout({
  children,
  detail,
}: {
  children: ReactNode
  detail?: ReactNode
}) {
  const sidebar = useExplorerSidebar()
  const location = useLocation()
  const navigate = useNavigate()
  const t = useTranslations('panels')
  const { width } = useWindowDimensions()
  const wide = width >= BREAKPOINTS.xl
  const selected = Boolean(detail)
  const origin = selected ? masterLocation(location) : location
  const listOrigin = ['/blocks', '/tx', '/mempool'].includes(origin.pathname)
  useScrollRestoration('window')
  const [drawerOpen, setDrawerOpen] = useState(false)
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])
  const close = () => {
    const target = backgroundLocation(location) ?? masterLocation(location)
    navigate(`${target.pathname}${target.search}${target.hash}`, {
      replace: true,
      state: target.state,
    })
  }
  return (
    <>
      <AppShell
        variant="dashboard"
        drawer="reveal"
        scroll="document"
        sidebar={sidebar}
        header={null}
        contentMaxWidth="none"
        gutter={width < BREAKPOINTS.md ? 0 : APP_SHELL_DEFAULTS.dashboardGutter}
        drawerOpen={drawerOpen}
        onDrawerOpenChange={setDrawerOpen}
        testID="explorer-workspace"
      >
        <DetailSelectionContext.Provider
          value={selected ? location.pathname : ''}
        >
          <AppShellSplitPanes
            key={origin.pathname}
            variant="separated"
            transition="slide"
            showList={wide || !selected}
            showDetail={selected}
            paneScroll={false}
            listWidth={listOrigin ? 380 : 480}
            listMinWidth={listOrigin ? 320 : 400}
            listMaxWidth={listOrigin ? 480 : 600}
            resizeLabel={t('resize')}
            testID="explorer-panels"
            list={
              <ContentPanel
                appearance="solid"
                framedFrom={BREAKPOINTS.md}
                fill
                chrome="none"
                overlaySizing="panel"
                contentStyle={{ padding: 16 }}
              >
                <main id="main-content">
                  <NodeHealthBanner />
                  {children}
                </main>
              </ContentPanel>
            }
            detail={
              selected ? (
                <DetailPaneContext.Provider value={{ close, mobile: !wide }}>
                  <ContentPanel
                    framedFrom={BREAKPOINTS.md}
                    fill
                    chrome="none"
                    overlaySizing="panel"
                    contentStyle={{ padding: 16 }}
                  >
                    <section
                      role={wide ? undefined : 'main'}
                      aria-label={t('detail')}
                      data-testid="explorer-detail"
                    >
                      {detail}
                    </section>
                  </ContentPanel>
                </DetailPaneContext.Provider>
              ) : undefined
            }
          />
        </DetailSelectionContext.Provider>
      </AppShell>
      <PWAInstallPrompt />
      <ToastOutlet />
    </>
  )
}
