# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Niney Life Pickr is a life decision-making application built as a multi-platform solution. Currently implementing web (React + Vite + TypeScript) and mobile (React Native) applications, with plans for dual backend services (Node.js "friendly" and Python "smart" servers).

## Architecture

### Current Structure
```
niney-life-pickr/
├── config/                     # Shared YAML configuration files
│   ├── base.yml                # Base configuration for all environments
│   └── production.yml          # Production-specific overrides
├── apps/
│   ├── web/                    # React + Vite PWA application
│   │   ├── src/
│   │   │   ├── components/     # Reusable UI components
│   │   │   ├── config/         # TypeScript config loader (index.ts)
│   │   │   ├── pages/          # Page components (Home.tsx)
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── services/       # API services
│   │   │   ├── utils/          # Utility functions
│   │   │   └── types/          # TypeScript type definitions
│   │   ├── scripts/            # Utility scripts
│   │   │   └── kill-dev.cjs    # Windows dev server kill script
│   │   ├── tests/e2e/          # Playwright E2E tests
│   │   └── public/             # Static assets including manifest.json
│   └── mobile/                 # React Native mobile application
│       ├── src/
│       │   ├── screens/        # Screen components
│       │   ├── navigation/     # React Navigation setup
│       │   ├── components/     # Reusable UI components
│       │   ├── services/       # API services
│       │   ├── hooks/          # Custom React hooks
│       │   ├── utils/          # Utility functions
│       │   └── types/          # TypeScript type definitions
│       ├── android/            # Android native code
│       └── ios/                # iOS native code
```

### Planned Architecture
- **servers/friendly**: Node.js backend service
- **servers/smart**: Python backend with ML/AI capabilities
- **packages/**: Shared code between applications

## Key Commands

### Web Application Development
```bash
cd apps/web
npm run dev        # Start development server on port 3000
npm run build      # Build for production with TypeScript checking
npm run preview    # Preview production build
npm run lint       # Run ESLint
npm run kill       # Kill dev server process on Windows (reads port from config)
npm run dev:clean  # Kill existing dev server and start fresh

# E2E Testing with Playwright
npm run test:e2e         # Run all E2E tests
npm run test:e2e:ui      # Open Playwright UI mode
npm run test:e2e:debug   # Run tests in debug mode
npm run test:e2e:headed  # Run tests with browser visible
npm run test:e2e:report  # Show test report
```

### Mobile Application Development
```bash
cd apps/mobile
npm start          # Start Metro bundler
npm run android    # Run on Android device/emulator
npm run ios        # Run on iOS device/simulator (macOS only)
npm run lint       # Run ESLint
npm test           # Run Jest tests

# Android specific
cd android && ./gradlew.bat clean  # Clean Android build (Windows)
cd android && ./gradlew clean      # Clean Android build (Mac/Linux)
```

## Technology Stack

### Web Application
- **React 19.1.1** with TypeScript 5.8.3
- **Vite 7.1.2** for fast development and building
- **Tailwind CSS v4.1.13** with @tailwindcss/postcss for styling
- **PWA Support** via vite-plugin-pwa with auto-update and offline capabilities
- **PostCSS** configuration using @tailwindcss/postcss plugin
- **js-yaml** for YAML configuration parsing
- **Playwright** for E2E testing with @axe-core/playwright for accessibility testing

### Mobile Application
- **React Native 0.81.1** with TypeScript 5.8.3
- **React Navigation v7** for navigation (stack + bottom tabs)
- **React Native Elements v3.4.3** for UI components
- **React Native Reanimated v4.1.0** for animations
- **React Native Vector Icons v10.3.0** for icons
- **React Native Worklets v0.5.1** for Reanimated support
- **Babel plugin**: Uses `react-native-worklets/plugin` (not deprecated `react-native-reanimated/plugin`)

## Configuration System

### YAML-based Configuration
- Configuration files stored in root `config/` directory
- `base.yml`: Default configuration for development
- `production.yml`: Production overrides (merged with base)
- TypeScript loader at `apps/web/src/config/index.ts`
- Environment variable overrides supported (VITE_PORT, VITE_HOST)

### Port Management
- Default port: 3000 (configured in `config/base.yml`)
- `strictPort: true` ensures the server fails if port is occupied
- Windows kill script (`kill-dev.cjs`) reads port from config to ensure correct process termination

## Development Workflow

### Windows Process Management
The project includes a Node.js script to handle development server cleanup on Windows:
- `npm run kill`: Terminates any process using the configured port
- `npm run dev:clean`: Kills existing processes before starting new dev server
- Script reads port from `config/base.yml` or `VITE_PORT` environment variable
- Uses Windows `netstat` and `taskkill` commands for process management

### Configuration Details

#### Tailwind CSS v4 Setup
- Uses `@import "tailwindcss";` syntax (v4 requirement)
- PostCSS configured with `@tailwindcss/postcss` plugin
- Content paths configured for all TypeScript/TSX files

#### PWA Configuration
- Auto-update registration type in development
- Service worker with Workbox for offline support
- Manifest at `public/manifest.json` with app metadata
- Caching strategies for static assets and Google Fonts

## Testing Strategy

### Hybrid Testing Approach (Jest + E2E)
The project follows a hybrid testing strategy:
- **Unit/Integration Tests (Jest)**: For business logic, utilities, and component testing
- **E2E Tests**: For critical user flows and cross-platform verification
  - Web: Playwright
  - Mobile: Maestro (planned)

### Web Testing (Playwright)
- Tests located in `apps/web/tests/e2e/`
- Configuration in `apps/web/playwright.config.ts`
- Browsers tested: Chromium, Mobile Chrome, Mobile Safari
- Firefox and Desktop Safari are disabled in config
- Automatic dev server startup before tests

```bash
cd apps/web
npm run test:e2e         # Run all E2E tests
npm run test:e2e:ui      # UI mode for debugging
npm run test:e2e:headed  # Run with visible browser
```

### Mobile Testing

#### Unit Testing (Jest + React Native Testing Library)
- Unit tests in `apps/mobile/__tests__/`
- Configuration in `apps/mobile/jest.config.js`
- Setup file in `apps/mobile/jest.setup.js`
- Uses @testing-library/react-native (not deprecated react-test-renderer)

```bash
cd apps/mobile
npm test                 # Run all Jest tests
npm test -- --watch      # Watch mode
```

#### E2E Testing (Maestro)
- Test flows in `apps/mobile/tests/e2e/flows/`
- Configuration in `apps/mobile/maestro.yaml`
- Visual test creation with Maestro Studio
- Cross-platform test execution (iOS/Android)

```bash
cd apps/mobile
npm run test:e2e         # Run all E2E tests
npm run test:e2e:smoke   # Run smoke test only
npm run test:e2e:studio  # Open Maestro Studio
npm run test:e2e:record  # Record new test flows
npm run test:e2e:cloud   # Run on Maestro Cloud
```

Test flows available:
- `smoke-test.yaml`: Basic app functionality verification
- `app-launch.yaml`: App launch and initial screen
- `counter-test.yaml`: Counter increment functionality
- `navigation-test.yaml`: Menu navigation testing

### Test Coverage Focus
- Critical user paths (E2E)
- Business logic and utilities (Unit)
- Accessibility compliance (WCAG)
- Component interactions
- Error handling

## Mobile Development Requirements

### Android Setup
- Android Studio with SDK
- ANDROID_HOME environment variable
- Path includes: `%ANDROID_HOME%\platform-tools` and `%ANDROID_HOME%\tools`
- JDK 17-20 (React Native requirement)
- Android SDK Build Tools 36.0.0

### iOS Setup (macOS only)
- Xcode with iOS Simulator
- CocoaPods: `cd ios && pod install`

## Current Implementation Status

- ✅ Web application foundation with React + Vite + TypeScript
- ✅ Tailwind CSS v4 with PostCSS integration
- ✅ PWA setup with offline capabilities
- ✅ YAML-based configuration system
- ✅ Windows-compatible development scripts
- ✅ Home page with responsive design
- ✅ E2E testing with Playwright
- ✅ Accessibility compliance (semantic HTML, ARIA labels)
- ✅ React Native mobile app structure and navigation
- 🔲 Mobile app feature parity with web
- 🔲 Node.js "friendly" backend service
- 🔲 Python "smart" backend service with ML capabilities