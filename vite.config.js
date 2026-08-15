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
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'icon-source.svg'],
      // Make updates take effect on the very next load instead of lingering
      // behind an old cached service worker.
      selfDestroying: false,
      manifest: {
        name: 'Kakeibo — Weekly Budgeting',
        short_name: 'Kakeibo',
        description:
          'Private, local-first weekly budgeting. Import transactions from statement screenshots and track weekly spending vs. monthly income.',
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
      workbox: {
        // Precache the app shell so it opens offline once installed.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Activate a new service worker immediately and take control of open
        // pages, and drop stale precaches — so a deploy shows up on next load.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // The OCR engine + language data load from a CDN on first use; cache
        // them at runtime so screenshot import keeps working offline afterward.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(cdn\.jsdelivr\.net|unpkg\.com)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ocr-cdn',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
