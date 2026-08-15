import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the built app works whether served from a domain root
// or a subpath (e.g. GitHub Pages, or opened via a static file server).
export default defineConfig({
  base: './',
  plugins: [react()],
})
