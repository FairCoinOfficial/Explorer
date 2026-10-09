import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'node:module'
import path from 'path'
import { defineConfig, loadEnv, transformWithEsbuild } from 'vite'
import reactNativeWeb from 'vite-plugin-react-native-web'

// Use the public CommonJS token entry at build time, before React or its CSS loads.
const { getPresetVars } = createRequire(import.meta.url)(
  '@oxy.so/bloom/preset-vars',
)
const bootTheme = (mode: 'light' | 'dark') => {
  const vars = getPresetVars('faircoin', mode)
  return `--background:${vars['--background']};--foreground:${vars['--foreground']};color-scheme:${mode}`
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiTarget =
    process.env.VITE_API_TARGET ||
    env.VITE_API_TARGET ||
    'http://localhost:8080'

  return {
    plugins: [
      {
        name: 'bloom-first-paint',
        transformIndexHtml: () => [
          {
            tag: 'style',
            injectTo: 'head-prepend',
            attrs: { id: 'bloom-first-paint' },
            children: `:root{${bootTheme('light')}}:root.dark{${bootTheme('dark')}}html,body,#root{margin:0;min-height:100%;background:var(--background);color:var(--foreground)}`,
          },
        ],
      },
      // Several RN peers publish JSX in .js; Rollup needs it lowered before parsing.
      {
        name: 'native-web-jsx',
        enforce: 'pre',
        async transform(code, id) {
          if (
            /node_modules\/.*\.js$/.test(id) &&
            /react-native-|@react-native/.test(id)
          ) {
            return transformWithEsbuild(code, id, {
              loader: 'jsx',
              jsx: 'automatic',
            })
          }
        },
      },
      reactNativeWeb(),
      tailwindcss(),
      react(),
    ],
    define: {
      __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
      global: 'globalThis',
    },
    build: {
      commonjsOptions: {
        // Reanimated's web motion bridge imports RNW's DOM compiler from ESM.
        // Convert these installed optional requires in the production bundle.
        transformMixedEsModules: true,
        ignoreTryCatch: (id) => !id.startsWith('react-native-web/dist/'),
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: { '.js': 'jsx' },
        resolveExtensions: [
          '.web.mjs',
          '.mjs',
          '.web.js',
          '.js',
          '.web.ts',
          '.ts',
          '.web.tsx',
          '.tsx',
          '.json',
        ],
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, './shared'),
        '@react-native/assets-registry/registry':
          'react-native-web/dist/modules/AssetRegistry',
      },
    },
    server: {
      // Explorer uses a dedicated dev port (5180) so it never clashes with other
      // local vite apps (e.g. Oxy on 5173). Override with `vite --port`.
      port: 5180,
      strictPort: true,
      proxy: {
        // Dev-only proxy. Must match server/index.ts PORT default (8080).
        // Override target with VITE_API_TARGET to point at a remote API (e.g. prod)
        // when no local FairCoin node is running.
        // Not used by the production build (Express serves the static dist).
        // `ws: true` upgrades `/api/ws` so the browser socket reaches the API in
        // local dev instead of silently falling back to 30s HTTP polling.
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  }
})
