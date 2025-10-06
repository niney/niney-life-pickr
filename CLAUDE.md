# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

-- crawl_jobs table (Background job tracking)
id TEXT PRIMARY KEY  -- UUID
place_id TEXT NOT NULL
url TEXT NOT NULL
restaurant_id INTEGER
status TEXT NOT NULL  -- pending, active, completed, failed, cancelled
current INTEGER DEFAULT 0
total INTEGER DEFAULT 0
percentage INTEGER DEFAULT 0
total_reviews INTEGER
saved_to_db INTEGER
error_message TEXT
started_at DATETIME
completed_at DATETIME
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

- **Socket.io Real-time Review Crawling System:**
  - Place-based room subscription for multi-user collaboration
  - Real-time progress updates during crawling and DB saving
  - Background job processing with job manager
  - Review hash-based duplicate prevention
  - Automatic review list refresh on completion
  - Integration tests for crawl jobs and review storage

### 🔲 In Progress
- JWT token authentication implementation
- Backend business logic implementation
- ML model integration in smart server
- Production database (PostgreSQL)

## Socket.io Real-time Review Crawling System

### Overview
Real-time system for collaborative review crawling with Socket.io, allowing multiple users to see live progress when crawling the same restaurant.

### Architecture Components
- **Socket Server**: `servers/friendly/src/socket/socket.ts` - Socket.io initialization and room management
- **Event Constants**: `servers/friendly/src/socket/events.ts` - Socket event type definitions
- **Job Manager**: `servers/friendly/src/services/job-manager.service.ts` - In-memory job state management
- **Crawler Processor**: `servers/friendly/src/services/review-crawler-processor.service.ts` - Background crawling with real-time updates
- **Job Repository**: `servers/friendly/src/db/repositories/crawl-job.repository.ts` - Database persistence
- **Review Repository**: `servers/friendly/src/db/repositories/review.repository.ts` - Review storage with hash-based deduplication

### Socket.io Room Strategy
**Place-based Rooms** (`place:${placeId}`):
- All users viewing the same restaurant subscribe to the same place room
- When ANY user starts crawling, ALL subscribers receive real-time updates
- Enables multi-user collaboration and prevents duplicate crawling
- Auto-subscription when selecting a restaurant, auto-unsubscription when leaving

```typescript
// Server: Place room subscription
socket.on('subscribe:place', (placeId: string) => {
  socket.join(`place:${placeId}`)
})

// Client: Auto-subscribe on restaurant selection
useEffect(() => {
  if (selectedPlaceId) {
    socketRef.current.emit('subscribe:place', selectedPlaceId)
    return () => socketRef.current?.emit('unsubscribe:place', selectedPlaceId)
  }
}, [selectedPlaceId])
```

### Real-time Event Flow
1. **REVIEW_STARTED** - Crawling begins, sent to place room
2. **REVIEW_PROGRESS** - Progress updates (every 10 reviews or at completion)
   - Includes: `placeId`, `current`, `total`, `percentage`
3. **REVIEW_ITEM** - Individual review data (every 5 reviews or at completion)
   - Includes: `placeId`, `review`, `index`
4. **REVIEW_COMPLETED** - Crawling finished successfully
   - Includes: `placeId`, `totalReviews`, `savedToDb`
5. **REVIEW_ERROR** - Error occurred during crawling
   - Includes: `placeId`, `error`
6. **REVIEW_CANCELLED** - User cancelled the job

### Background Job Processing
- Jobs tracked in `crawl_jobs` table with UUID
- In-memory job manager for quick state access
- Callback-based progress tracking during crawling
- DB persistence at every review save for durability
- Support for job cancellation (though not yet exposed in UI)

### Review Deduplication System
Review hash generated from:
```typescript
generateReviewHash(placeId, userName, visitDate, visitCount, verificationMethod)
```
- Prevents duplicate reviews from multiple crawls
- Uses MD5 hash of combined fields
- UNIQUE constraint on `review_hash` column
- UPSERT pattern for safe re-crawling

### Client Integration Pattern
```typescript
// Frontend automatically handles:
1. Subscribe to place room on restaurant selection
2. Listen for progress/item/completed/error events
3. Update UI with real-time crawling status
4. Refresh review list on completion
5. Unsubscribe when leaving restaurant view
```

### Key Implementation Details
- **Batch Updates**: Progress emitted every 10 reviews to reduce socket traffic
- **Review Items**: Sent every 5 reviews for smoother UI updates
- **Error Resilience**: Failed DB saves logged but don't stop crawling
- **Multi-user Sync**: All users see identical progress regardless of who started crawling

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

### iOS Safari 주소창 자동 최소화 패턴
iOS Safari에서 스크롤 시 주소창이 자동으로 최소화되도록 하는 레이아웃 구조:

**글로벌 CSS** (`apps/web/src/index.css`):
```css
/* body에 고정 높이 없음 - 콘텐츠에 따라 늘어남 */
html, body {
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;  /* iOS 스크롤 최적화 */
}

#root {
  min-height: 100vh;  /* 최소 높이만 지정 */
  display: flex;
  flex-direction: column;
}

/* 공통 레이아웃 클래스 */
.page-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.content-scroll {
  flex: 1;
  padding: 16px;
  overflow: auto;
}

.flex-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}
```

**컴포넌트 패턴**:
```typescript
// 페이지 컨테이너
<div className="page-container" style={{ backgroundColor: colors.background }}>
  <Header />
  <div className="content-scroll">
    {/* 스크롤 가능한 콘텐츠 */}
  </div>
</div>

// 중첩 플렉스 레이아웃
<div className="flex-container">
  <View style={styles.header}>...</View>
  <div className="content-scroll">
    {/* 스크롤 가능한 콘텐츠 */}
  </div>
</div>
```

**핵심 원칙**:
1. ❌ `height: 100%` 또는 `height: 100vh` 사용 금지 (고정 높이)
2. ✅ `min-height: 100vh` 사용 (최소 높이, 콘텐츠에 따라 늘어남)
3. ✅ Body 레벨 스크롤 발생 (내부 ScrollView 대신 일반 div)
4. ✅ CSS 클래스 기반 레이아웃 (인라인 스타일 최소화)

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