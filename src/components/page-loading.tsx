/**
 * Full-area fallback shown by the routed <Suspense> boundary while a lazily
 * loaded page chunk is being fetched. The app shell (sidebar + header) stays
 * mounted around it, so only the routed content area swaps to this splash.
 *
 * Mirrors the macOS-style boot splash in index.html: the FairCoin logo centered
 * above a slim indeterminate progress bar. Colors come from design tokens
 * (`bg-accent` for the bar, `text-muted-foreground` for the label) so it stays
 * themable and matches the rest of the app's loading affordances.
 */
export function PageLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[50vh] flex-1 flex-col items-center justify-center p-8"
    >
      <img
        src="/images/FairCoin-Logo.jpg"
        alt=""
        width={64}
        height={64}
        className="size-16 rounded-[14px] object-cover"
      />
      <div className="mt-7 h-[3px] w-[140px] overflow-hidden rounded-full bg-accent/15">
        <div className="page-loading-bar h-full w-2/5 rounded-full bg-accent" />
      </div>
      <span className="mt-3.5 text-xs tracking-wide text-muted-foreground">Loading…</span>
      <style>{
        '@keyframes page-loading-slide{0%{transform:translateX(-120%)}100%{transform:translateX(350%)}}' +
        '.page-loading-bar{animation:page-loading-slide 1.1s ease-in-out infinite}'
      }</style>
    </div>
  )
}
