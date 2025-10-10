# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working wi    │   │   ├── db/             # Database layer
    │   │   │   ├── database.ts # SQLite connection manager
    │   │   │   ├── migrate.ts  # Migration runner
    │   │   │   ├── migrations/ # SQL migration files
    │   │   │   └── repositories/ # Data access layer
    │   │   │       ├── restaurant.repository.ts # Restaurant/menu CRUD operations
    │   │   │       ├── review.repository.ts     # Review storage with deduplication
    │   │   │       ├── job.repository.ts        # Job state persistence (DB)
    │   │   │       └── review-summary.repository.ts # Review summary storage
    │   │   ├── socket/         # Socket.io real-time communication
    │   │   │   ├── socket.ts   # Socket.io server initialization
    │   │   │   └── events.ts   # Socket event constants + JobEventData types + getSocketEvent()
    │   │   ├── utils/          # Utility functions
    │   │   └── types/          # TypeScript type definitions
    │   │       ├── crawler.types.ts # Crawler service types
    │   │       └── db.types.ts      # Database entity types (JobType, JobProgress, etc.) this repository.

> **Note**: For general usage instructions, setup guides, and testing examples, see [README.md](./README.md).

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
    │   │   │   ├── restaurant.routes.ts # Restaurant data management endpoints
    │   │   │   ├── job.routes.ts    # Job status management endpoints
    │   │   │   └── review-summary.routes.ts # Review summary processing endpoints
    │   │   ├── services/       # Business logic
    │   │   │   ├── naver-crawler.service.ts # Puppeteer-based web crawler
    │   │   │   ├── restaurant.service.ts    # Restaurant data management (crawler + DB)
    │   │   │   ├── job-socket.service.ts    # Unified Job + Socket management
    │   │   │   ├── job-manager.service.ts   # In-memory job state with AbortController
    │   │   │   ├── review-crawler-processor.service.ts  # Review crawling with JobService
    │   │   │   ├── review-summary-processor.service.ts  # Review summarization with JobService
    │   │   │   └── review-summary.service.ts # AI-based review summarization (local/cloud)
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

> **Note**: For detailed command usage, see [README.md - Development Commands](./README.md#개발-서버-실행).

**Quick Reference:**
- Web dev server: `cd apps/web && npm run dev` (port 3000)
- Friendly server: `cd servers/friendly && npm run dev` (port 4000)
- Smart server: `cd servers/smart && python scripts/dev.py` (port 5000)
- Mobile: `cd apps/mobile && npm start` (Metro bundler)

## Technology Stack

> **Note**: For detailed versions and dependencies, see [README.md - Technology Stack](./README.md#기술-스택).

### Core Technologies
- **Frontend**: React 19, React Native Web (Web) / React Native (Mobile), TypeScript 5.8
- **Build Tools**: Vite (Web), Metro (Mobile)
- **Backend**: Fastify 5.6 (Node.js), FastAPI (Python)
- **Database**: SQLite3 with automated migrations
- **Testing**: Playwright (Web), Maestro (Mobile), Vitest (Backend)
- **Crawling**: Puppeteer for Naver Map data extraction
- **Real-time**: Socket.io for collaborative features

## API Documentation System

> **Note**: For API documentation URLs and usage, see [README.md - API Documentation](./README.md#api-문서).

The friendly server provides comprehensive API documentation in multiple formats:
- **Swagger UI**: Interactive testing interface at `/docs`
- **Scalar Reference**: Modern API reference at `/reference`
- **OpenAPI Spec**: JSON specification at `/api/docs/spec`
- **Route-Specific Docs**: Generate docs per route at `/api/docs/generate/:routeName`
- **AI-Friendly Prompt**: AI assistant prompt at `/api/docs/ai-prompt`

### Key Features
- Auto-generated examples with TypeBox schemas
- JWT Bearer token authentication support
- Tag-based organization by functional areas
- Consistent response format with validation

## Configuration System

> **Note**: For environment variables and network access details, see [README.md - Environment Configuration](./README.md#환경-설정).

### YAML Configuration
- Files in `config/` directory: `base.yml`, `test.yml`, `production.yml`
- Environment-specific loading based on `NODE_ENV`
- Environment variables override YAML settings

### Key Settings
- **Ports**: Web (3000), Friendly (4000), Smart (5000)
- **Network**: `HOST=0.0.0.0` for mobile device access
- **Mobile Access**: Android emulator uses `10.0.2.2:4000`, iOS uses `localhost:4000`

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

-- reviews table (Restaurant reviews from Naver)
id INTEGER PRIMARY KEY AUTOINCREMENT
restaurant_id INTEGER NOT NULL
review_hash TEXT UNIQUE NOT NULL  -- Hash for duplicate detection
user_name TEXT
review_text TEXT
visit_keywords TEXT  -- JSON array
emotion_keywords TEXT  -- JSON array
visit_date TEXT
visit_count TEXT
verification_method TEXT
wait_time TEXT
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE

-- jobs table (범용 작업 추적 - 리뷰 크롤링, 리뷰 요약, 레스토랑 크롤링)
id TEXT PRIMARY KEY  -- UUID
type TEXT NOT NULL  -- 'review_crawl', 'review_summary', 'restaurant_crawl'
restaurant_id INTEGER NOT NULL
status TEXT NOT NULL DEFAULT 'pending'  -- 'pending', 'active', 'completed', 'failed', 'cancelled'
progress_current INTEGER DEFAULT 0
progress_total INTEGER DEFAULT 0
progress_percentage INTEGER DEFAULT 0
metadata TEXT  -- JSON string (작업별 커스텀 데이터)
result TEXT  -- JSON string (작업별 결과 데이터)
error_message TEXT
started_at DATETIME
completed_at DATETIME
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
```

### Migration System
- Auto-execution on server startup
- Version tracking in migrations table
- Reset: `npm run db:reset`
- File-based SQL migrations with sequential naming

## Authentication System

### Backend Implementation
- **Registration**: Email/username validation, bcrypt hashing, TypeBox schema validation
- **Login**: Case-insensitive email, last login tracking, standardized response
- **User Management**: User listing with password hash exclusion

### Frontend State Management
- **useAuth Hook**: 로그인 상태 관리, storage 자동 복원, login/logout 함수
- **useLogin Hook**: 로그인 폼 로직, API 호출, 에러 처리

### Storage & Security
- **Cross-platform Storage**: localStorage (Web) / AsyncStorage (Mobile) with unified API
- **Session Persistence**: 자동 복원, 로그아웃 시 데이터 삭제
- **Security**: bcrypt hashing, SQL injection protection, TypeBox validation, Helmet headers
- **Future**: JWT token implementation prepared (session table, Bearer auth ready)

## Naver Map Crawler Service

### Architecture
- **Crawler Service**: Raw web scraping with Puppeteer
- **Restaurant Service**: Crawling + DB storage integration
- **Repository**: Data access layer with UPSERT pattern
- **Routes**: API endpoints (`/api/crawler/*`)

### Key Features
- **URL Support**: Naver Map, Place, short URLs (automatic redirect)
- **Data Extraction**: Restaurant info, menus, reviews with keywords
- **Performance**: Image/CSS blocking, per-crawl browser instance
- **Storage**: UPSERT by `place_id`, menu replacement on re-crawl

### API Endpoints
> **Note**: For curl examples, see [README.md - API Testing](./README.md#naver-map-크롤러).

- `POST /api/crawler/restaurant` - Single crawl (with optional menu crawling)
- `POST /api/crawler/bulk` - Bulk crawl (max 5 URLs)
- `POST /api/crawler/reviews` - Review crawling

### Implementation Notes
- Browser per crawl for stability
- Mobile URL normalization for consistency
- TypeScript DOM types for page.evaluate()
- Graceful error handling for missing elements

## Restaurant Data Management API

### Endpoints
> **Note**: For curl examples, see [README.md - API Testing](./README.md#레스토랑-데이터-조회).

- `GET /api/restaurants/categories` - Category aggregation (NULL as "Unknown")
- `GET /api/restaurants` - Paginated list (limit, offset)
- `GET /api/restaurants/:id` - Detail with menus (404 if not found)

### Type System
- **MenuInput**: Menu data without restaurant_id
- **MenuInsert**: Extends MenuInput with restaurant_id for DB insertion

## API Response Standardization

All endpoints use consistent response format with `ResponseHelper` utilities:
- Success: `{ result: true, message, data, timestamp }`
- Error: `{ result: false, message, statusCode, timestamp }`
- Helpers: success, error, validationError, unauthorized, notFound, paginated, etc.

## TypeScript Configuration

- **Development**: `tsconfig.json` (excludes vitest.config.ts)
- **Production**: `tsconfig.build.json` (excludes test files)
- **Path Aliases**: `@routes`, `@services`, `@utils`, `@types` (Friendly server)

## Development Workflow

- **Kill Script**: `npm run kill` (port from config), `npm run dev:clean` (kill + start)
- **Cross-platform**: Windows/Mac/Linux support

## Testing Strategy

> **Note**: For test commands and examples, see [README.md - Testing](./README.md#테스트).

### Test Organization
- **Web E2E** (`apps/web/e2e/`): Playwright (Chromium, Mobile Chrome/Safari)
  - Important: React Native Web buttons are `<div>`, use `getByText()` not `getByRole('button')`
- **Mobile E2E** (`apps/mobile/.maestro/`): Maestro YAML flows (Android & iOS)
- **Server Tests**: Vitest (Friendly), pytest (Smart)
  - Auth, Crawler, Restaurant routes with comprehensive integration tests
  - 80% coverage threshold (Friendly server)

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
import { 
  Alert, 
  storage, 
  STORAGE_KEYS,
  SOCKET_EVENTS,
  getSocketEvent,
  type JobEventData,
  type ProgressData,
  type ReviewCrawlStatus,
  type SummaryProgress
} from '@shared/utils'
import { apiService } from '@shared/services'

// Mobile app imports (using 'shared' from metro.config.js)
import { Button, InputField } from 'shared/components'
import { useLogin, useAuth } from 'shared/hooks'
import { APP_INFO_CONSTANTS, AUTH_CONSTANTS } from 'shared/constants'
import { 
  Alert, 
  storage, 
  STORAGE_KEYS,
  SOCKET_EVENTS,
  getSocketEvent,
  type JobEventData,
  type ProgressData,
  type ReviewCrawlStatus,
  type SummaryProgress
} from 'shared/utils'
import { apiService } from 'shared/services'

// Socket utility types and functions (shared/utils/socket.utils.ts)
// - SOCKET_EVENTS: All Socket event names (review:started, review_summary:progress, etc.)
// - getSocketEvent(type, status): Auto-mapping function (JobType + JobEventType → event name)
// - JobEventData: Unified event data structure
// - ProgressData: { current, total, percentage }
// - ReviewCrawlStatus: { status: 'idle' | 'active' | 'completed' | 'failed', error? }
// - SummaryProgress: extends ProgressData with { completed, failed }

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
- **Unified Job + Socket Management System:**
  - JobSocketService: Single service for all job types (review_crawl, review_summary, restaurant_crawl)
  - Automatic DB persistence via job.repository.ts
  - Automatic Socket event emission via getSocketEvent()
  - 90% parameter reduction (options objects eliminated)
  - Job lifecycle: start() → progress() → complete()/error()/cancel()
  - Real-time cancellation support for review_crawl (AbortController)
  - Restaurant room-based multi-user collaboration
  - Job status API: GET /api/jobs/:jobId
- **Review Summarization System:**
  - AI-based review summarization (local/cloud)
  - Batch processing with progress tracking
  - JobService integration for DB + Socket
  - Review summary storage and retrieval

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
- **Socket.io Real-time System:**
  - SocketContext with unified state management
  - Restaurant room-based subscriptions
  - Real-time progress updates for crawling and summarization
  - Shared types from shared/utils/socket.utils.ts
  - Auto-subscribe/unsubscribe on restaurant selection
  - Client-side status tracking (reviewCrawlStatus, reviewSummaryStatus)
  - Progress tracking (crawlProgress, dbProgress, summaryProgress)

### 🔲 In Progress
- JWT token authentication implementation
- Backend business logic implementation
- ML model integration in smart server
- Production database (PostgreSQL)

## Socket.io Real-time System with Unified Job Management

### Architecture Overview
**Unified Job + Socket Management** via `JobSocketService`:
- All job types (`review_crawl`, `review_summary`, `restaurant_crawl`) use a single service
- Automatic DB storage + Socket event emission
- Restaurant room-based real-time updates for multi-user collaboration
- Job ID tracking for status queries and cancellation

### Core Components
- **JobSocketService** (`job-socket.service.ts`): Unified Job + Socket management
  - Methods: `start()`, `progress()`, `complete()`, `error()`, `cancel()`
  - Automatic DB persistence via `job.repository.ts`
  - Automatic Socket event emission via `getSocketEvent()`
  - Single source of truth for all job operations
- **JobManager** (`job-manager.service.ts`): In-memory state with AbortController
  - Only for `review_crawl` jobs (real-time cancellation support)
  - Provides `isCancelled()` for interrupt-based cancellation
- **Event Constants** (`socket/events.ts`): Socket event definitions + utilities
  - `SOCKET_EVENTS`: All event names (review_crawl, review_summary)
  - `getSocketEvent(type, status)`: Auto-mapping function (type + status → event name)
  - `JobEventData`: Unified event data structure
- **Processors**:
  - `review-crawler-processor.service.ts`: Review crawling with JobService
  - `review-summary-processor.service.ts`: Review summarization with JobService
- **Client** (`shared/contexts/SocketContext.tsx`): React Context for Socket.io
  - Auto-subscribes to restaurant rooms
  - Manages crawl/summary status with shared types from `shared/utils/socket.utils.ts`

### Unified Job Lifecycle
```typescript
// 1. START - Create job (DB + Socket)
const jobId = await jobService.start({
  type: 'review_crawl', // or 'review_summary', 'restaurant_crawl'
  restaurantId: 123,
  metadata: { placeId, url }
});
// → DB에 저장 + Socket: review:started

// 2. PROGRESS - Update progress (DB + Socket)
await jobService.progress(jobId, current, total, { metadata });
// → DB 업데이트 + Socket: review:crawl_progress

// 3. COMPLETE - Finish job (DB + Socket)
await jobService.complete(jobId, { totalReviews, savedToDb });
// → DB 업데이트 + Socket: review:completed

// 4. ERROR - Handle failure (DB + Socket)
await jobService.error(jobId, errorMessage, { metadata });
// → DB 업데이트 + Socket: review:error

// 5. CANCEL - Cancel job (DB + Socket, review_crawl only)
await jobService.cancel(jobId, { metadata });
// → DB 업데이트 + Socket: review:cancelled
```

### Socket.io Room Strategy
**Restaurant ID-based Rooms** (`restaurant:${restaurantId}`):
- All users viewing the same restaurant subscribe to the same room
- When ANY user starts a job, ALL subscribers receive real-time updates
- Enables multi-user collaboration and prevents duplicate work
- Auto-subscription/unsubscription on restaurant selection/deselection

```typescript
// Server: Room subscription
socket.on('subscribe:restaurant', (restaurantId: string) => {
  socket.join(`restaurant:${restaurantId}`)
})

// Client: Auto-subscribe via SocketContext
useEffect(() => {
  if (restaurantId) {
    joinRestaurantRoom(restaurantId)
    return () => leaveRestaurantRoom(restaurantId)
  }
}, [restaurantId])
```

### Socket Event Types
**Review Crawling Events**:
1. **review:started** - Job started
2. **review:crawl_progress** - Web crawling progress
3. **review:db_progress** - DB saving progress
4. **review:completed** - Job completed
5. **review:error** - Job failed
6. **review:cancelled** - Job cancelled (review_crawl only)

**Review Summary Events**:
1. **review_summary:started** - Summarization started
2. **review_summary:progress** - AI processing progress
3. **review_summary:completed** - Summarization completed
4. **review_summary:error** - Summarization failed

**Unified Event Data Structure** (`JobEventData`):
```typescript
interface JobEventData {
  jobId: string;
  type: JobType; // 'review_crawl' | 'review_summary' | 'restaurant_crawl'
  restaurantId: number;
  status: JobEventType; // 'started' | 'progress' | 'completed' | 'error' | 'cancelled'
  timestamp: number;
  
  // Progress-specific
  current?: number;
  total?: number;
  percentage?: number;
  
  // Error-specific
  error?: string;
  
  // Additional metadata
  [key: string]: any;
}
```

### Job Cancellation System
**Only for `review_crawl`** (long-running, interruptible):
- Memory job created with `AbortController`
- `jobService.isCancelled(jobId)` checks abort signal
- Processor checks cancellation in loops (crawling, DB saving)
- Cancellation signal propagates immediately via memory

```typescript
// In review-crawler-processor.service.ts
for (const review of reviews) {
  if (jobService.isCancelled(jobId)) {
    await jobService.cancel(jobId, { totalReviews: reviews.length });
    return; // Stop crawling immediately
  }
  // Process review...
}
```

### Client Integration (SocketContext)
```typescript
// Shared types from apps/shared/utils/socket.utils.ts
import { 
  SOCKET_EVENTS,
  JobEventData,
  ProgressData,
  ReviewCrawlStatus,
  SummaryProgress,
  ReviewSummaryStatus
} from '../utils'

// SocketContext API
const {
  socket,                  // Socket.io instance
  isConnected,             // Connection status
  reviewCrawlStatus,       // Review crawl state
  crawlProgress,           // Web crawling progress
  dbProgress,              // DB saving progress
  reviewSummaryStatus,     // Summary state
  summaryProgress,         // AI processing progress
  joinRestaurantRoom,      // Join room
  leaveRestaurantRoom,     // Leave room
  setRestaurantCallbacks,  // Set completion/error callbacks
  resetCrawlStatus,        // Reset crawl state
  resetSummaryStatus,      // Reset summary state
} = useSocket()

// Auto-subscribe to restaurant room
useEffect(() => {
  if (restaurantId) {
    joinRestaurantRoom(restaurantId)
    return () => leaveRestaurantRoom(restaurantId)
  }
}, [restaurantId])
```

### Key Implementation Details
- **90% Parameter Reduction**: Options objects completely eliminated
- **Automatic DB Lookup**: `progress()`, `complete()`, `error()`, `cancel()` auto-fetch type/restaurantId from DB
- **Socket Auto-Mapping**: `getSocketEvent(type, status)` automatically selects correct event name
- **Single Source of Truth**: `socket/events.ts` defines all events, types, and mapping logic
- **Type Safety**: Unified `JobEventData` structure with TypeScript validation
- **Multi-user Sync**: All users see identical progress regardless of who started the job

## Common Development Tasks

> **Note**: For API testing examples, database operations, and documentation URLs, see [README.md - API Testing](./README.md#api-테스트-예제) and [README.md - Database Management](./README.md#데이터베이스-관리).

**Quick Reference:**
- Test account: `niney@ks.com` / `tester`
- API docs: http://localhost:4000/docs (Swagger UI)
- API reference: http://localhost:4000/reference (Scalar)
- Database reset: `cd servers/friendly && npm run db:reset`

## React Native Web 제약사항 및 해결 패턴

### StyleSheet 제약사항
- **CSS 문자열 값 불가**: React Native Web의 `StyleSheet.create()`는 CSS 문자열 값(`'100vh'`, `'calc()'` 등)을 지원하지 않음
  - ❌ `StyleSheet.create({ container: { minHeight: '100vh' } })` - TypeScript 에러
  - ✅ 인라인 스타일 사용: `style={{ minHeight: '100vh' }}`
  - ✅ 또는 HTML div 사용: `<div className="page-container">`
- **Media queries 불가**: `@media` 쿼리는 StyleSheet.create()에서 동작하지 않음
  - 해결: `window.innerWidth` + resize 이벤트 리스너로 isMobile state 관리
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

// React Native View는 CSS 문자열 값 불가 - HTML div 사용
<div className="page-container" style={{ backgroundColor: colors.background }}>
  <Header />
  <Content />
</div>
```

### 스크롤 관리 패턴
**중요**: React Native Web 환경에서 스크롤 초기화가 필요한 경우:

**잘못된 방법**:
```typescript
// ❌ 복잡한 레이아웃 (flex, overflow, min-height 등)과 함께 사용하면 작동 불안정
useEffect(() => {
  window.scrollTo(0, 0)
  document.body.scrollTop = 0
  document.documentElement.scrollTop = 0
}, [])
```

**올바른 방법**:
```typescript
// ✅ React Native Web의 ScrollView 사용
import { ScrollView, View, StyleSheet } from 'react-native'

return (
  <View style={{ flex: 1 }}>
    <Header />
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      {/* 콘텐츠 */}
    </ScrollView>
  </View>
)

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
})
```

**핵심 원칙**:
1. ✅ React Native의 `ScrollView` 컴포넌트 사용 (자동 스크롤 초기화)
2. ✅ 최소한의 레이아웃 스타일 (불필요한 flex, overflow, min-height 제거)
3. ❌ CSS 기반 스크롤 컨테이너(`.content-scroll { overflow: auto }`)와 `window.scrollTo()` 혼용 금지
4. ✅ React Router로 경로 변경 시 컴포넌트 재마운트로 자동 스크롤 리셋

## Code Style and Quality

> **Note**: For linting commands, see [README.md - Code Quality](./README.md#코드-품질).

### Commit Message Convention
**IMPORTANT: 커밋 메시지는 반드시 한글로 작성**

Scope prefixes: `[web]`, `[mobile]`, `[shared]`, `[friendly]`, `[smart]`, `[config]`

Examples:
```
[web] 데스크탑/모바일 레이아웃 분리 및 리뷰 기능 추가
[friendly] Place ID 기반 리뷰 조회 API 추가
```

## Performance Considerations

- **Fastify**: TypeBox schema validation, serialization optimization, pino logging
- **Build**: Conditional minification, tree-shaking