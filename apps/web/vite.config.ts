import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { config } from './src/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: config.pwa.registerType,
      injectRegister: 'auto',
      manifest: false, // Using separate manifest.json file
      disable: !config.pwa.enabled,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    host: config.server.host,
    port: config.server.port,
    strictPort: config.server.strictPort,
    open: config.server.open
  },
  clearScreen: config.vite.clearScreen,
  logLevel: config.vite.logLevel,
  build: config.build ? {
    minify: config.build.minify ? 'esbuild' : false,
    sourcemap: config.build.sourcemap,
    chunkSizeWarningLimit: config.build.chunkSizeWarningLimit
  } : undefined
})
