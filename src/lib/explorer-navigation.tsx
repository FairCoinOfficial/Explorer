import type { ScrollRouterAdapter } from '@oxy.so/bloom/scroll'
import { useCallback, useEffect, type ComponentProps } from 'react'
import {
  Link as RouterLink,
  useLocation,
  useNavigate,
  type Location,
  type NavigateFunction,
  type NavigateOptions,
  type To,
} from 'react-router-dom'

/** Bind Bloom's document scroll restoration to the focused React Router route. */
export const explorerScrollAdapter: ScrollRouterAdapter = {
  useScreenContentId() {
    const location = useLocation()
    const params = new URLSearchParams(location.search)
    params.sort()
    return `${location.pathname}?${params}`
  },
  useScreenFocusEffect(effect) {
    useEffect(effect, [effect])
  },
}

export function isDetailPath(pathname: string) {
  return /^\/(block|tx)\/[^/]+\/?$/.test(pathname)
}

export function backgroundLocation(location: Location): Location | undefined {
  return location.state?.backgroundLocation
}

export function masterLocation(location: Location): Location {
  const background = backgroundLocation(location)
  if (background) return background
  return {
    ...location,
    pathname: location.pathname.startsWith('/block/') ? '/blocks' : '/tx',
    search: '',
    hash: '',
    state: null,
    key: 'master',
  }
}

function destinationPath(to: To) {
  return typeof to === 'string' ? to.split(/[?#]/)[0] : (to.pathname ?? '')
}

function navigationState(location: Location, to: To, state?: unknown) {
  const pathname = destinationPath(to)
  if (!isDetailPath(pathname)) return state
  return {
    ...(state && typeof state === 'object' ? state : {}),
    backgroundLocation: isDetailPath(location.pathname)
      ? (backgroundLocation(location) ?? masterLocation(location))
      : location,
  }
}

/** Preserve the originating screen when navigating into the reading pane. */
export function useExplorerNavigate(): NavigateFunction {
  const navigate = useNavigate()
  const location = useLocation()
  return useCallback(
    (to: To | number, options?: NavigateOptions) => {
      if (typeof to === 'number') return navigate(to)
      return navigate(to, {
        ...options,
        state: navigationState(location, to, options?.state),
      })
    },
    [navigate, location],
  )
}

/** A router link; modified clicks still open the canonical detail URL in a new tab. */
export function ExplorerLink({
  to,
  state,
  ...props
}: ComponentProps<typeof RouterLink>) {
  const location = useLocation()
  return (
    <RouterLink
      {...props}
      to={to}
      state={navigationState(location, to, state)}
    />
  )
}
