import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

/**
 * `React.lazy` that survives a flaky network and a fresh deploy.
 *
 * A route chunk can fail to load for two ordinary reasons: a blip (the server is
 * restarting, a proxy times out, the visitor's connection drops) or a deploy that
 * replaced the hashed chunk names the open tab still references. Plain `lazy`
 * turns either into an uncaught render error. Instead:
 *
 *  1. retry the import a couple of times with a short backoff (fixes blips);
 *  2. if it still fails, reload the page once so the tab picks up the current
 *     build (fixes stale deploys) — guarded so it can never reload-loop;
 *  3. otherwise rethrow, and the route-level error boundary shows an inline
 *     "try again" in the content panel. The rest of the app keeps working.
 */

const RETRY_DELAYS_MS = [500, 2000]
const RELOAD_GUARD_KEY = 'explorer:chunk-reload-at'
const RELOAD_GUARD_WINDOW_MS = 60_000

const CHUNK_ERROR_PATTERNS = [
  'failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'importing a module script failed',
  'unable to preload css',
  'chunkloaderror',
]

export function isChunkLoadError(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error)
  const lower = text.toLowerCase()
  return CHUNK_ERROR_PATTERNS.some((pattern) => lower.includes(pattern))
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Reload once per window; returns false when a reload already happened recently. */
export function reloadOnceForFreshBuild(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? 0)
    if (Date.now() - last < RELOAD_GUARD_WINDOW_MS) {
      return false
    }
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()))
  } catch {
    // Storage blocked (private mode): never risk a reload loop.
    return false
  }
  window.location.reload()
  return true
}

export async function importWithRetry<T>(
  factory: () => Promise<T>,
  delays: number[] = RETRY_DELAYS_MS,
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await factory()
    } catch (error) {
      lastError = error
      if (!isChunkLoadError(error)) {
        throw error
      }
      if (attempt < delays.length) {
        await sleep(delays[attempt])
      }
    }
  }
  if (reloadOnceForFreshBuild()) {
    // The page is going away; keep Suspense showing its fallback meanwhile.
    return new Promise<T>(() => {})
  }
  throw lastError
}

export function lazyWithRetry<T extends ComponentType<object>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(() => importWithRetry(factory))
}
