import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// NOTE: no custom `manualChunks` — splitting React into its own chunk broke the
// production bundle (vendor libs read `React.forwardRef` before the react chunk
// initialised → "Cannot read properties of undefined" → blank page). Rollup's
// default chunking handles the React dependency graph correctly, and the real
// win is the per-route code-splitting from React.lazy() in src/App.tsx (the 14
// non-home pages, and recharts via the lazy /stats page, stay out of the home).

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
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
