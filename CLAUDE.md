# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Niney Life Pickr is a life decision-making application being built as a multi-platform solution. Currently implementing the web application with React + Vite + TypeScript, with plans for React Native mobile app and dual backend services (Node.js "friendly" and Python "smart" servers).

## Architecture

### Current Structure
```
niney-life-pickr/
├── config/                     # Shared YAML configuration files
│   ├── base.yml                # Base configuration for all environments
│   └── production.yml          # Production-specific overrides
├── apps/
│   └── web/                    # React + Vite PWA application
│       ├── src/
│       │   ├── components/     # Reusable UI components
│       │   ├── config/         # TypeScript config loader (index.ts)
│       │   ├── pages/          # Page components (Home.tsx)
│       │   ├── hooks/          # Custom React hooks
│       │   ├── services/       # API services
│       │   ├── utils/          # Utility functions
│       │   └── types/          # TypeScript type definitions
│       ├── scripts/            # Utility scripts
│       │   └── kill-dev.cjs    # Windows dev server kill script
│       └── public/             # Static assets including manifest.json
```

### Planned Architecture
- **apps/mobile**: React Native CLI project (not Expo)
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

## Technology Stack

### Web Application
- **React 19.1.1** with TypeScript 5.8.3
- **Vite 7.1.2** for fast development and building
- **Tailwind CSS v4.1.13** with @tailwindcss/postcss for styling
- **PWA Support** via vite-plugin-pwa with auto-update and offline capabilities
- **PostCSS** configuration using @tailwindcss/postcss plugin
- **js-yaml** for YAML configuration parsing
- **Playwright** for E2E testing with @axe-core/playwright for accessibility testing

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

## E2E Testing

### Playwright Configuration
- Tests located in `apps/web/tests/e2e/`
- Configuration in `apps/web/playwright.config.ts`
- Browsers tested: Chromium, Mobile Chrome, Mobile Safari
- Note: Firefox and Desktop Safari are currently disabled in config
- Automatic dev server startup before tests
- HTML reporter for test results

### Test Coverage
- Homepage functionality tests
- Accessibility tests (WCAG compliance)
- PWA feature verification
- Responsive design testing
- Keyboard navigation testing

## Current Implementation Status

- ✅ Web application foundation with React + Vite + TypeScript
- ✅ Tailwind CSS v4 with PostCSS integration
- ✅ PWA setup with offline capabilities
- ✅ YAML-based configuration system
- ✅ Windows-compatible development scripts
- ✅ Home page with responsive design
- ✅ E2E testing with Playwright
- ✅ Accessibility compliance (semantic HTML, ARIA labels)
- 🔲 React Native mobile app
- 🔲 Node.js "friendly" backend service
- 🔲 Python "smart" backend service with ML capabilities