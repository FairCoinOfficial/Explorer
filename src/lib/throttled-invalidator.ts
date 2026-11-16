/**
 * Leading + trailing throttle per query key.
 *
 * Live events (`new-block`, `network-stats`, …) invalidate React Query caches,
 * and every invalidation is an HTTP refetch from every open tab. If the server
 * ever emits events in a burst — on 2026-11-16 a monitor bug announced 241k
 * historical blocks — the browser must not turn that into an equal burst of
 * requests. Each key refetches at most once per `minIntervalMs`: the first event
 * runs immediately, later ones inside the window collapse into one trailing run,
 * so the final state is always fetched.
 */
export interface ThrottledInvalidator {
  invalidate: (queryKey: readonly unknown[]) => void
  dispose: () => void
}

export function createThrottledInvalidator(
  run: (queryKey: readonly unknown[]) => void,
  minIntervalMs = 5_000,
  now: () => number = () => Date.now(),
): ThrottledInvalidator {
  const lastRun = new Map<string, number>()
  const pending = new Map<string, ReturnType<typeof setTimeout>>()

  const fire = (id: string, queryKey: readonly unknown[]) => {
    pending.delete(id)
    lastRun.set(id, now())
    run(queryKey)
  }

  return {
    invalidate(queryKey) {
      const id = JSON.stringify(queryKey)
      if (pending.has(id)) {
        return
      }
      const elapsed = now() - (lastRun.get(id) ?? Number.NEGATIVE_INFINITY)
      if (elapsed >= minIntervalMs) {
        fire(id, queryKey)
        return
      }
      pending.set(
        id,
        setTimeout(() => fire(id, queryKey), minIntervalMs - elapsed),
      )
    },
    dispose() {
      for (const timer of pending.values()) {
        clearTimeout(timer)
      }
      pending.clear()
    },
  }
}
