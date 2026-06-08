import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

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
