# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Niney Life Pickr is a life decision-making application built as a multi-platform solution with web (React + Vite + TypeScript), mobile (React Native), and backend services (Node.js Fastify + Python FastAPI).

## Architecture

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
    ├── friendly/               # Node.js backend service (Fastify)
    │   ├── src/
    │   │   ├── app.ts          # Fastify app configuration
    │   │   ├── server.ts       # Server entry point
    │   │   ├── routes/         # API route definitions
    │   │   ├── services/       # Business logic
    │   │   ├── db/             # Database layer
    │   │   │   ├── database.ts # SQLite connection manager
    │   │   │   ├── migrate.ts  # Migration runner
    │   │   │   └── migrations/ # SQL migration files
    │   │   ├── utils/          # Utility functions
    │   │   └── types/          # TypeScript type definitions
    │   ├── data/               # SQLite database file location
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
npm run build      # Build TypeScript to JavaScript (uses tsconfig.build.json)
npm run start      # Start production server
npm run start:prod # Start with NODE_ENV=production
npm run clean      # Clean build directory
npm run lint       # Run ESLint
npm run lint:fix   # Fix linting issues
npm run type-check # TypeScript type checking without building
npm run db:reset   # Delete and recreate SQLite database

# Testing with Vitest + Supertest
npm test           # Run all tests in watch mode
npm run test:run   # Run all tests once
npm run test:ui    # Open Vitest UI
npm run test:coverage  # Run tests with coverage report
npm run test:unit      # Run unit tests only
npm run test:integration  # Run integration tests only
```

### Smart Server (Python ML/AI Backend)
```bash
cd servers/smart
python scripts/dev.py    # Start development server (port 5000)
python scripts/start.py  # Start production server

# Install dependencies
pip install -e .          # Install base dependencies
pip install -e ".[dev]"   # Install with development tools
pip install -e ".[ml]"    # Install with ML libraries

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

### Mobile Application
- **React Native 0.81.1** with TypeScript 5.8.3
- **React Navigation v7** for navigation (stack + bottom tabs)
- **React Native Elements v3.4.3** for UI components
- **React Native Reanimated v4.1.0** for animations
- **React Native Vector Icons v10.3.0** for icons
- **React Native Worklets v0.5.1** for Reanimated support
- **Maestro** for E2E testing with YAML-based test flows
- **Testing Library React Native** for unit testing
- **Node.js**: Requires >=20

### Friendly Server (Node.js Backend)
- **Fastify 5.6.0** high-performance web framework
- **TypeScript 5.9.2** with strict type checking
- **SQLite3** lightweight file-based database
- **bcrypt** for password hashing
- **@fastify/cors** for cross-origin resource sharing
- **@fastify/helmet** for security headers
- **@fastify/sensible** for common utilities
- **@sinclair/typebox** for runtime type validation
- **pino** structured logging with pino-pretty for development
- **Vitest** for unit and integration testing
- **Supertest** for HTTP endpoint testing

### Smart Server (Python ML/AI Backend)
- **Python 3.10+** with type hints
- **FastAPI 0.115+** async web framework
- **Uvicorn** ASGI server with hot reload
- **Pydantic v2** for data validation
- **PyYAML** for configuration parsing
- **pytest** for unit and integration testing
- **pytest-asyncio** for async test support
- **Black, Ruff, mypy** for code quality
- **Optional ML libraries**: numpy, pandas, scikit-learn, tensorflow, torch, transformers

## Configuration System

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

## Database Architecture

### Friendly Server (SQLite)
- Database file: `servers/friendly/data/niney.db`
- Automatic migration system on server startup
- Migration files in `servers/friendly/src/db/migrations/`

Current schema:
```sql
-- users table
id INTEGER PRIMARY KEY AUTOINCREMENT
email TEXT UNIQUE NOT NULL
username TEXT UNIQUE NOT NULL
password_hash TEXT NOT NULL
provider TEXT DEFAULT 'local'
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
last_login DATETIME
is_active BOOLEAN DEFAULT 1

-- sessions table (prepared for JWT)
id INTEGER PRIMARY KEY AUTOINCREMENT
user_id INTEGER NOT NULL
token TEXT UNIQUE NOT NULL
expires_at DATETIME NOT NULL
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
FOREIGN KEY (user_id) REFERENCES users(id)
```

## API Response Standardization

All API endpoints use a consistent response format:

### Success Response
```typescript
{
  result: true,
  message: string,
  data: T,
  timestamp: string
}
```

### Error Response
```typescript
{
  result: false,
  message: string,
  statusCode: number,
  timestamp: string
}
```

Response helpers available in `servers/friendly/src/utils/response.utils.ts`:
- `ResponseHelper.success()` - 200 OK
- `ResponseHelper.created()` - 201 Created
- `ResponseHelper.error()` - Custom error
- `ResponseHelper.validationError()` - 400 Bad Request
- `ResponseHelper.unauthorized()` - 401 Unauthorized
- `ResponseHelper.forbidden()` - 403 Forbidden
- `ResponseHelper.notFound()` - 404 Not Found
- `ResponseHelper.conflict()` - 409 Conflict

## TypeScript Configuration

### Build Configuration
- **Development**: Uses `tsconfig.json` (includes test files for IDE support)
- **Production Build**: Uses `tsconfig.build.json` (excludes test files)
- **Path Aliases**: Configured in both TypeScript and test runners
  - Friendly Server: `@routes`, `@controllers`, `@services`, `@middlewares`, `@utils`, `@types`
  - Mobile: `@/*` for src directory access

## Development Workflow

### Windows Process Management
- `npm run kill`: Terminates processes using configured port
- `npm run dev:clean`: Kills existing processes before starting
- Scripts read port from YAML config files with fallback to environment variables
- Enhanced error handling and multi-PID support

### Mobile Development Setup
#### Android Requirements
- Android Studio with SDK
- ANDROID_HOME environment variable
- Path includes: `%ANDROID_HOME%\platform-tools`
- JDK 17-20 (React Native requirement)
- **Critical**: Android emulator or physical device MUST be running before Maestro tests

#### iOS Requirements (macOS only)
- Xcode with iOS Simulator
- CocoaPods: `cd ios && pod install`
- Apple Developer account for device testing

### Cross-Platform Maestro Testing
- Uses `scripts/maestro.js` for Windows/Mac/Linux compatibility
- Automatically detects and uses correct Maestro executable
- Requires device/emulator to be running before test execution

## Testing Strategy

### Hybrid Testing Approach
- **Unit/Integration Tests**: Business logic, utilities, components
  - Mobile: Jest with React Native Testing Library
  - Friendly Server: Vitest with 80% coverage threshold
  - Smart Server: pytest with async support
- **E2E Tests**: Critical user flows and cross-platform verification
  - Web: Playwright (Chromium, Mobile Chrome, Mobile Safari)
  - Mobile: Maestro (YAML-based flows)

### Test Running Examples

#### Run a single test file
```bash
# Vitest (Friendly Server)
npm test -- src/__tests__/unit/userService.test.ts

# Jest (Mobile)
npm test -- UserService.test.ts

# pytest (Smart Server)
pytest tests/unit/test_config.py

# Playwright (Web)
npm run test:e2e -- --grep "login"
```

#### Debug tests
```bash
# Vitest UI
cd servers/friendly && npm run test:ui

# Playwright debug mode
cd apps/web && npm run test:e2e:debug

# Maestro Studio
cd apps/mobile && npm run test:e2e:studio
```

## Current Implementation Status

### ✅ Completed
- Web application with React + Vite + TypeScript
- Tailwind CSS v4 with PostCSS integration
- PWA setup with offline capabilities
- YAML-based configuration system
- Windows-compatible development scripts
- E2E testing with Playwright for web
- React Native mobile app with navigation
- Maestro E2E testing for mobile app
- **Fastify migration** for friendly server
- **SQLite authentication system** with bcrypt
- **API response standardization**
- **Database migration system**
- Vitest + Supertest testing for backend
- Python "smart" backend service with FastAPI
- pytest testing environment for smart server

### 🔲 In Progress
- Mobile app feature parity with web
- JWT token implementation
- ML model integration in smart server
- Real-time features
- Production database (PostgreSQL)

## Common Development Tasks

### Testing API Endpoints
```bash
# Registration
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"password123"}'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Health check
curl http://localhost:4000/health
```

### Database Operations
```bash
# Reset database (delete and recreate)
cd servers/friendly && npm run db:reset

# View database (requires SQLite CLI)
sqlite3 servers/friendly/data/niney.db ".tables"
sqlite3 servers/friendly/data/niney.db "SELECT * FROM users;"
```

### Troubleshooting TypeScript Errors

If you encounter "unused parameter" warnings:
- Prefix unused parameters with underscore: `_request`
- Remove unused imports from file headers
- Use `npm run type-check` to verify without building

For module resolution issues:
- Check path aliases in tsconfig.json
- Verify `esModuleInterop` is enabled
- Use `@ts-ignore` sparingly for problematic imports

## Code Style and Quality

### ESLint Configuration
- Web app uses new flat config format (`eslint.config.js`)
- Mobile and server use traditional `.eslintrc` format
- TypeScript-specific rules enabled
- Run `npm run lint:fix` to auto-fix issues

### Commit Message Convention
Prefix commits with the affected scope:
- `[web]` - Web application changes
- `[mobile]` - Mobile application changes
- `[friendly]` - Node.js backend changes
- `[smart]` - Python backend changes
- `[config]` - Configuration file changes

Examples:
```
[friendly] feat: Migrate from Express to Fastify
[web] fix: Resolve hydration mismatch in PWA mode
[mobile] test: Add Maestro flows for navigation
```

## Performance Considerations

### Fastify Optimizations
- Automatic schema validation with TypeBox
- Built-in serialization optimization
- Structured logging with pino for minimal overhead
- Connection pooling prepared for future database scaling

### Build Optimization
- Vite dynamic configuration from YAML files
- PWA runtime caching for Google Fonts (1-year cache)
- Conditional minification based on environment
- Tree-shaking enabled for production builds