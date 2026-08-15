import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// `base` defaults to './' (relative) so a local `npm run preview` or a plain
// static host works. GitHub Pages serves the app from a repo subpath, so the
// deploy workflow passes `--base=/<repo>/` to override this.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    // The app is installable (web manifest + icons + standalone), but we do NOT
    // run a caching service worker: it repeatedly served stale/broken shells and
    // offline was never a requirement. `selfDestroying` ships a worker that
    // unregisters any previously-installed worker and wipes its caches, healing
    // devices that got stuck, after which the app simply always loads fresh.
    VitePWA({
      selfDestroying: true,
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'icon-source.svg'],
      manifest: {
        name: 'Kakeibo — Weekly Budgeting',
        short_name: 'Kakeibo',
        description:
          'Private, local-first budgeting. Import income and expenses and see whether your money is trending up or down, week by week.',
        theme_color: '#256abf',
        background_color: '#0d0d0d',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
