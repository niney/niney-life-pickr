# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Niney Life Pickr is a life decision-making application built as a multi-platform solution with web (React + Vite + TypeScript), mobile (React Native), and backend (Node.js) applications. Future plans include a Python "smart" backend service with ML/AI capabilities.

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
│   │   │   ├── config/         # TypeScript config loader
│   │   │   ├── pages/          # Page components
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
│       ├── tests/e2e/flows/    # Maestro E2E test flows
│       ├── scripts/             # Cross-platform Maestro runner
│       ├── android/            # Android native code
│       └── ios/                # iOS native code
└── servers/
    └── friendly/               # Node.js backend service
        ├── src/
        │   ├── app.ts          # Express app configuration
        │   ├── server.ts       # Server entry point
        │   ├── routes/         # API route definitions
        │   ├── controllers/    # Request handlers
        │   ├── services/       # Business logic
        │   ├── middlewares/    # Custom middleware
        │   ├── utils/          # Utility functions
        │   └── types/          # TypeScript type definitions
        └── dist/               # Compiled JavaScript output
```

### Planned Architecture
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
npm test           # Run Jest unit tests

# E2E Testing with Maestro
npm run test:e2e         # Run all Maestro E2E tests
npm run test:e2e:smoke   # Run smoke test only
npm run test:e2e:studio  # Open Maestro Studio for visual test creation
npm run test:e2e:record  # Record new test flows
npm run test:e2e:cloud   # Run tests on Maestro Cloud

# Platform-specific
cd android && ./gradlew.bat clean  # Clean Android build (Windows)
cd android && ./gradlew clean      # Clean Android build (Mac/Linux)
cd ios && pod install              # Install iOS dependencies (macOS only)
```

### Friendly Server (Node.js Backend)
```bash
cd servers/friendly
npm run dev        # Start development server with hot reload (port 4000)
npm run build      # Build TypeScript to JavaScript
npm run start      # Start production server
npm run start:prod # Start with NODE_ENV=production
npm run clean      # Clean build directory
npm run lint       # Run ESLint
npm run lint:fix   # Fix linting issues
npm run type-check # TypeScript type checking without building
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
- **React Native Gesture Handler** for touch interactions
- **React Native Safe Area Context** for device-safe layouts
- **Maestro** for E2E testing with YAML-based test flows
- **Testing Library React Native** for unit testing
- **Babel plugin**: Uses `react-native-worklets/plugin` (not deprecated `react-native-reanimated/plugin`)

### Friendly Server (Node.js Backend)
- **Node.js** with TypeScript 5.9.2
- **Express 5.1.0** web framework
- **Helmet** for security headers
- **CORS** for cross-origin resource sharing
- **Morgan** for HTTP request logging
- **Compression** for response compression
- **js-yaml** for YAML config parsing
- **Nodemon** for development hot reload
- **ts-node** for TypeScript execution

## Configuration System

### YAML-based Configuration
- Configuration files stored in root `config/` directory
- `base.yml`: Default configuration for development
- `production.yml`: Production overrides (merged with base)
- TypeScript loaders in each app load and parse configuration
- Environment variable overrides supported

### Port Configuration
- Web app: 3000 (development), 8080 (production)
- Friendly server: 4000
- Smart server (planned): 5000
- `strictPort: true` ensures exact port usage

### Production Configuration
- External host binding (0.0.0.0)
- PWA prompt mode instead of auto-update
- API endpoint configuration
- Performance optimizations

## Development Workflow

### Windows Process Management
- `npm run kill`: Terminates processes using configured port
- `npm run dev:clean`: Kills existing processes before starting
- Scripts read port from config files
- Cross-platform compatibility via Node.js scripts

### Mobile Development Setup
#### Android Requirements
- Android Studio with SDK
- ANDROID_HOME environment variable
- Path includes: `%ANDROID_HOME%\platform-tools`
- JDK 17-20 (React Native requirement)
- Android emulator or physical device

#### iOS Requirements (macOS only)
- Xcode with iOS Simulator
- CocoaPods: `cd ios && pod install`
- Apple Developer account for device testing

### Configuration Details

#### Tailwind CSS v4 Setup
- Uses `@import "tailwindcss";` syntax (v4 requirement)
- PostCSS configured with `@tailwindcss/postcss` plugin
- Content paths configured for all TypeScript/TSX files

#### PWA Configuration
- Auto-update in development, prompt in production
- Service worker with Workbox for offline support
- Manifest at `public/manifest.json` with app metadata
- Caching strategies for static assets and Google Fonts

## Testing Strategy

### Hybrid Testing Approach (Jest + E2E)
- **Unit/Integration Tests (Jest)**: Business logic, utilities, components
- **E2E Tests**: Critical user flows and cross-platform verification
  - Web: Playwright
  - Mobile: Maestro

### Web Testing (Playwright)
- Tests in `apps/web/tests/e2e/`
- Browsers tested: Chromium, Mobile Chrome, Mobile Safari
- Automatic dev server startup before tests
- HTML reporter for test results
- Accessibility testing with axe-core

### Mobile Testing

#### Unit Testing (Jest + React Native Testing Library)
- Tests in `apps/mobile/__tests__/`
- Comprehensive mocking setup in `jest.setup.js`
- Transform ignore patterns for React Native modules
- Module path mappings for TypeScript aliases

#### E2E Testing (Maestro)
- Test flows in `apps/mobile/tests/e2e/flows/`
- Cross-platform runner script for Windows/macOS/Linux
- Visual test creation with Maestro Studio
- Available test flows:
  - `smoke-test.yaml`: Basic app functionality
  - `app-launch.yaml`: App launch verification
  - `counter-test.yaml`: Counter functionality
  - `navigation-test.yaml`: Menu navigation

### Test Coverage Focus
- Critical user paths (E2E)
- Business logic and utilities (Unit)
- Accessibility compliance (WCAG)
- Component interactions
- Error handling

## Current Implementation Status

- ✅ Web application with React + Vite + TypeScript
- ✅ Tailwind CSS v4 with PostCSS integration
- ✅ PWA setup with offline capabilities
- ✅ YAML-based configuration system
- ✅ Windows-compatible development scripts
- ✅ Home page with responsive design
- ✅ E2E testing with Playwright for web
- ✅ Accessibility compliance (semantic HTML, ARIA labels)
- ✅ React Native mobile app with navigation
- ✅ Maestro E2E testing for mobile app
- ✅ Node.js "friendly" backend service structure
- 🔲 Mobile app feature parity with web
- 🔲 Backend API implementation
- 🔲 Python "smart" backend service with ML capabilities
- 🔲 Database integration
- 🔲 Authentication system
- 🔲 Real-time features