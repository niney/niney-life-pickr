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
├── packages/
│   └── shared/                 # Shared code between web and mobile
│       ├── src/
│       │   ├── types/          # Common TypeScript types
│       │   ├── services/       # API service classes
│       │   ├── utils/          # Shared utility functions
│       │   └── constants/      # Shared constants
│       └── dist/               # Compiled JavaScript output
├── apps/
│   ├── web/                    # React + Vite PWA application
│   │   ├── src/
│   │   │   ├── components/     # Reusable UI components
│   │   │   ├── config/         # TypeScript config loader
│   │   │   ├── pages/          # Page components (Login, Register, Home)
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── services/       # Web-specific API services
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
│       │   ├── services/       # Mobile-specific API services
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
    │   │   │   ├── auth.routes.ts   # Authentication endpoints
    │   │   │   ├── health.routes.ts # Health check endpoints
    │   │   │   ├── api.routes.ts    # General API endpoints
    │   │   │   └── docs.routes.ts   # API documentation endpoints
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

### Shared Package Development
```bash
cd packages/shared
npm run build      # Build TypeScript to JavaScript
npm run dev        # Watch mode for development
npm run type-check # TypeScript type checking without building
npm run clean      # Clean build directory
```

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
npm run dev:clean  # Kill existing server and start fresh
npm run build      # Build TypeScript to JavaScript (uses tsconfig.build.json)
npm run start      # Start production server
npm run start:prod # Start with NODE_ENV=production
npm run clean      # Clean build directory
npm run lint       # Run ESLint
npm run lint:fix   # Fix linting issues
npm run type-check # TypeScript type checking without building
npm run db:reset   # Reset database and re-run migrations
npm run kill       # Kill server process (reads port from config/base.yml)

# Testing with Vitest + Supertest
npm test           # Run all tests in watch mode
npm run test:run   # Run all tests once
npm run test:ui    # Open Vitest UI
npm run test:coverage  # Run tests with coverage report
npm run test:unit      # Run unit tests only
npm run test:integration  # Run integration tests only
npm run test:auth  # Run auth routes tests only

# Run a single test file
npm test -- src/__tests__/integration/auth.routes.test.ts
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

### Shared Package
- **TypeScript 5.8.3** with ES2020 target
- **Centralized Types**: User, ApiResponse, LoginRequest, etc.
- **API Service Classes**: BaseApiService with fetch wrapper, AuthService
- **Validation Utilities**: Form validation rules and helpers
- **Storage Abstraction**: Platform-agnostic storage interface

### Web Application
- **React 19.1.1** with TypeScript 5.8.3
- **Vite 7.1.2** for fast development and building
- **React Router DOM 7.8.2** for client-side routing
- **@niney/shared** local package for shared code
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
- **Fastify 5.6.0** high-performance web framework (migrated from Express)
- **TypeScript 5.9.2** with strict type checking
- **SQLite3 5.1.7** lightweight file-based database
- **bcrypt 6.0.0** for password hashing
- **@fastify/swagger 9.5.1** for OpenAPI 3.0 specification
- **@fastify/swagger-ui 5.2.3** for interactive API documentation
- **@scalar/fastify-api-reference 1.35.3** for modern API reference UI
- **@fastify/type-provider-typebox 5.2.0** with **@sinclair/typebox 0.34.41** for runtime validation
- **@fastify/helmet 13.0.1** for security headers
- **@fastify/cors 11.1.0** for cross-origin resource sharing
- **@fastify/sensible 6.0.3** for sensible defaults
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

## API Documentation System

### Multiple Documentation Formats
The friendly server provides comprehensive API documentation in multiple formats:

#### Swagger UI (Interactive Documentation)
- **URL**: `http://localhost:4000/docs`
- Interactive interface for testing API endpoints
- JWT Bearer token authentication support
- Request/response examples with TypeBox schema validation
- Persistent authorization across sessions

#### Scalar API Reference (Modern Alternative)
- **URL**: `http://localhost:4000/reference`
- Modern, responsive API documentation interface
- Dark mode support with purple theme
- Enhanced UX with better navigation and search

#### OpenAPI JSON Specification
- **Endpoint**: `GET /api/docs/spec`
- Complete OpenAPI 3.0 specification in JSON format
- Machine-readable API specification for tooling integration

#### Route-Specific Documentation Generation
- **Endpoint**: `GET /api/docs/generate/:routeName`
- Generates documentation for specific routes (auth, health, api)
- Creates separate folders in `generated-docs/` directory (gitignored)
- Outputs two formats per route:
  - `{routeName}-api-doc.md` - Markdown documentation with examples
  - `{routeName}-api-doc.json` - Filtered OpenAPI specification
- Automatically filters endpoints by route prefix

#### AI-Friendly API Prompt
- **Endpoint**: `GET /api/docs/ai-prompt`
- Generates comprehensive AI-friendly prompts describing all API endpoints
- Includes request/response examples, authentication info, and usage examples
- Grouped by endpoint tags with detailed descriptions
- Perfect for training AI assistants or generating documentation

#### Markdown Documentation
- **Endpoint**: `GET /api/docs/markdown`
- Complete API documentation in Markdown format
- Suitable for README files or static documentation sites
- Includes endpoint tables, schemas, and examples

### Documentation Features
- **Auto-generated Examples**: TypeBox schemas automatically generate JSON examples
- **JWT Authentication**: Ready for Bearer token implementation
- **Tag-based Organization**: Endpoints organized by functional areas (auth, health, api, users)
- **Response Standardization**: Consistent error/success response format across all endpoints
- **Schema Validation**: Request/response validation with detailed error messages

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

## Database System

### SQLite Integration
- **Database**: SQLite3 with file-based storage (`servers/friendly/data/niney.db`)
- **Migrations**: Automated database migrations on server startup
- **Location**: Migration files in `servers/friendly/src/db/migrations/`

### Current Schema
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

### Migration System
- **Auto-execution**: Migrations run automatically on server startup
- **Version Tracking**: Migration history stored in migrations table
- **Reset Command**: `npm run db:reset` for development database reset
- **File-based**: SQL migration files with sequential naming (001_create_users.sql)

## Authentication System

### Current Implementation
- **Registration**: `POST /api/auth/register`
  - Email/username uniqueness validation
  - Password strength requirements (minimum 6 characters)
  - Username length validation (3-50 characters)
  - Bcrypt password hashing with 10 salt rounds
  - Automatic account activation
  - TypeBox schema validation

- **Login**: `POST /api/auth/login`
  - Email/password authentication (case-insensitive email)
  - Last login timestamp tracking with database update
  - Returns updated user with last_login field
  - Standardized response format

- **User Management**: `GET /api/auth/users`
  - User listing endpoint (for testing/admin purposes)
  - Excludes password hashes from responses
  - User count and details
  - Consistent ordering by ID

### Security Features
- **Password Hashing**: bcrypt with configurable salt rounds
- **SQL Injection Protection**: Parameterized queries throughout
- **Input Validation**: TypeBox schema validation for all endpoints
- **Security Headers**: Helmet integration for common security headers
- **CORS Configuration**: Configurable cross-origin resource sharing

### Future JWT Implementation
- Authentication system is prepared for JWT token integration
- Session table ready for token storage
- Bearer token authentication configured in OpenAPI spec
- Response types include token field for future implementation

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

### Response Helper Utilities
Response helpers available in `servers/friendly/src/utils/response.utils.ts`:
- `ResponseHelper.success()` - 200 OK
- `ResponseHelper.created()` - 201 Created
- `ResponseHelper.error()` - Custom error
- `ResponseHelper.validationError()` - 400 Bad Request
- `ResponseHelper.unauthorized()` - 401 Unauthorized
- `ResponseHelper.forbidden()` - 403 Forbidden
- `ResponseHelper.notFound()` - 404 Not Found
- `ResponseHelper.conflict()` - 409 Conflict
- `ResponseHelper.paginated()` - Paginated response format

## TypeScript Configuration

### Build Configuration
- **Development**: Uses `tsconfig.json` (excludes vitest.config.ts from includes)
- **Production Build**: Uses `tsconfig.build.json` (excludes test files)
- **Test Configuration**: Tests use `buildApp()` function for proper Fastify initialization
- **Path Aliases**: Configured in both TypeScript and test runners
  - Friendly Server: `@routes`, `@controllers`, `@services`, `@middlewares`, `@utils`, `@types`
  - Mobile: `@/*` for src directory access

## Development Workflow

### Process Management
- **Kill Script**: `scripts/kill.js` automatically reads port from `config/base.yml`
  - Reads `server.friendly.port` configuration (default: 4000)
  - Cross-platform support (Windows/Mac/Linux)
  - Handles multiple processes on the same port
- `npm run kill`: Terminates server process on configured port
- `npm run dev:clean`: Kills existing server then starts fresh

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

### Test Organization
- **Friendly Server Tests**:
  - Unit tests: `src/__tests__/unit/`
  - Integration tests: `src/__tests__/integration/`
  - Auth routes test: Comprehensive test suite for authentication endpoints
    - Registration validation and error handling
    - Login with case-insensitive email support
    - User listing and management
    - Performance and concurrent request handling

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
npm test -- src/__tests__/integration/auth.routes.test.ts

# Run specific test suite
npm run test:auth  # Auth routes tests only

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
- **Shared package (@niney/shared) for code reuse between web and mobile**
- **Web authentication UI (login, registration, home with protected routes)**
- **React Router DOM integration for navigation**
- Tailwind CSS v4 with PostCSS integration
- PWA setup with offline capabilities
- YAML-based configuration system
- Windows-compatible development scripts
- E2E testing with Playwright for web
- React Native mobile app with navigation
- Maestro E2E testing for mobile app
- **Fastify-based backend service with comprehensive API documentation**
- **SQLite database integration with automated migrations**
- **Complete authentication system (registration, login, user management)**
- **OpenAPI 3.0 specification with multiple documentation formats**
- **Standardized API response format with TypeScript validation**
- **Multiple API documentation interfaces (Swagger UI, Scalar, AI-friendly)**
- **Route-specific documentation generation (auth, health, api)**
- Vitest + Supertest testing for backend
- Python "smart" backend service with FastAPI
- pytest testing environment for smart server

### 🔲 In Progress
- JWT token authentication implementation
- Mobile app feature parity with web
- Backend business logic implementation
- ML model integration in smart server
- Real-time features
- Production database (PostgreSQL)

## Common Development Tasks

### Testing API Endpoints
```bash
# Registration (validates email format, username length 3-50, password min 6)
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"password123"}'

# Login (case-insensitive email, updates last_login)
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test account for quick access (already registered)
# Email: niney@ks.com
# Password: tester

# Health check
curl http://localhost:4000/health

# Get OpenAPI specification
curl http://localhost:4000/api/docs/spec

# Get AI-friendly API prompt
curl http://localhost:4000/api/docs/ai-prompt

# Get Markdown documentation
curl http://localhost:4000/api/docs/markdown

# Generate route-specific documentation
curl http://localhost:4000/api/docs/generate/auth
curl http://localhost:4000/api/docs/generate/health
curl http://localhost:4000/api/docs/generate/api
```

### Database Operations
```bash
# Reset database (delete and recreate)
cd servers/friendly && npm run db:reset

# View database (requires SQLite CLI)
sqlite3 servers/friendly/data/niney.db ".tables"
sqlite3 servers/friendly/data/niney.db "SELECT * FROM users;"
```

### Accessing API Documentation
```bash
# Interactive Swagger UI
open http://localhost:4000/docs

# Modern Scalar API Reference
open http://localhost:4000/reference

# Get AI prompt for API integration
curl http://localhost:4000/api/docs/ai-prompt -s | jq -r '.prompt' > api-prompt.txt
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
[friendly] feat: Add Swagger documentation with AI prompt generation
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