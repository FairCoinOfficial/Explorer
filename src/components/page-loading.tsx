import { Spinner } from '@/components/ui/spinner'

/**
 * Full-area fallback shown by the routed <Suspense> boundary while a lazily
 * loaded page chunk is being fetched. The app shell (sidebar + header) stays
 * mounted around it, so only the routed content area swaps to this spinner.
 *
 * Styling uses design tokens (text-muted-foreground) and the shared Spinner so
 * it matches the rest of the app's loading affordances.
 */
export function PageLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[50vh] flex-1 flex-col items-center justify-center gap-3 p-8 text-muted-foreground"
    >
      <Spinner className="size-8" />
      <span className="text-sm">Loading…</span>
    </div>
  )
}
