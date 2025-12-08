import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import yaml from 'js-yaml'
import fs from 'fs'
import path from 'path'
import {fileURLToPath} from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Config 로드 함수 (환경별 병합)
function loadConfig() {
  try {
    const configDir = path.resolve(__dirname, '../../config')
    const basePath = path.join(configDir, 'base.yml')

    // base.yml 로드
    const baseFile = fs.readFileSync(basePath, 'utf8')
    const baseConfig = yaml.load(baseFile) as any

    // NODE_ENV에 따라 추가 config 로드 (production.yml, test.yml 등)
    const env = process.env.NODE_ENV || 'development'
    const envPath = path.join(configDir, `${env}.yml`)

    if (env !== 'development' && fs.existsSync(envPath)) {
      const envFile = fs.readFileSync(envPath, 'utf8')
      const envConfig = yaml.load(envFile) as any

      // Deep merge: envConfig가 baseConfig를 override
      return deepMerge(baseConfig, envConfig)
    }

    return baseConfig
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
      api: {
        url: 'http://localhost:4000'
      }
    }
  }
}

// Deep merge utility
function deepMerge(target: any, source: any): any {
  const output = { ...target }
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] })
        } else {
          output[key] = deepMerge(target[key], source[key])
        }
      } else {
        Object.assign(output, { [key]: source[key] })
      }
    })
  }
  return output
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item)
}

const loadedConfig = loadConfig()
const webConfig = loadedConfig.server?.web || { host: 'localhost', port: 3000 }
const apiConfig = loadedConfig.api || { url: 'http://localhost:4000' }
const vworldConfig = loadedConfig.vworld || { apiKey: '', geocodeUrl: '', wmtsUrl: '' }

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
      'react-native': path.resolve(__dirname, 'node_modules/react-native-web'),
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
    extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js'],
  },
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    global: 'globalThis',
    // API URL을 빌드 시점에 YAML에서 주입
    'import.meta.env.VITE_API_URL': JSON.stringify(apiConfig.url),
    // VWorld API 설정
    'import.meta.env.VITE_VWORLD_API_KEY': JSON.stringify(vworldConfig.apiKey),
    'import.meta.env.VITE_VWORLD_GEOCODE_URL': JSON.stringify(vworldConfig.geocodeUrl),
    'import.meta.env.VITE_VWORLD_WMTS_URL': JSON.stringify(vworldConfig.wmtsUrl),
  },
  optimizeDeps: {
    include: ['react-native-web'],
  },
  plugins: [
    react(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React 관련 라이브러리를 별도 chunk로 분리
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // React Native Web을 별도 chunk로 분리 (가장 큰 라이브러리)
          'react-native-web': ['react-native-web'],

          // FontAwesome 아이콘을 별도 chunk로 분리
          'fontawesome': [
            '@fortawesome/fontawesome-svg-core',
            '@fortawesome/free-solid-svg-icons',
            '@fortawesome/free-regular-svg-icons',
            '@fortawesome/react-fontawesome'
          ],
        },
      },
    },

    // Chunk 크기 경고 임계값 조정
    chunkSizeWarningLimit: 600,
  },
})
