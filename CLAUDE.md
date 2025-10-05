# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Niney Life Pickr is a cross-platform life decision-making application with:
- Web application (React with React Native Web + Vite)
- Mobile application (React Native)
- Shared components between web and mobile
- Backend services (Node.js Fastify + Python FastAPI)

## Architecture

### Current Structure
```
niney-life-pickr/
├── config/                     # Shared YAML configuration files
│   ├── base.yml                # Base configuration for all environments
│   ├── test.yml                # Test environment overrides
│   └── production.yml          # Production-specific overrides
├── apps/
│   ├── web/                    # Web application (React Native Web)
│   │   ├── src/
│   │   │   ├── components/     # Web-specific components
│   │   │   │   └── Login.tsx   # Login component using shared components
│   │   │   ├── App.tsx         # Main app component
│   │   │   ├── main.tsx        # Entry point
│   │   │   └── index.css       # Global styles
│   │   ├── vite.config.ts      # Vite configuration with React Native Web
│   │   └── package.json
│   ├── mobile/                 # React Native mobile app
│   │   ├── src/
│   │   │   ├── screens/
│   │   │   │   └── LoginScreen.tsx  # Mobile login screen
│   │   │   └── App.tsx         # Main mobile app
│   │   ├── metro.config.js     # Metro bundler configuration
│   │   ├── android/            # Android-specific code
│   │   ├── ios/                # iOS-specific code
│   │   └── package.json
│   └── shared/                 # Shared code between web and mobile (Barrel Export Pattern)
│       ├── components/         # Cross-platform UI components
│       │   ├── Button.tsx      # Cross-platform button component
│       │   ├── InputField.tsx  # Cross-platform input field
│       │   └── index.ts        # Component barrel exports
│       ├── constants/          # Shared constants and strings (domain-separated)
│       │   ├── app.constants.ts     # APP_INFO_CONSTANTS for app-wide config
│       │   ├── auth.constants.ts    # AUTH_CONSTANTS for authentication
│       │   └── index.ts        # Constants barrel exports
│       ├── hooks/              # Shared React hooks
│       │   ├── useLogin.ts     # Login logic hook with API integration
│       │   ├── useAuth.ts      # Authentication state management hook
│       │   └── index.ts        # Hooks barrel exports
│       ├── services/           # API service layer
│       │   ├── api.service.ts  # Backend API communication
│       │   └── index.ts        # Services barrel exports
│       ├── types/              # Shared TypeScript types
│       │   └── index.ts        # Types barrel exports
│       ├── utils/              # Shared utility functions
│       │   ├── alert.utils.ts  # Cross-platform Alert implementation
│       │   ├── storage.utils.ts # Cross-platform storage (localStorage/AsyncStorage)
│       │   └── index.ts        # Utils barrel exports
│       ├── index.ts            # Main barrel export file
│       └── package.json
└── servers/
    ├── friendly/               # Node.js backend service (Fastify)
    │   ├── src/
    │   │   ├── app.ts          # Fastify app configuration
    │   │   ├── server.ts       # Server entry point
    │   │   ├── routes/         # API route definitions
    │   │   │   ├── auth.routes.ts   # Authentication endpoints
    │   │   │   ├── health.routes.ts # Health check endpoints
    │   │   │   ├── api.routes.ts    # General API endpoints
    │   │   │   ├── docs.routes.ts   # API documentation endpoints
    │   │   │   ├── crawler.routes.ts # Naver Map crawler endpoints
    │   │   │   └── restaurant.routes.ts # Restaurant data management endpoints
    │   │   ├── services/       # Business logic
    │   │   │   ├── naver-crawler.service.ts # Puppeteer-based web crawler
    │   │   │   └── restaurant.service.ts    # Restaurant data management (crawler + DB)
    │   │   ├── db/             # Database layer
    │   │   │   ├── database.ts # SQLite connection manager
    │   │   │   ├── migrate.ts  # Migration runner
    │   │   │   ├── migrations/ # SQL migration files
    │   │   │   └── repositories/ # Data access layer
    │   │   │       └── restaurant.repository.ts # Restaurant/menu CRUD operations
    │   │   ├── utils/          # Utility functions
    │   │   └── types/          # TypeScript type definitions
    │   │       ├── crawler.types.ts # Crawler service types
    │   │       └── db.types.ts      # Database entity types
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

### Web Application
```bash
cd apps/web
npm run dev        # Start development server (port 3000)
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Run ESLint

# E2E Testing with Playwright
npm run test:e2e           # Run E2E tests (headless)
npm run test:e2e:ui        # Run E2E tests with UI mode (recommended)
npm run test:e2e:headed    # Run E2E tests in headed mode
npm run test:e2e:debug     # Run E2E tests in debug mode
npm run test:e2e:report    # Show test report
npm run test:e2e:codegen   # Generate test code with Playwright codegen
```

### Mobile Application
```bash
cd apps/mobile
npm start          # Start Metro bundler
npm run android    # Run on Android
npm run ios        # Run on iOS
npm run lint       # Run ESLint
npm test           # Run tests

# Reset Metro cache if needed
npx react-native start --reset-cache

# E2E Testing with Maestro
npm run test:e2e         # Run all E2E tests
npm run test:e2e:smoke   # Run smoke test
npm run test:e2e:login   # Run login flow test
npm run test:e2e:studio  # Open Maestro Studio (interactive mode)
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

### Web Application
- **React 19.1.1** with React Native Web 0.21.1
- **Vite 7.1.7** build tool with HMR
- **TypeScript 5.8.3** for type safety
- **React Router DOM 7.9.3** for routing
- **PWA support** with vite-plugin-pwa
- **Playwright** for E2E testing (Chromium, Mobile Chrome, Mobile Safari)
- **Shared components** from apps/shared

### Mobile Application
- **React Native 0.81.4** framework
- **React 19.1.0** core library
- **TypeScript 5.8.3** for type safety
- **Metro** bundler for JavaScript bundling
- **React Native Safe Area Context** for device-safe layouts
- **Maestro** for E2E testing (Android & iOS)
- **Shared components** from apps/shared

### Shared Module Architecture
- **Barrel Export Pattern** for clean imports
- **Cross-platform components** (Button, InputField)
- **Shared hooks** (useLogin, useAuth) for business logic with API integration
- **Shared contexts** (ThemeContext) for global state management
- **API Service layer** for backend communication with platform-specific URL handling
- **Centralized constants** (APP_INFO_CONSTANTS, AUTH_CONSTANTS, THEME_COLORS) with domain separation
- **Cross-platform utilities**:
  - Alert utility for web and mobile
  - Storage utility (localStorage for web, AsyncStorage for mobile)
  - Theme persistence with auto-restore
- **AsyncStorage 2.2.0** for persistent mobile storage
- **React Native** base for maximum compatibility
- **TypeScript** for type definitions
- **Clean separation** of concerns (components/hooks/contexts/constants/services/types/utils)

### Friendly Server (Node.js Backend)
- **Fastify 5.6.0** high-performance web framework
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
- **Puppeteer 24.23.0** for web crawling and automation

### Smart Server (Python ML/AI Backend)
- **Python 3.10+** with type hints
- **FastAPI 0.115+** async web framework
- **Uvicorn** ASGI server with hot reload
- **Pydantic v2** for data validation and settings management
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
- Generates documentation for specific routes (auth, health, api, crawler)
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
- **Tag-based Organization**: Endpoints organized by functional areas (auth, health, api, users, crawler)
- **Response Standardization**: Consistent error/success response format across all endpoints
- **Schema Validation**: Request/response validation with detailed error messages

## Configuration System

### YAML-based Configuration
- Configuration files stored in root `config/` directory
- `base.yml`: Default configuration for development
- `test.yml`: Test environment overrides (port: 0, error logging, wildcard CORS)
- `production.yml`: Production overrides (merged with base)
- Server loads environment-specific config automatically based on NODE_ENV

### Environment Variables
Environment variables override YAML configuration:
- `NODE_ENV`: development | test | production
- `PORT`: Server port number
- `HOST`: Server host address (0.0.0.0 for network access)
- `LOG_LEVEL`: debug | info | warn | error
- `CORS_ORIGIN`: Allowed CORS origins
- `LOCAL_IP`: Local network IP for mobile device access (optional)

### Port Configuration
- Web app: 3000
- Friendly server: 4000 (0 for tests - random port)
- Smart server: 5000
- `strictPort: true` ensures exact port usage

### Network Access
- **Default**: `HOST=0.0.0.0` allows access from any network interface
- **Local IP Detection**: Server automatically detects and displays local network IP
- **Mobile Access**:
  - Android emulator: Uses `10.0.2.2:4000` to access host machine
  - iOS simulator: Uses `localhost:4000`
  - Physical devices: Use local network IP (e.g., `192.168.0.100:4000`)

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

-- restaurants table (Naver Map crawler data)
id INTEGER PRIMARY KEY AUTOINCREMENT
place_id TEXT UNIQUE NOT NULL  -- Naver Place ID
name TEXT NOT NULL
place_name TEXT
category TEXT
phone TEXT
address TEXT
description TEXT
business_hours TEXT
lat REAL  -- Latitude
lng REAL  -- Longitude
url TEXT NOT NULL
crawled_at DATETIME NOT NULL
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP

-- menus table (Restaurant menu items)
id INTEGER PRIMARY KEY AUTOINCREMENT
restaurant_id INTEGER NOT NULL
name TEXT NOT NULL
description TEXT
price TEXT NOT NULL
image TEXT
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
```

### Migration System
- **Auto-execution**: Migrations run automatically on server startup
- **Version Tracking**: Migration history stored in migrations table
- **Reset Command**: `npm run db:reset` for development database reset
- **File-based**: SQL migration files with sequential naming (001_create_users.sql)

## Authentication System

### Backend Implementation
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

### Frontend Authentication State
- **useAuth Hook** (`apps/shared/hooks/useAuth.ts`):
  - 로그인 상태 관리 (user, isAuthenticated, isLoading)
  - 초기 로드 시 storage에서 자동 복원
  - login/logout/checkAuth 함수 제공
  - 웹과 모바일에서 공통 사용

- **useLogin Hook** (`apps/shared/hooks/useLogin.ts`):
  - 로그인 폼 로직 (email, password, isLoading)
  - API 호출 및 에러 처리
  - 성공 시 storage에 자동 저장
  - 콜백 지원 (onSuccess)

### Storage & Session Management
- **Cross-platform Storage** (`apps/shared/utils/storage.utils.ts`):
  - Web: localStorage
  - Mobile: AsyncStorage
  - 통일된 async API (setItem, getItem, removeItem, setObject, getObject)
  - 인증 전용 메서드 (setUserInfo, getUserInfo, setAuthToken, getAuthToken, logout)
  - Storage Keys: `auth_token`, `user_info`, `last_login`

- **Session Persistence**:
  - 로그인 시 사용자 정보 storage에 저장
  - 앱/페이지 재시작 시 자동 복원
  - 로그아웃 시 모든 인증 데이터 삭제

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
- Storage utility already supports token storage/retrieval

## Naver Map Crawler Service

### Overview
Puppeteer-based web crawler for extracting restaurant information from Naver Map/Place URLs with automatic database persistence.

### Architecture
- **Crawler Service**: `servers/friendly/src/services/naver-crawler.service.ts` - Raw web scraping logic
- **Restaurant Service**: `servers/friendly/src/services/restaurant.service.ts` - Integrates crawling with DB storage
- **Repository**: `servers/friendly/src/db/repositories/restaurant.repository.ts` - Data access layer
- **Routes**: `servers/friendly/src/routes/crawler.routes.ts` - API endpoints
- **Types**:
  - `servers/friendly/src/types/crawler.types.ts` - Crawler response types
  - `servers/friendly/src/types/db.types.ts` - Database entity types

### Key Features
- **URL Support**: Handles multiple Naver URL formats
  - `https://map.naver.com/p/entry/place/{id}`
  - `https://m.place.naver.com/restaurant/{id}`
  - `https://naver.me/{shortUrl}` (automatic redirect handling)
- **Data Extraction**:
  - Restaurant basic info (name, category, phone, address, coordinates)
  - Menu items with descriptions and prices (auto-expands "more" buttons)
  - Reviews with keywords, ratings, and visit info (auto-expands review list)
- **Performance Optimization**:
  - Blocks images/CSS/fonts for faster loading
  - Creates new browser instance per crawl for stability
  - Timing logs for performance monitoring

### API Endpoints
```bash
# Single restaurant crawl
POST /api/crawler/restaurant
{
  "url": "https://map.naver.com/p/entry/place/1234567890",
  "crawlMenus": true  # optional, default: true
}

# Bulk crawl (max 5 URLs)
POST /api/crawler/bulk
{
  "urls": ["url1", "url2", ...]
}

# Review crawl
POST /api/crawler/reviews
{
  "url": "https://m.place.naver.com/restaurant/{id}/review/visitor?reviewSort=recent"
}

# Cleanup (deprecated - auto cleanup per crawl)
POST /api/crawler/cleanup
```

### Database Storage Implementation
- **UPSERT Pattern**: Restaurant data is upserted based on `place_id` (no duplicates)
- **Menu Replacement**: Menus are deleted and re-inserted on each crawl for freshness
- **Service Layer Architecture**:
  - `RestaurantService.crawlAndSaveRestaurant()` - Single restaurant crawl + save
  - `RestaurantService.crawlAndSaveMultiple()` - Bulk crawl + save (sequential)
- **Repository Pattern**:
  - `upsertRestaurant()` - Insert or update restaurant by place_id
  - `saveMenus()` - Replace all menus for a restaurant
  - `findByPlaceId()`, `findMenusByRestaurantId()` - Query methods
- **Response Fields**:
  - `savedToDb: boolean` - Indicates if data was persisted
  - `restaurantId: number` - Database ID of saved restaurant

### Important Implementation Notes
- **Browser Management**: Each crawl creates and destroys its own browser instance
- **Dynamic Loading**: Waits for elements to load text content (phone/address)
- **URL Normalization**: Automatically converts all URLs to mobile format for consistent scraping
- **Error Handling**: Graceful degradation when optional elements are missing
- **TypeScript DOM Types**: Uses `lib: ["ES2022", "DOM"]` in tsconfig.json for page.evaluate() contexts
- **Data Conversion**: Crawler types automatically converted to DB input types via service layer

### Response Helper Usage
All endpoints use `ResponseHelper` utilities:
```typescript
// Success
ResponseHelper.success(reply, data, message)

// Errors
ResponseHelper.validationError(reply, message)
ResponseHelper.error(reply, message, statusCode)
```

## Restaurant Data Management API

### Overview
Restaurant API provides access to crawled restaurant data with category aggregation and pagination support.

### Endpoints
- **GET /api/restaurants/categories** - Get restaurant count grouped by category
  - Returns categories sorted by count (descending) then name (ascending)
  - NULL categories appear as "Unknown"

- **GET /api/restaurants** - List restaurants with pagination
  - Query params: `limit` (default: 20), `offset` (default: 0)
  - Returns total count and paginated results

- **GET /api/restaurants/:id** - Get restaurant details with menus
  - Returns restaurant info and associated menu items
  - 404 if restaurant not found

### Type System
- **MenuInput**: Menu data without restaurant_id (used in saveMenus method)
- **MenuInsert**: Extends MenuInput with restaurant_id (used for DB insertion)
- This separation allows `restaurantRepository.saveMenus(restaurantId, menus)` to accept menus without explicit restaurant_id

### Integration Tests
All restaurant routes have comprehensive integration tests in `src/__tests__/integration/restaurant.routes.test.ts`:
- Category aggregation (including NULL handling)
- Pagination (limit, offset, default values)
- Restaurant details with menus
- Response format validation
- Tests account for existing production data using `>=` comparisons

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

## Development Workflow

### Process Management
- **Kill Script**: `scripts/kill.js` automatically reads port from `config/base.yml`
  - Reads `server.friendly.port` configuration (default: 4000)
  - Cross-platform support (Windows/Mac/Linux)
  - Handles multiple processes on the same port
- `npm run kill`: Terminates server process on configured port
- `npm run dev:clean`: Kills existing server then starts fresh

### Maestro Installation (Mobile E2E Testing)
Maestro는 별도 설치가 필요합니다:

```bash
# macOS/Linux
curl -Ls "https://get.maestro.mobile.dev" | bash

# Windows (WSL2 필요)
# WSL2에서 위 명령어 실행
```

설치 확인:
```bash
maestro --version
```

## Testing Strategy

### Test Organization
- **Web E2E Tests** (`apps/web/e2e/`):
  - Playwright E2E tests for user flows
  - Login flow test: Alert handling, navigation verification
  - Test browsers: Chromium, Mobile Chrome, Mobile Safari
  - Important: React Native Web buttons render as `<div>`, use `getByText()` instead of `getByRole('button')`

- **Mobile E2E Tests** (`apps/mobile/.maestro/`):
  - Maestro E2E tests for React Native apps
  - YAML-based test flows
  - Tests: Smoke test, Login flow
  - Supports Android & iOS platforms
  - Test account: niney@ks.com / tester (defined in config.yaml)

- **Friendly Server Tests**:
  - Unit tests: `src/__tests__/unit/`
  - Integration tests: `src/__tests__/integration/`
  - Auth routes test: Comprehensive test suite for authentication endpoints
    - Registration validation and error handling
    - Login with case-insensitive email support
    - User listing and management
    - Performance and concurrent request handling
  - Crawler routes test: Integration tests for Naver Map crawler with DB persistence
    - URL validation (missing URL, invalid domain)
    - Crawling + DB save integration
    - Database persistence verification (restaurants, menus)
    - Uses mocked crawler service for consistent test data
  - Restaurant routes test: Integration tests for restaurant data management
    - Category aggregation with NULL handling
    - Pagination (limit, offset, defaults)
    - Restaurant details with menus
    - 404 handling for non-existent restaurants
    - Tests use `>=` comparisons to account for production data

### Testing Approach
- **E2E Tests**: User flows, integration testing
  - Web: Playwright with auto-starting dev server
  - Mobile: Maestro with YAML-based flows
- **Unit/Integration Tests**: Business logic, utilities, services
  - Friendly Server: Vitest with 80% coverage threshold
  - Smart Server: pytest with async support

### Test Running Examples

#### Run a single test file
```bash
# Playwright E2E (Web)
cd apps/web
npm run test:e2e -- login.spec.ts           # Run specific test file
npm run test:e2e:ui                         # Interactive UI mode
npm run test:e2e:headed -- login.spec.ts    # Watch test execution

# Maestro E2E (Mobile)
cd apps/mobile
npm run test:e2e:smoke                      # Run smoke test
npm run test:e2e:login                      # Run login flow test
maestro test .maestro/login.yaml            # Run specific test directly

# Vitest (Friendly Server)
npm test -- src/__tests__/unit/userService.test.ts
npm test -- src/__tests__/integration/auth.routes.test.ts

# Run specific test suite
npm run test:auth  # Auth routes tests only

# pytest (Smart Server)
pytest tests/unit/test_config.py
```

#### Debug tests
```bash
# Playwright E2E (Web)
cd apps/web && npm run test:e2e:debug

# Maestro Studio (Mobile - Interactive)
cd apps/mobile && npm run test:e2e:studio

# Vitest UI
cd servers/friendly && npm run test:ui
```

## Current Implementation Status

## Web and Mobile Configuration

### Web App (Vite)
- **Config Loading**: Reads from `config/base.yml`
- **React Native Web Alias**: Maps `react-native` to `react-native-web`
- **Shared Components**: Alias `@shared` points to `apps/shared`
- **PWA Manifest**: Auto-generated from config
- **Extensions Resolution**: Prioritizes `.web.tsx` files

### Mobile App (Metro)
- **Shared Components**: Configured via `extraNodeModules`
- **Watch Folders**: Includes `apps/shared` directory
- **Block List**: Excludes shared/node_modules
- **Module Resolution**: Maps 'shared' to '../shared'

### Shared Module Import Pattern (Barrel Exports)

The shared module uses the Barrel Export Pattern for clean, organized imports:

```typescript
// Web app imports (using @shared alias from vite.config.ts)
import { Button, InputField } from '@shared/components'
import { useLogin, useAuth } from '@shared/hooks'
import { APP_INFO_CONSTANTS, AUTH_CONSTANTS } from '@shared/constants'
import { Alert, storage, STORAGE_KEYS } from '@shared/utils'
import { apiService } from '@shared/services'

// Mobile app imports (using 'shared' from metro.config.js)
import { Button, InputField } from 'shared/components'
import { useLogin, useAuth } from 'shared/hooks'
import { APP_INFO_CONSTANTS, AUTH_CONSTANTS } from 'shared/constants'
import { Alert, storage, STORAGE_KEYS } from 'shared/utils'
import { apiService } from 'shared/services'

// Each folder has its own index.ts barrel export
// This maintains clean separation of concerns

// Alert utility usage (cross-platform)
Alert.show('Title', 'Message')
Alert.error('Error', 'Something went wrong')
Alert.success('Success', 'Operation completed')
Alert.confirm('Confirm', 'Are you sure?', onConfirm, onCancel)

// Storage utility usage (cross-platform)
await storage.setItem('key', 'value')
const value = await storage.getItem('key')
await storage.setUserInfo(user)
const user = await storage.getUserInfo()
await storage.logout()

// API Service usage
await apiService.login({ email, password })
await apiService.register({ email, username, password })

// Authentication hooks usage
const { isAuthenticated, isLoading, user, login, logout } = useAuth()
const { email, password, handleLogin } = useLogin()
```

**Important**: Do NOT import non-components from the components folder. Each module type has its own dedicated folder and barrel export.

## Current Implementation Status

### ✅ Completed
**Backend:**
- Fastify-based backend service with comprehensive API documentation
- SQLite database integration with automated migrations
- Complete authentication system (registration, login, user management)
- OpenAPI 3.0 specification with multiple documentation formats
- Standardized API response format with TypeScript validation
- Multiple API documentation interfaces (Swagger UI, Scalar, AI-friendly)
- Route-specific documentation generation (auth, health, api, crawler)
- Naver Map crawler service with Puppeteer (restaurant info, menus, reviews)
- **Database persistence for crawler data:**
  - Restaurants and menus tables with UPSERT pattern
  - RestaurantService integrating crawling + DB storage
  - RestaurantRepository with data access layer
  - Integration tests verifying DB persistence
- **Restaurant Data Management API:**
  - Category aggregation endpoint (GROUP BY with NULL handling)
  - Paginated restaurant listing
  - Restaurant detail view with menus
  - Integration tests for all endpoints
- Vitest + Supertest testing for backend
- Python "smart" backend service with FastAPI
- pytest testing environment for smart server
- YAML-based configuration system
- Network access support (0.0.0.0 binding, local IP detection)

**Frontend:**
- Web application with React Native Web and React Router
- Mobile application with React Native
- Shared component system using Barrel Export Pattern
- Unified login UI across platforms with shared hooks and constants
- API integration with backend authentication
- Cross-platform utilities (Alert, Storage)
- **Theme System:**
  - ThemeContext with useTheme hook
  - Light/Dark mode support
  - Theme persistence in storage (app_theme key)
  - Auto-restore on app startup
  - Theme colors: THEME_COLORS constant with light/dark palettes
- **UI Components (Web):**
  - Header: Hamburger menu, theme toggle (🌙/☀️), profile dropdown
  - Drawer: Slide-out sidebar with user info and navigation
  - Restaurant: Category cards, crawling interface, review display
    - **Desktop/Mobile Layout Separation**: 완전히 분리된 조건부 렌더링
    - **Desktop**: 왼쪽 390px 고정(레스토랑 목록) + 오른쪽 flex(리뷰 패널)
    - **Mobile**: 전체 화면 토글 (목록 ↔ 리뷰)
    - **URL-based Navigation**: `/restaurant/:placeId` 라우팅, 브라우저 뒤로가기 지원
    - **Review API Integration**: Place ID 기반 리뷰 조회, Socket.io 실시간 크롤링
  - Responsive layout with theme-aware styling
  - Theme colors: `background`, `surface`, `primary`, `text`, `textSecondary`, `border` (no `card` - use `surface`)
  - Light mode: 레스토랑/리뷰 카드 배경 `#ffffff`
- **Authentication state management:**
  - useAuth hook for global auth state
  - useLogin hook for login logic
  - Cross-platform storage (localStorage/AsyncStorage)
  - Session persistence (로그인 유지)
  - Auto-restore on app restart
- **Routing & Navigation:**
  - Web: React Router with protected routes
  - Mobile: Conditional rendering based on auth state
  - Loading states during auth check
- **Testing:**
  - Playwright E2E tests for web application
  - Maestro E2E tests for mobile application
  - Login flow with alert handling (both platforms)
- Clean module separation (components/hooks/contexts/constants/services/types/utils)

### 🔲 In Progress
- JWT token authentication implementation
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
curl http://localhost:4000/api/docs/generate/crawler

# Naver Map crawler endpoints
curl -X POST http://localhost:4000/api/crawler/restaurant \
  -H "Content-Type: application/json" \
  -d '{"url":"https://map.naver.com/p/entry/place/1234567890","crawlMenus":true}'

curl -X POST http://localhost:4000/api/crawler/reviews \
  -H "Content-Type: application/json" \
  -d '{"url":"https://m.place.naver.com/restaurant/1234567890/review/visitor?reviewSort=recent"}'
```

### Database Operations
```bash
# Reset database (delete and recreate)
cd servers/friendly && npm run db:reset

# View database (requires SQLite CLI)
sqlite3 servers/friendly/data/niney.db ".tables"
sqlite3 servers/friendly/data/niney.db "SELECT * FROM users;"
sqlite3 servers/friendly/data/niney.db "SELECT * FROM restaurants;"
sqlite3 servers/friendly/data/niney.db "SELECT * FROM menus WHERE restaurant_id = 1;"

# Check restaurant count
sqlite3 servers/friendly/data/niney.db "SELECT COUNT(*) FROM restaurants;"

# View restaurant with menus (JOIN query)
sqlite3 servers/friendly/data/niney.db "
SELECT r.name, r.category, r.phone, m.name as menu_name, m.price
FROM restaurants r
LEFT JOIN menus m ON r.id = m.restaurant_id
WHERE r.place_id = 'test20848484';"
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

## React Native Web 제약사항 및 해결 패턴

### StyleSheet 제약사항
- **Media queries 불가**: `@media` 쿼리는 StyleSheet.create()에서 동작하지 않음
  - 해결: `window.innerWidth` + resize 이벤트 리스너로 isMobile state 관리
- **고정 width 문제**: StyleSheet의 숫자 width가 제대로 적용되지 않는 경우
  - 해결: 인라인 스타일 사용 `style={{ width: 390, minWidth: 390, maxWidth: 390 }}`
- **position absolute/fixed**: React Native Web에서 제한적
  - 해결: HTML div 요소 사용 (모바일 전체 화면 패널)

### 반응형 레이아웃 패턴
```typescript
// 조건부 렌더링으로 데스크탑/모바일 완전 분리
{isMobile ? (
  <MobileLayout />
) : (
  <DesktopLayout />
)}

// 인라인 스타일로 고정 너비 적용
<ScrollView style={[styles.panel, { width: 390, minWidth: 390, maxWidth: 390 }]} />
```

## Code Style and Quality

### ESLint Configuration
- Friendly server uses traditional `.eslintrc` format
- TypeScript-specific rules enabled
- Run `npm run lint:fix` to auto-fix issues

### Commit Message Convention
**IMPORTANT: 커밋 메시지는 반드시 한글로 작성**

Prefix commits with the affected scope:
- `[web]` - Web application changes
- `[mobile]` - Mobile application changes
- `[shared]` - Shared components/utilities changes
- `[friendly]` - Node.js backend changes
- `[smart]` - Python backend changes
- `[config]` - Configuration file changes

Examples:
```
[web] 데스크탑/모바일 레이아웃 분리 및 리뷰 기능 추가
[mobile] 공유 폴더 사용을 위한 Metro 설정 업데이트
[shared] 크로스 플랫폼 Button 컴포넌트 생성
[friendly] Place ID 기반 리뷰 조회 API 추가
[smart] 개발 환경을 위한 FastAPI 설정 수정
[config] JWT를 위한 환경 변수 추가
```

## Performance Considerations

### Fastify Optimizations
- Automatic schema validation with TypeBox
- Built-in serialization optimization
- Structured logging with pino for minimal overhead
- Connection pooling prepared for future database scaling

### Build Optimization
- Conditional minification based on environment
- Tree-shaking enabled for production builds