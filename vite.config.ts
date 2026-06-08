import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

/**
 * Splits heavy node_modules into separate, long-term-cacheable chunks that the
 * browser can fetch in parallel. App code returns `undefined` so Vite/Rollup
 * keeps the per-route splitting driven by React.lazy() in src/App.tsx.
 *
 * Checks are defensive substring matches on the normalized module id and are
 * ordered most-specific first (e.g. web3 crypto deps before the generic vendor
 * bucket) so a package only ever lands in one chunk.
 */
function manualChunks(id: string): string | undefined {
  const normalized = id.split(path.sep).join('/')
  if (!normalized.includes('node_modules')) {
    return undefined
  }

  // Charts: recharts and its d3-* dependency graph. Only the price card and the
  // stats page pull these in, so they should not sit in the initial bundle.
  if (
    normalized.includes('/recharts') ||
    normalized.includes('/d3-') ||
    normalized.includes('/victory-vendor') ||
    normalized.includes('/internmap')
  ) {
    return 'charts'
  }

  // Web3: viem and its crypto/encoding stack. Only the WFAIR card and the bridge
  // need these, so they stay out of the initial bundle.
  if (
    normalized.includes('/viem') ||
    normalized.includes('/@noble') ||
    normalized.includes('/@scure') ||
    normalized.includes('/@adraffy') ||
    normalized.includes('/abitype') ||
    normalized.includes('/ox/') ||
    normalized.includes('/ox@')
  ) {
    return 'web3'
  }

  // React runtime + router. Shared by every route, so keep it as one stable
  // chunk that caches across deploys.
  if (
    normalized.includes('/react-router-dom') ||
    normalized.includes('/react-router') ||
    normalized.includes('/react-dom') ||
    normalized.includes('/react/') ||
    normalized.includes('/scheduler')
  ) {
    return 'react'
  }

  // Radix UI primitives (both the umbrella `radix-ui` and scoped `@radix-ui/*`).
  if (normalized.includes('/@radix-ui') || normalized.includes('/radix-ui')) {
    return 'radix'
  }

  // TanStack Query (and any sibling TanStack packages).
  if (normalized.includes('/@tanstack')) {
    return 'query'
  }

  // Everything else from node_modules.
  return 'vendor'
}

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
  server: {
    // Explorer uses a dedicated dev port (5180) so it never clashes with other
    // local vite apps (e.g. Oxy on 5173). Override with `vite --port`.
    port: 5180,
    strictPort: true,
    proxy: {
      // Dev-only proxy. Override target with VITE_API_TARGET to point at a
      // remote API (e.g. prod) when no local FairCoin node is running.
      // Not used by the production build (Express serves the static dist).
      '/api': process.env.VITE_API_TARGET || 'http://localhost:4000',
    },
  },
})
