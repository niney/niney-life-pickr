import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import yaml from 'js-yaml'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Config 로드 함수
function loadConfig() {
  try {
    const configPath = path.resolve(__dirname, '../../config/base.yml')
    const configFile = fs.readFileSync(configPath, 'utf8')
    const config = yaml.load(configFile) as any
    return config
  } catch (error) {
    console.warn('Config file not found, using default values')
    return {
      server: {
        web: {
          host: 'localhost',
          port: 3000
        }
      },
      app: {
        name: 'Niney Life Pickr',
        description: 'Life decision picker app'
      },
      pwa: {
        enabled: true,
        registerType: 'autoUpdate'
      }
    }
  }
}

const config = loadConfig()
const webConfig = config.server?.web || { host: 'localhost', port: 3000 }
const appConfig = config.app || { name: 'Niney Life Pickr', description: 'Life decision picker app' }
const pwaConfig = config.pwa || { enabled: true, registerType: 'autoUpdate' }

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: webConfig.host || 'localhost',
    port: webConfig.port || 3000,
    strictPort: true, // 포트가 사용 중이면 다른 포트로 변경하지 않음
  },
  preview: {
    host: webConfig.host || 'localhost',
    port: webConfig.port || 3000,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
      'react-native': 'react-native-web',
    },
    extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js'],
  },
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['react-native-web'],
  },
  plugins: [
    react(),
    ...(pwaConfig.enabled ? [
      VitePWA({
        registerType: pwaConfig.registerType || 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}']
        },
        manifest: {
          name: appConfig.name || 'Niney Life Pickr',
          short_name: appConfig.name?.replace(/\s+/g, '') || 'LifePickr',
          description: appConfig.description || 'Life decision picker app',
          theme_color: '#007AFF',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ] : [])
  ],
})
