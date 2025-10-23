# WEB-SETUP.md

> **Last Updated**: 2025-10-23 21:10
> **Purpose**: Web application setup documentation (Vite, React Native Web, TypeScript configuration)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Vite Configuration](#2-vite-configuration)
3. [TypeScript Configuration](#3-typescript-configuration)
4. [Project Structure](#4-project-structure)
5. [Entry Points](#5-entry-points)
6. [Development Scripts](#6-development-scripts)
7. [Dependencies](#7-dependencies)
8. [Build Configuration](#8-build-configuration)
9. [Common Issues](#9-common-issues)
10. [Related Documentation](#10-related-documentation)

---

## 1. Overview

The web application uses **React 19** with **React Native Web** to share components with the mobile app. **Vite** provides fast development and optimized production builds.

### Key Technologies
- **Build Tool**: Vite 7.1.7
- **Framework**: React 19.2.0 + React Native Web 0.21.1
- **TypeScript**: 5.8.3
- **Routing**: React Router DOM 7.9.3
- **Testing**: Playwright 1.55.1

### Architecture
```
apps/web/
├── index.html              # HTML entry point
├── src/
│   ├── main.tsx            # React entry point
│   ├── App.tsx             # Root component with routing
│   ├── components/         # Web-specific components
│   └── index.css           # Global styles
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript project references
├── tsconfig.app.json       # App TypeScript config
├── tsconfig.node.json      # Vite config TypeScript
├── playwright.config.ts    # E2E test configuration
└── package.json            # Dependencies and scripts
```

---

## 2. Vite Configuration

### 2.1 File: `vite.config.ts`

**Location**: `apps/web/vite.config.ts`

#### YAML-Based Configuration Loading

The Vite config loads settings from `config/base.yml` with environment-specific overrides:

```typescript
function loadConfig() {
  try {
    const configDir = path.resolve(__dirname, '../../config')
    const basePath = path.join(configDir, 'base.yml')

    // Load base.yml
    const baseFile = fs.readFileSync(basePath, 'utf8')
    const baseConfig = yaml.load(baseFile) as any

    // Load environment-specific config (production.yml, test.yml)
    const env = process.env.NODE_ENV || 'development'
    const envPath = path.join(configDir, `${env}.yml`)

    if (env !== 'development' && fs.existsSync(envPath)) {
      const envFile = fs.readFileSync(envPath, 'utf8')
      const envConfig = yaml.load(envFile) as any

      // Deep merge: envConfig overrides baseConfig
      return deepMerge(baseConfig, envConfig)
    }

    return baseConfig
  } catch (error) {
    console.warn('Config file not found, using default values')
    return {
      server: { web: { host: 'localhost', port: 3000 } },
      app: { name: 'Niney Life Pickr', description: 'Life decision picker app' },
      api: { url: 'http://localhost:4000' }
    }
  }
}
```

**Key Features**:
- **Base + Environment Merge**: `base.yml` + `production.yml`/`test.yml`
- **Deep Merge Utility**: Nested objects merge recursively
- **Fallback Values**: Default config if YAML files missing
- **Environment Detection**: Uses `NODE_ENV` to select config

#### Server Configuration

```typescript
export default defineConfig({
  server: {
    host: webConfig.host || 'localhost',  // 0.0.0.0 for mobile device access
    port: webConfig.port || 3000,
    strictPort: true,  // Don't auto-increment if port in use
  },
  preview: {
    host: webConfig.host || 'localhost',
    port: webConfig.port || 3000,
    strictPort: true,
  },
})
```

**Configuration Values** (from `config/base.yml`):
```yaml
server:
  web:
    host: '0.0.0.0'  # Allows mobile device access
    port: 3000
```

**Mobile Device Access**:
- `host: '0.0.0.0'` allows network access from Android/iOS devices
- Android emulator: `http://10.0.2.2:3000`
- iOS simulator: `http://localhost:3000`
- Physical devices: `http://<YOUR_LOCAL_IP>:3000`

#### Path Aliases

```typescript
resolve: {
  alias: {
    '@shared': path.resolve(__dirname, '../shared'),
    'react-native': path.resolve(__dirname, 'node_modules/react-native-web'),
    'react': path.resolve(__dirname, 'node_modules/react'),
    'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
  },
}
```

**Purpose**:
1. **@shared**: Import shared components/hooks/utils
2. **react-native → react-native-web**: Map React Native imports to web implementation
3. **react/react-dom**: Ensure single React instance (prevent duplicate React errors)

**Usage**:
```typescript
// Import shared modules
import { Button, InputField } from '@shared/components'
import { useAuth, useLogin } from '@shared/hooks'
import { Alert, storage } from '@shared/utils'

// React Native imports auto-map to react-native-web
import { View, Text, StyleSheet } from 'react-native'  // → react-native-web
```

#### Extensions Resolution

```typescript
resolve: {
  extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js'],
}
```

**Priority Order**:
1. **Platform-specific**: `.web.tsx`, `.web.ts`, `.web.jsx`, `.web.js`
2. **Standard**: `.tsx`, `.ts`, `.jsx`, `.js`

**Example**:
```typescript
// If both files exist, .web.tsx is used:
// - Button.web.tsx  ← Used
// - Button.tsx

import { Button } from './Button'  // Resolves to Button.web.tsx
```

#### Environment Variables

```typescript
define: {
  __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  global: 'globalThis',
  // API URL injected from YAML at build time
  'import.meta.env.VITE_API_URL': JSON.stringify(apiConfig.url),
}
```

**Usage in Code**:
```typescript
// Access API URL
const apiUrl = import.meta.env.VITE_API_URL  // 'http://localhost:4000'

// Development mode check
if (__DEV__) {
  console.log('Development mode')
}
```

**Values** (from `config/base.yml`):
```yaml
api:
  url: 'http://localhost:4000'  # Friendly server URL
```

#### Optimization

```typescript
optimizeDeps: {
  include: ['react-native-web'],
}
```

**Purpose**: Pre-bundle React Native Web during dev server startup for faster reload.

---

## 3. TypeScript Configuration

### 3.1 Project References: `tsconfig.json`

**Location**: `apps/web/tsconfig.json`

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

**Purpose**: Composite project with separate configs for app code and Vite config.

### 3.2 App Configuration: `tsconfig.app.json`

**Location**: `apps/web/tsconfig.app.json`

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "types": ["vite/client"],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Path mapping */
    "baseUrl": ".",
    "paths": {
      "@shared": ["../shared"],
      "@shared/*": ["../shared/*"]
    },

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
```

**Key Settings**:
- **target**: ES2022 (modern JavaScript features)
- **jsx**: `react-jsx` (React 17+ JSX transform, no need for `import React`)
- **moduleResolution**: `bundler` (Vite-optimized resolution)
- **Path mapping**: `@shared` alias for TypeScript
- **types**: `vite/client` for `import.meta.env` types
- **Strict mode**: All strict checks enabled

### 3.3 Vite Config: `tsconfig.node.json`

**Location**: `apps/web/tsconfig.node.json`

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "types": [],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts"]
}
```

**Purpose**: Separate TypeScript config for Vite config file (Node.js environment).

---

## 4. Project Structure

```
apps/web/
├── e2e/                        # Playwright E2E tests
│   └── login.spec.ts
├── public/                     # Static assets
│   └── vite.svg
├── src/
│   ├── components/             # Web-specific components
│   │   ├── Login.tsx           # Login page
│   │   ├── Home.tsx            # Home page
│   │   ├── Restaurant.tsx      # Restaurant detail
│   │   ├── Header.tsx          # Header with hamburger menu
│   │   └── Drawer.tsx          # Slide-out sidebar
│   ├── App.tsx                 # Root component with routing
│   ├── main.tsx                # React entry point
│   └── index.css               # Global styles
├── index.html                  # HTML entry point
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript project references
├── tsconfig.app.json           # App TypeScript config
├── tsconfig.node.json          # Vite config TypeScript
├── playwright.config.ts        # E2E test configuration
└── package.json                # Dependencies and scripts
```

---

## 5. Entry Points

### 5.1 HTML Entry Point: `index.html`

**Location**: `apps/web/index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>Life Pickr</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Key Elements**:
- **#root**: React mount point
- **viewport-fit=cover**: Safe area support for iOS notch
- **type="module"**: ES module support

### 5.2 React Entry Point: `main.tsx`

**Location**: `apps/web/src/main.tsx`

```typescript
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <App />
)
```

**Features**:
- Uses React 19's `createRoot()` API
- StrictMode commented out (can be enabled for development checks)

### 5.3 Root Component: `App.tsx`

**Location**: `apps/web/src/App.tsx`

```typescript
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Login from './components/Login'
import Home from './components/Home'
import Restaurant from './components/Restaurant'
import { useAuth } from '@shared/hooks'
import { ThemeProvider, SocketProvider } from '@shared/contexts'

function AppContent() {
  const { isAuthenticated, isLoading, logout, checkAuth } = useAuth()

  const handleLoginSuccess = async () => {
    // Re-check auth state
    await checkAuth()
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="page-container" style={{
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff'
      }}>
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {!isAuthenticated ? (
          <>
            <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
            <Route path="*" element={<RedirectToLogin />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Home onLogout={logout} />} />
            <Route path="/restaurant/*" element={<Restaurant onLogout={logout} />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  )
}

// Redirect to login while saving original URL
function RedirectToLogin() {
  const location = useLocation()

  // Save current path to sessionStorage
  useEffect(() => {
    if (location.pathname !== '/login') {
      sessionStorage.setItem('redirectUrl', location.pathname + location.search)
    }
  }, [location])

  return <Navigate to="/login" replace />
}

function App() {
  return (
    <ThemeProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </ThemeProvider>
  )
}

export default App
```

**Key Features**:
- **Context Providers**: ThemeProvider (theme management), SocketProvider (Socket.io)
- **Protected Routes**: Auth-based conditional routing
- **Loading State**: Shows loading screen during auth check
- **Redirect URL Preservation**: Saves original URL before login redirect

---

## 6. Development Scripts

### 6.1 Available Scripts

**Location**: `apps/web/package.json`

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report",
    "test:e2e:codegen": "playwright codegen http://localhost:3000"
  }
}
```

### 6.2 Script Descriptions

#### Development
```bash
# Start dev server (http://localhost:3000)
cd apps/web && npm run dev
```

**Features**:
- Fast HMR (Hot Module Replacement)
- TypeScript type checking
- Auto-reload on file changes

#### Build
```bash
# Production build
cd apps/web && npm run build
```

**Steps**:
1. TypeScript compilation check (`tsc -b`)
2. Vite production build (optimized bundle)

**Output**: `apps/web/dist/`

#### Preview
```bash
# Preview production build
cd apps/web && npm run preview
```

**Purpose**: Test production build locally before deployment.

#### Lint
```bash
# Run ESLint
cd apps/web && npm run lint
```

**Checks**: TypeScript, React hooks, unused variables, etc.

#### E2E Testing
```bash
# Run all E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug mode (step through tests)
npm run test:e2e:debug

# View test report
npm run test:e2e:report

# Generate test code
npm run test:e2e:codegen
```

**See**: `WEB-TESTING.md` for detailed E2E testing documentation.

---

## 7. Dependencies

### 7.1 Production Dependencies

**Location**: `apps/web/package.json`

```json
{
  "dependencies": {
    "@fortawesome/fontawesome-svg-core": "^7.1.0",
    "@fortawesome/free-regular-svg-icons": "^7.1.0",
    "@fortawesome/free-solid-svg-icons": "^7.1.0",
    "@fortawesome/react-fontawesome": "^3.1.0",
    "@types/react-native": "^0.72.8",
    "js-yaml": "^4.1.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-native-web": "^0.21.1",
    "react-router-dom": "^7.9.3",
    "socket.io-client": "^4.8.1"
  }
}
```

#### Key Dependencies
- **react/react-dom**: React 19 core libraries
- **react-native-web**: Cross-platform component library
- **react-router-dom**: Client-side routing
- **socket.io-client**: Real-time Socket.io communication
- **@fortawesome**: Icon library
- **js-yaml**: YAML config file parsing

### 7.2 Development Dependencies

```json
{
  "devDependencies": {
    "@eslint/js": "^9.36.0",
    "@playwright/test": "^1.55.1",
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^24.5.2",
    "@types/react": "^19.2.2",
    "@types/react-dom": "^19.2.2",
    "@vitejs/plugin-react": "^5.0.3",
    "eslint": "^9.36.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.20",
    "globals": "^16.4.0",
    "playwright": "^1.55.1",
    "typescript": "~5.8.3",
    "typescript-eslint": "^8.44.0",
    "vite": "^7.1.7"
  }
}
```

#### Key Dev Dependencies
- **vite**: Build tool
- **typescript**: TypeScript compiler
- **@vitejs/plugin-react**: React support for Vite
- **playwright**: E2E testing framework
- **eslint**: Code linting
- **@types/***: TypeScript type definitions

---

## 8. Build Configuration

### 8.1 Production Build Optimization

**Location**: `apps/web/vite.config.ts`

```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        // React libraries in separate chunk
        'react-vendor': ['react', 'react-dom', 'react-router-dom'],

        // React Native Web in separate chunk (largest library)
        'react-native-web': ['react-native-web'],

        // FontAwesome in separate chunk
        'fontawesome': [
          '@fortawesome/fontawesome-svg-core',
          '@fortawesome/free-solid-svg-icons',
          '@fortawesome/free-regular-svg-icons',
          '@fortawesome/react-fontawesome'
        ],
      },
    },
  },

  // Chunk size warning threshold
  chunkSizeWarningLimit: 600,
}
```

### 8.2 Chunk Strategy

**Purpose**: Split large libraries into separate chunks for better caching and parallel loading.

**Chunks**:
1. **react-vendor.js**: React core (react, react-dom, react-router-dom)
2. **react-native-web.js**: React Native Web (largest library)
3. **fontawesome.js**: Icon library
4. **index.js**: Application code

**Benefits**:
- **Better Caching**: Library chunks change less frequently
- **Parallel Loading**: Browser loads chunks in parallel
- **Faster Updates**: App code changes don't invalidate library cache

### 8.3 Build Output

```
apps/web/dist/
├── index.html
├── assets/
│   ├── index-[hash].js           # Application code
│   ├── react-vendor-[hash].js    # React libraries
│   ├── react-native-web-[hash].js # React Native Web
│   ├── fontawesome-[hash].js     # Icons
│   └── index-[hash].css          # Styles
└── vite.svg
```

**Hash**: Content-based hash for cache busting.

---

## 9. Common Issues

### 9.1 Duplicate React Instance

**Problem**: "Invalid hook call" or "Hooks can only be called inside the body of a function component"

**Cause**: Multiple React instances in the bundle (npm link, monorepo, etc.)

**Solution**: Explicitly alias React in `vite.config.ts`:
```typescript
resolve: {
  alias: {
    'react': path.resolve(__dirname, 'node_modules/react'),
    'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
  },
}
```

### 9.2 Module Not Found: @shared

**Problem**: Cannot find module '@shared/components'

**Cause**: Missing path alias in TypeScript or Vite config

**Solution**:
1. **Vite** (`vite.config.ts`):
   ```typescript
   resolve: {
     alias: {
       '@shared': path.resolve(__dirname, '../shared'),
     },
   }
   ```

2. **TypeScript** (`tsconfig.app.json`):
   ```json
   {
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@shared": ["../shared"],
         "@shared/*": ["../shared/*"]
       }
     }
   }
   ```

### 9.3 React Native Web StyleSheet Issues

**Problem**: CSS string values (e.g., `'100vh'`, `'calc()'`) cause TypeScript errors in `StyleSheet.create()`

**Cause**: React Native Web's StyleSheet doesn't support CSS string values

**Solution**: Use inline styles or HTML div elements:
```typescript
// ❌ TypeScript error
const styles = StyleSheet.create({
  container: { minHeight: '100vh' }  // Error: Type 'string' is not assignable
})

// ✅ Use inline style
<View style={{ minHeight: '100vh' }}>

// ✅ Or use HTML div
<div className="page-container" style={{ minHeight: '100vh' }}>
```

### 9.4 Mobile Device Can't Access Dev Server

**Problem**: Mobile device can't connect to `http://localhost:3000`

**Cause**: Dev server only listening on `localhost` (127.0.0.1)

**Solution**: Set `host: '0.0.0.0'` in `config/base.yml`:
```yaml
server:
  web:
    host: '0.0.0.0'  # Allow network access
    port: 3000
```

**Access URLs**:
- **Android Emulator**: `http://10.0.2.2:3000`
- **iOS Simulator**: `http://localhost:3000`
- **Physical Devices**: `http://<YOUR_LOCAL_IP>:3000`

### 9.5 Vite Port Already in Use

**Problem**: "Port 3000 is already in use"

**Cause**: Another process using port 3000, or previous dev server not killed

**Solution**:
```bash
# Kill process on port 3000 (from project root)
npm run kill

# Or from web directory
cd apps/web && npm run kill
```

---

## 10. Related Documentation

### Core Documentation
- **[ARCHITECTURE.md](../00-core/ARCHITECTURE.md)**: Overall project architecture
- **[DEVELOPMENT.md](../00-core/DEVELOPMENT.md)**: Development workflow and commands
- **[DATABASE.md](../00-core/DATABASE.md)**: Database schema and migrations

### Web Documentation
- **[WEB-ROUTING.md](./WEB-ROUTING.md)**: React Router configuration and protected routes
- **[WEB-THEME.md](./WEB-THEME.md)**: Theme system and color palette
- **[WEB-LAYOUT.md](./WEB-LAYOUT.md)**: Responsive layout patterns (desktop/mobile)
- **[WEB-PATTERNS.md](./WEB-PATTERNS.md)**: Common React Native Web patterns
- **[WEB-TESTING.md](./WEB-TESTING.md)**: Playwright E2E testing

### Shared Documentation
- **[SHARED-OVERVIEW.md](../03-shared/SHARED-OVERVIEW.md)**: Shared module overview
- **[SHARED-CONTEXTS.md](../03-shared/SHARED-CONTEXTS.md)**: ThemeContext, SocketContext
- **[SHARED-HOOKS.md](../03-shared/SHARED-HOOKS.md)**: useAuth, useLogin, etc.
- **[SHARED-COMPONENTS.md](../03-shared/SHARED-COMPONENTS.md)**: Cross-platform components

### Friendly Server Documentation
- **[FRIENDLY-OVERVIEW.md](../04-friendly/FRIENDLY-OVERVIEW.md)**: Backend server overview
- **[FRIENDLY-AUTH.md](../04-friendly/FRIENDLY-AUTH.md)**: Authentication system
- **[FRIENDLY-JOB-SOCKET.md](../04-friendly/FRIENDLY-JOB-SOCKET.md)**: Job + Socket.io system

---

**Document Version**: 1.0.0
**Covers Files**: `vite.config.ts`, `tsconfig.*.json`, `index.html`, `main.tsx`, `App.tsx`, `package.json`
