# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Niney Life Pickr is a life decision-making application built as a multi-platform solution with web (React + Vite + TypeScript), mobile (React Native), and backend services (Node.js "friendly" server and Python "smart" ML/AI server).

## Git Commit Message Convention

When creating commits, prefix the subject with the affected project scope:
- `[web]` - Changes to the web application (apps/web)
- `[mobile]` - Changes to the mobile application (apps/mobile)
- `[friendly]` - Changes to the Node.js backend (servers/friendly)
- `[smart]` - Changes to the Python ML/AI backend (servers/smart)
- `[config]` - Changes to shared configuration files
- `[root]` - Changes to root-level files (package.json, CLAUDE.md, etc.)

Examples:
```
[web] feat: Add dark mode toggle to settings
[mobile] fix: Resolve navigation gesture handler conflict
[friendly] test: Add integration tests for health endpoints
[smart] feat: Implement recommendation engine with collaborative filtering
[config] chore: Update production API endpoints
```

For changes affecting multiple projects, use multiple prefixes:
```
[web][mobile] refactor: Standardize API service error handling
[friendly][smart] feat: Add rate limiting middleware
```

## High-Level Architecture

### Multi-Platform Architecture
The application follows a microservices architecture with separate frontend applications (web and mobile) and backend services:
- **Frontend**: Web PWA and React Native mobile app share similar component structure and service patterns
- **Backend**: Two specialized servers - "friendly" (Node.js for general API) and "smart" (Python for ML/AI features)
- **Database**: SQLite for friendly server (lightweight, file-based), future PostgreSQL for production
- **Authentication**: Simple email/password with bcrypt hashing (hardcoded for now, JWT planned)
- **Configuration**: Centralized YAML configuration system shared across all services
- **Communication**: RESTful APIs with CORS support for cross-origin requests

### Current Structure
```
niney-life-pickr/
├── config/                     # Shared YAML configuration files
│   ├── base.yml                # Base configuration for all environments
│   ├── test.yml                # Test environment overrides
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
    ├── friendly/               # Node.js backend service
    │   ├── src/
    │   │   ├── app.ts          # Express app configuration
    │   │   ├── server.ts       # Server entry point
    │   │   ├── routes/         # API route definitions
    │   │   ├── controllers/    # Request handlers
    │   │   ├── services/       # Business logic
    │   │   ├── middlewares/    # Custom middleware
    │   │   ├── utils/          # Utility functions
    │   │   └── types/          # TypeScript type definitions
    │   └── dist/               # Compiled JavaScript output
    └── smart/                  # Python ML/AI backend service
        ├── src/
        │   ├── api/            # FastAPI endpoints
        │   ├── core/           # Core functionality
        │   ├── models/         # ML models (future)
        │   ├── services/       # Business logic (future)
        │   ├── app.py          # FastAPI application
        │   └── main.py         # Entry point
        ├── tests/
        │   ├── unit/           # Unit tests
        │   └── integration/    # Integration tests
        └── scripts/            # Development and production scripts
```

### Planned Architecture
- **packages/**: Shared code between applications

## Quick Start Commands

### First-Time Setup
```bash
# Install dependencies for all projects
cd apps/web && npm install
cd ../mobile && npm install
cd ../../servers/friendly && npm install
cd ../smart && python -m venv .venv && activate.bat && pip install -e ".[dev]"
```

## Key Commands

### Web Application Development
```bash
cd apps/web
npm run dev        # Start development server on port 3000
npm run dev:clean  # Kill existing dev server and start fresh (Windows)
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

# Prerequisites for Android
# Ensure Android emulator is running or device is connected
adb devices        # Should show at least one device

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
npm run build      # Build TypeScript to JavaScript (uses tsconfig.build.json)
npm run start      # Start production server
npm run start:prod # Start with NODE_ENV=production
npm run clean      # Clean build directory
npm run lint       # Run ESLint
npm run lint:fix   # Fix linting issues
npm run type-check # TypeScript type checking without building

# Database commands
npm run db:reset   # Reset SQLite database (delete and recreate on next server start)

# Testing with Vitest + Supertest
npm test           # Run all tests in watch mode
npm run test:run   # Run all tests once
npm run test:ui    # Open Vitest UI
npm run test:coverage  # Run tests with coverage report
npm run test:unit      # Run unit tests only
npm run test:integration  # Run integration tests only

# Test API endpoints (server must be running)
# Register user
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"password123"}'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Smart Server (Python ML/AI Backend)
```bash
cd servers/smart

# Virtual environment activation (Windows)
activate.bat              # Activate .venv
deactivate.bat            # Deactivate .venv

# Virtual environment activation (Mac/Linux)
source .venv/bin/activate # Activate .venv
deactivate                # Deactivate .venv

# Development
python scripts/dev.py     # Start development server (port 5000)
python scripts/start.py   # Start production server

# Install dependencies (inside virtual environment)
pip install -e .          # Install base dependencies
pip install -e ".[dev]"   # Install with development tools
pip install -e ".[ml]"    # Install with ML libraries (optional)

# Testing with pytest
pytest                    # Run all tests
pytest tests/unit         # Run unit tests only
pytest tests/integration  # Run integration tests only
pytest --cov=src          # Run with coverage report
pytest -m unit            # Run tests marked as unit
pytest -m integration     # Run tests marked as integration

# Code quality
black src tests           # Format code
isort src tests           # Sort imports
ruff check src tests      # Lint code
mypy src                  # Type checking

# API Documentation
# Visit http://localhost:5000/docs for Swagger UI
# Visit http://localhost:5000/redoc for ReDoc
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
- **Node.js**: No specific version requirement

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
- **Node.js**: Requires >=20

### Friendly Server (Node.js Backend)
- **Node.js** with TypeScript 5.9.2
- **Express 5.1.0** web framework
- **SQLite3** for database (file-based, lightweight)
- **bcrypt** for password hashing
- **Helmet** for security headers
- **CORS** for cross-origin resource sharing
- **Morgan** for HTTP request logging
- **Compression** for response compression
- **js-yaml** for YAML config parsing
- **Nodemon** for development hot reload
- **ts-node** for TypeScript execution
- **Vitest** for unit and integration testing
- **Supertest** for HTTP endpoint testing
- **c8** for code coverage reporting

### Smart Server (Python ML/AI Backend)
- **Python 3.10+** with type hints
- **FastAPI 0.115+** async web framework
- **Uvicorn** ASGI server with hot reload
- **Pydantic v2** for data validation
- **PyYAML** for configuration parsing
- **pytest** for unit and integration testing
- **pytest-asyncio** for async test support
- **pytest-cov** for coverage reporting
- **Black** for code formatting
- **Ruff** for linting
- **mypy** for static type checking
- **Optional ML libraries**: numpy, pandas, scikit-learn, tensorflow, torch, transformers

## Configuration System

### Configuration Loading Order
All services load configuration in this specific order (later overrides earlier):
1. Default values in code
2. `config/base.yml` - Base configuration
3. `config/{environment}.yml` - Environment-specific config (test/production)
4. Environment variables - Final override

### YAML-based Configuration
- Configuration files stored in root `config/` directory
- `base.yml`: Default configuration for development
- `test.yml`: Test environment overrides (port: 0, error logging, wildcard CORS)
- `production.yml`: Production overrides (merged with base)
- TypeScript loaders in each app load and parse configuration
- Server loads environment-specific config automatically based on NODE_ENV

### Environment Variables
Environment variables override YAML configuration:
- `NODE_ENV`: development | test | production
- `PORT`: Server port number
- `HOST`: Server host address
- `LOG_LEVEL`: debug | info | warn | error
- `CORS_ORIGIN`: Allowed CORS origins
- `VITE_PORT`, `VITE_HOST`: Web app overrides

### Port Configuration
- Web app: 3000 (development), 8080 (production)
- Friendly server: 4000 (0 for tests - random port)
- Smart server: 5000
- `strictPort: true` ensures exact port usage

## Critical Implementation Details

### Database Architecture (Friendly Server)

#### SQLite Setup
- Database file: `servers/friendly/data/niney.db` (auto-created on first run)
- Migration system: Automatic migrations on server startup
- Schema versioning: SQL files in `src/db/migrations/` (e.g., `001_create_users.sql`)

#### Current Schema
```sql
users table:
  - id (INTEGER PRIMARY KEY AUTOINCREMENT)
  - email (TEXT UNIQUE)
  - username (TEXT UNIQUE)
  - password_hash (TEXT)
  - provider (TEXT DEFAULT 'local')
  - created_at, updated_at, last_login (DATETIME)
  - is_active (BOOLEAN)

sessions table (prepared for JWT):
  - id, user_id, token, expires_at, created_at
```

#### Migration Pattern
To add new schema changes:
1. Create new SQL file: `src/db/migrations/002_your_change.sql`
2. Server automatically applies on next startup
3. Migration history tracked in `migrations` table

### API Response Standardization (Friendly Server)

#### Response Structure
All API endpoints return a standardized response format for consistency and type safety:

```typescript
// Success Response
{
  "result": true,
  "message": "Success message",
  "data": { /* response data */ },
  "timestamp": "2024-01-01T00:00:00.000Z"
}

// Error Response
{
  "result": false,
  "message": "Error description",
  "statusCode": 400,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Response Helpers
Located in `src/utils/response.utils.ts`:
- `ResponseHelper.success()` - 200 OK
- `ResponseHelper.created()` - 201 Created
- `ResponseHelper.validationError()` - 400 Bad Request
- `ResponseHelper.unauthorized()` - 401 Unauthorized
- `ResponseHelper.forbidden()` - 403 Forbidden
- `ResponseHelper.notFound()` - 404 Not Found
- `ResponseHelper.conflict()` - 409 Conflict
- `ResponseHelper.error()` - Custom error with status code

#### Type Definitions
Response types in `src/types/response.types.ts`:
- `ApiResponse<T>` - Base response interface
- `SuccessResponse<T>` - Success with typed data
- `ErrorResponse` - Error with status code
- `AuthResponseData` - Auth endpoint responses
- `UserListResponseData` - User list responses

### TypeScript Configuration

#### Build Configuration
- **Development**: Uses `tsconfig.json` (includes test files for IDE support)
- **Production Build**: Uses `tsconfig.build.json` (excludes test files)
- **Path Aliases**: Configured in both TypeScript and test runners
  - Server: `@routes`, `@controllers`, `@services`, `@middlewares`, `@utils`, `@types`
  - Mobile: `@/*` for src directory access

#### IDE Support
- Test files included in main tsconfig for proper IDE type checking
- Some imports may require `@ts-ignore` comments due to IDE limitations with `esModuleInterop`

### Python Module Resolution (Smart Server)
- Project uses editable install (`pip install -e .`) for module resolution
- IntelliJ/PyCharm: Mark `servers/smart` as Sources Root
- Uses `.env` file for PYTHONPATH configuration
- Scripts in `scripts/` directory add parent to sys.path for imports

## Development Workflow

### Windows Process Management
- `npm run kill`: Terminates processes using configured port
- `npm run dev:clean`: Kills existing processes before starting
- Scripts read port from YAML config files with fallback to environment variables
- Enhanced error handling and multi-PID support

### Mobile Development Setup
#### Android Requirements
- **CRITICAL**: Android emulator or physical device MUST be running before Maestro tests
- Android Studio with SDK
- Android Studio with SDK
- ANDROID_HOME environment variable
- Path includes: `%ANDROID_HOME%\platform-tools`
- JDK 17-20 (React Native requirement)
- Android emulator or physical device must be running for Maestro tests

#### iOS Requirements (macOS only)
- Xcode with iOS Simulator
- CocoaPods: `cd ios && pod install`
- Apple Developer account for device testing

### Cross-Platform Maestro Testing
- Uses `scripts/maestro.js` for Windows/Mac/Linux compatibility
- Automatically detects and uses correct Maestro executable
- Requires device/emulator to be running before test execution

## Testing Strategy

### Test Execution Order
1. **Unit Tests First**: Run unit tests during development for quick feedback
2. **Integration Tests**: Run after unit tests pass to verify API contracts
3. **E2E Tests**: Run before commits to verify user flows

### Hybrid Testing Approach (Jest + E2E)
- **Unit/Integration Tests (Jest/Vitest)**: Business logic, utilities, components
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
- Global worklet initialization for Reanimated

#### E2E Testing (Maestro)
- Test flows in `apps/mobile/tests/e2e/flows/`
- Cross-platform runner script for Windows/macOS/Linux
- Visual test creation with Maestro Studio
- Workspace configuration for test organization
- Available test flows:
  - `smoke-test.yaml`: Basic app functionality
  - `app-launch.yaml`: App launch verification
  - `counter-test.yaml`: Counter functionality
  - `navigation-test.yaml`: Menu navigation

### Server Testing

#### Friendly Server (Vitest + Supertest)
##### Unit Testing
- Tests in `servers/friendly/src/__tests__/unit/`
- Mock external dependencies
- Test individual functions and modules
- Isolated testing environment

##### Integration Testing
- Tests in `servers/friendly/src/__tests__/integration/`
- Test API endpoints with Supertest
- Test middleware integration
- Database interaction testing (when implemented)
- Coverage threshold: 80% for all metrics (branches, functions, lines, statements)

##### Test Configuration
- Custom setup file with environment variables
- Automatic mock reset and restoration
- 10-second timeouts for tests and hooks
- Path aliases support in test files

#### Smart Server (pytest)
##### Unit Testing
- Tests in `servers/smart/tests/unit/`
- Mock external dependencies and ML models
- Test configuration loading and utilities
- Isolated testing with fixtures

##### Integration Testing
- Tests in `servers/smart/tests/integration/`
- Test FastAPI endpoints with TestClient
- Async test support with pytest-asyncio
- API endpoint validation
- Health check and ML endpoint testing

##### Test Configuration
- pytest markers for test categorization (unit, integration, slow)
- Async test mode auto-detection
- Coverage reporting with pytest-cov
- Fixtures for test clients and mock data

### Running Single Tests

#### Web (Playwright)
```bash
cd apps/web
npx playwright test tests/e2e/home.spec.ts  # Run specific test file
npx playwright test -g "should display"      # Run tests matching pattern
```

#### Mobile (Jest)
```bash
cd apps/mobile
npm test -- App.test.tsx                     # Run specific test file
npm test -- --testNamePattern="renders"      # Run tests matching pattern
```

#### Friendly Server (Vitest)
```bash
cd servers/friendly
npm test -- src/__tests__/unit/config.test.ts  # Run specific test file
npm test -- -t "should load"                   # Run tests matching pattern
```

#### Smart Server (pytest)
```bash
cd servers/smart
pytest tests/unit/test_config.py              # Run specific test file
pytest -k "test_default"                       # Run tests matching pattern
```

### Test Coverage Focus
- Critical user paths (E2E)
- Business logic and utilities (Unit)
- API endpoint functionality (Integration)
- Accessibility compliance (WCAG)
- Component interactions
- Error handling
- Security middleware validation

## Code Style and Quality

### ESLint Configuration
- Web app uses new flat config format (`eslint.config.js`)
- Mobile and server use traditional `.eslintrc` format
- TypeScript-specific rules enabled

### Prettier Configuration
- Mobile app has Prettier configuration
- Consistent formatting across TypeScript/TSX files

### Build Optimization
- Vite dynamic configuration from YAML files
- PWA runtime caching for Google Fonts (1-year cache)
- Conditional minification based on environment

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
- ✅ Vitest + Supertest testing for backend
- ✅ Python "smart" backend service with FastAPI
- ✅ pytest testing environment for smart server
- 🔲 Mobile app feature parity with web
- 🔲 Backend API implementation
- 🔲 ML model integration in smart server
- 🔲 Database integration
- 🔲 Authentication system
- 🔲 Real-time features