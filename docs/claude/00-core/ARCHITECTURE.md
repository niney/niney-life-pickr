# Architecture & Project Overview

> **Last Updated**: 2025-10-26
> **Purpose**: 프로젝트 전체 아키텍처, 기술 스택, 디렉토리 구조 설명

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [프로젝트 구조](#3-프로젝트-구조)
4. [Configuration System](#4-configuration-system)
5. [구현 현황](#5-구현-현황)
6. [관련 문서](#6-관련-문서)

---

## 1. 프로젝트 개요

### 1.1 Niney Life Pickr

**Niney Life Pickr**는 사용자의 생활 결정을 돕는 크로스 플랫폼 애플리케이션입니다.

### 1.2 주요 특징

- **Cross-platform Architecture**
  - Web: React Native Web + Vite
  - Mobile: React Native (iOS & Android)
  - Shared: 공통 코드 모듈 (Barrel Export Pattern)

- **Backend Services**
  - Friendly Server: Node.js Fastify (비즈니스 로직, API, 크롤링)
  - Smart Server: Python FastAPI (ML/AI 기능 - 향후 확장)

- **Real-time Features**
  - Socket.io 기반 실시간 통신
  - Restaurant room-based collaboration
  - 크롤링/요약 진행 상황 실시간 업데이트

- **Data Crawling**
  - Naver Map 크롤링 (Puppeteer)
  - 레스토랑 정보, 메뉴, 리뷰 수집
  - AI 기반 리뷰 요약

### 1.3 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
├─────────────────────┬───────────────────────┬────────────────────┤
│   Web (Port 3000)   │  Mobile (iOS/Android) │   Shared Module    │
│  React Native Web   │    React Native       │  Barrel Exports    │
│       + Vite        │   + Metro Bundler     │  Components/Hooks  │
└──────────┬──────────┴───────────┬───────────┴──────────┬─────────┘
           │                      │                      │
           └──────────────────────┼──────────────────────┘
                                  │
                        HTTP/WebSocket (Socket.io)
                                  │
           ┌──────────────────────┼──────────────────────┐
           │                      │                      │
┌──────────▼──────────┐  ┌────────▼────────┐  ┌─────────▼─────────┐
│ Friendly Server     │  │  Smart Server   │  │   Config Files    │
│  (Port 4000)        │  │  (Port 5000)    │  │    (YAML)         │
│  Node.js + Fastify  │  │ Python + FastAPI│  │  base/test/prod   │
│                     │  │                 │  │                   │
│  ┌───────────────┐  │  │  ┌───────────┐  │  └───────────────────┘
│  │ Socket.io     │  │  │  │ ML Models │  │
│  │ Job Manager   │  │  │  │ (Future)  │  │
│  └───────────────┘  │  │  └───────────┘  │
│                     │  │                 │
│  ┌───────────────┐  │  │                 │
│  │ Puppeteer     │  │  │                 │
│  │ (Crawling)    │  │  │                 │
│  └───────────────┘  │  │                 │
│                     │  │                 │
│  ┌───────────────┐  │  │                 │
│  │ Ollama        │  │  │                 │
│  │ (AI Summary)  │  │  │                 │
│  └───────────────┘  │  │                 │
└──────────┬──────────┘  └─────────────────┘
           │
           │ SQLite3
           │
┌──────────▼──────────┐
│   Database Layer    │
│                     │
│  ┌───────────────┐  │
│  │ users         │  │
│  │ restaurants   │  │
│  │ menus         │  │
│  │ reviews       │  │
│  │ jobs          │  │
│  └───────────────┘  │
│                     │
│  Migrations (Auto)  │
│  Repositories       │
└─────────────────────┘
```

> **IMPORTANT**: 이 아키텍처는 모노레포 구조로 설계되어 있으며, 각 레이어는 독립적으로 개발/배포 가능합니다.

---

## 2. 기술 스택

### 2.1 Frontend

#### Web Application
- **Framework**: React 19
- **UI Library**: React Native Web
- **Language**: TypeScript 5.8
- **Build Tool**: Vite 5.x
- **Routing**: React Router v6
- **State Management**: React Context API (useAuth, useTheme, useSocket)
- **Styling**: React Native StyleSheet + CSS

#### Mobile Application
- **Framework**: React Native
- **Language**: TypeScript 5.8
- **Build Tool**: Metro Bundler
- **Navigation**: React Navigation v6
  - Bottom Tab Navigator
  - Stack Navigator
- **State Management**: React Context API

#### Shared Module
- **Pattern**: Barrel Export Pattern
- **Components**: Cross-platform UI components
- **Hooks**: useAuth, useLogin
- **Contexts**: ThemeContext, SocketContext
- **Services**: API Service
- **Utils**: Alert, Storage, Socket Utils

### 2.2 Backend

#### Friendly Server (Node.js)
- **Framework**: Fastify 5.6
- **Language**: TypeScript 5.8
- **Database**: SQLite3
- **Real-time**: Socket.io
- **Crawling**: Puppeteer
- **Testing**: Vitest + Supertest
- **API Documentation**: OpenAPI 3.0, Swagger UI, Scalar
- **Validation**: TypeBox
- **Security**: Helmet, bcrypt
- **Logging**: pino

#### Smart Server (Python)
- **Framework**: FastAPI
- **Language**: Python 3.x
- **Testing**: pytest
- **Future**: ML/AI models integration

### 2.3 Database

- **Type**: SQLite3
- **Storage**: File-based (`servers/friendly/data/niney.db`)
- **Migrations**: Automated on server startup
- **Tables**: users, sessions, restaurants, menus, reviews, jobs

### 2.4 Testing

#### Web E2E
- **Framework**: Playwright
- **Browsers**: Chromium, Mobile Chrome, Mobile Safari
- **Location**: `apps/web/e2e/`

#### Mobile E2E
- **Framework**: Maestro
- **Platforms**: Android & iOS
- **Format**: YAML flows
- **Location**: `apps/mobile/.maestro/`

#### Backend Tests
- **Framework**: Vitest (Friendly), pytest (Smart)
- **Type**: Integration tests
- **Coverage**: 80% threshold (Friendly server)
- **Location**: `servers/friendly/src/tests/`

### 2.5 Development Tools

- **Package Manager**: npm
- **Version Control**: Git
- **Code Quality**: ESLint, Prettier (implied)
- **Configuration**: YAML-based environment config

---

## 3. 프로젝트 구조

### 3.1 Full Directory Tree

```
niney-life-pickr/
├── config/                     # Shared YAML configuration files
│   ├── base.yml                # Base configuration for all environments
│   ├── test.yml                # Test environment overrides
│   └── production.yml          # Production-specific overrides
│
├── apps/
│   ├── web/                    # Web application (React Native Web)
│   │   ├── src/
│   │   │   ├── components/     # Web-specific components
│   │   │   │   ├── Drawer.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Home.tsx
│   │   │   │   ├── Login.tsx
│   │   │   │   ├── Restaurant.tsx
│   │   │   │   └── Restaurant/  # Restaurant sub-components
│   │   │   ├── hooks/          # Web-specific hooks
│   │   │   ├── types/          # Web-specific types
│   │   │   ├── utils/          # Web-specific utilities
│   │   │   ├── App.tsx         # Main app component
│   │   │   ├── main.tsx        # Entry point
│   │   │   └── index.css       # Global styles
│   │   ├── e2e/                # Playwright E2E tests
│   │   ├── vite.config.ts      # Vite configuration with React Native Web
│   │   ├── tsconfig.json       # TypeScript configuration
│   │   └── package.json
│   │
│   ├── mobile/                 # React Native mobile app
│   │   ├── src/
│   │   │   ├── components/     # Mobile-specific components
│   │   │   │   ├── RecrawlModal.tsx
│   │   │   │   └── TabBarIcons.tsx
│   │   │   ├── config/         # Mobile configuration
│   │   │   ├── hooks/          # Mobile-specific hooks
│   │   │   ├── navigation/     # React Navigation setup
│   │   │   │   ├── BottomTabNavigator.tsx
│   │   │   │   ├── RestaurantStackNavigator.tsx
│   │   │   │   └── types.ts
│   │   │   ├── screens/        # Screen components
│   │   │   │   ├── HomeScreen.tsx
│   │   │   │   ├── LoginScreen.tsx
│   │   │   │   ├── RestaurantDetailScreen.tsx
│   │   │   │   ├── RestaurantListScreen.tsx
│   │   │   │   └── SettingsScreen.tsx
│   │   │   ├── styles/         # Shared styles
│   │   │   ├── types/          # Mobile-specific types
│   │   │   └── utils/          # Mobile-specific utilities
│   │   ├── .maestro/           # Maestro E2E tests
│   │   ├── android/            # Android-specific code
│   │   ├── ios/                # iOS-specific code
│   │   ├── metro.config.js     # Metro bundler configuration
│   │   ├── tsconfig.json       # TypeScript configuration
│   │   └── package.json
│   │
│   └── shared/                 # Shared code between web and mobile
│       ├── components/         # Cross-platform UI components
│       │   ├── Button.tsx
│       │   ├── InputField.tsx
│       │   └── index.ts        # Barrel export
│       ├── config/             # Shared configuration utilities
│       ├── constants/          # Shared constants (domain-separated)
│       │   ├── app.constants.ts
│       │   ├── auth.constants.ts
│       │   └── index.ts        # Barrel export
│       ├── contexts/           # React Contexts
│       │   ├── SocketContext.tsx
│       │   ├── ThemeContext.tsx
│       │   └── index.ts        # Barrel export
│       ├── hooks/              # Shared React hooks
│       │   ├── useAuth.ts
│       │   ├── useLogin.ts
│       │   └── index.ts        # Barrel export
│       ├── services/           # API service layer
│       │   ├── api.service.ts
│       │   └── index.ts        # Barrel export
│       ├── types/              # Shared TypeScript types
│       │   └── index.ts        # Barrel export
│       ├── utils/              # Shared utility functions
│       │   ├── alert.utils.ts
│       │   ├── socket.utils.ts
│       │   ├── storage.utils.ts
│       │   └── index.ts        # Barrel export
│       ├── index.ts            # Main barrel export file
│       ├── tsconfig.json       # TypeScript configuration
│       └── package.json
│
├── servers/
│   ├── friendly/               # Node.js backend service (Fastify)
│   │   ├── src/
│   │   │   ├── app.ts          # Fastify app configuration
│   │   │   ├── server.ts       # Server entry point
│   │   │   ├── routes/         # API route definitions
│   │   │   │   ├── api.routes.ts
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── crawler.routes.ts
│   │   │   │   ├── docs.routes.ts
│   │   │   │   ├── health.routes.ts
│   │   │   │   ├── job.routes.ts
│   │   │   │   ├── menu-statistics.routes.ts
│   │   │   │   ├── restaurant.routes.ts
│   │   │   │   ├── review.routes.ts
│   │   │   │   └── review-summary.routes.ts
│   │   │   ├── services/       # Business logic
│   │   │   │   ├── job-manager.service.ts
│   │   │   │   ├── job-socket.service.ts
│   │   │   │   ├── menu-normalization.service.ts
│   │   │   │   ├── menu-statistics.service.ts
│   │   │   │   ├── naver-crawler.service.ts
│   │   │   │   ├── restaurant.service.ts
│   │   │   │   ├── review-crawler-processor.service.ts
│   │   │   │   ├── review-summary.service.ts
│   │   │   │   ├── review-summary-processor.service.ts
│   │   │   │   ├── userService.ts
│   │   │   │   └── ollama/     # Ollama AI integration
│   │   │   ├── db/             # Database layer
│   │   │   │   ├── database.ts # SQLite connection manager
│   │   │   │   ├── migrate.ts  # Migration runner
│   │   │   │   ├── seed.ts     # Seed data
│   │   │   │   ├── migrations/ # SQL migration files
│   │   │   │   └── repositories/ # Data access layer
│   │   │   │       ├── job.repository.ts
│   │   │   │       ├── restaurant.repository.ts
│   │   │   │       ├── review.repository.ts
│   │   │   │       └── review-summary.repository.ts
│   │   │   ├── socket/         # Socket.io real-time communication
│   │   │   │   ├── socket.ts   # Socket.io server initialization
│   │   │   │   └── events.ts   # Socket event constants + utilities
│   │   │   ├── controllers/    # Request handlers (if needed)
│   │   │   ├── middlewares/    # Express-like middlewares
│   │   │   ├── utils/          # Utility functions
│   │   │   ├── types/          # TypeScript type definitions
│   │   │   │   ├── crawler.types.ts
│   │   │   │   └── db.types.ts
│   │   │   └── tests/          # Vitest integration tests
│   │   │       ├── auth.test.ts
│   │   │       ├── crawler.test.ts
│   │   │       └── restaurant.test.ts
│   │   ├── data/               # SQLite database file location
│   │   │   └── niney.db        # Database file (gitignored)
│   │   ├── dist/               # Compiled JavaScript output
│   │   ├── tsconfig.json       # Development TypeScript config
│   │   ├── tsconfig.build.json # Production build config
│   │   ├── vitest.config.ts    # Vitest configuration
│   │   └── package.json
│   │
│   └── smart/                  # Python ML/AI backend service
│       ├── src/
│       │   ├── api/            # FastAPI endpoints
│       │   ├── core/           # Core functionality
│       │   ├── models/         # ML models (future)
│       │   ├── services/       # Business logic (future)
│       │   ├── app.py          # FastAPI application
│       │   └── main.py         # Entry point
│       ├── tests/
│       │   ├── unit/           # Unit tests
│       │   └── integration/    # Integration tests
│       ├── scripts/            # Development and production scripts
│       │   └── dev.py          # Development server script
│       └── requirements.txt    # Python dependencies
│
├── docs/                       # Documentation
│   └── claude/                 # Claude Code documentation
│       ├── 00-core/            # Core documentation
│       ├── 01-web/             # Web app documentation
│       ├── 02-mobile/          # Mobile app documentation
│       ├── 03-shared/          # Shared module documentation
│       ├── 04-friendly/        # Friendly server documentation
│       └── 05-smart/           # Smart server documentation
│
├── CLAUDE.md                   # Main documentation index
├── TEMP-PLAN.md                # Migration plan (temporary)
├── README.md                   # User-facing documentation
├── CHECKLIST_NEW_FIELD_ADDITION.md  # Field addition checklist
├── .gitignore
└── .editorconfig
```

### 3.2 apps/ - Frontend Applications

#### apps/web/ - Web Application
- **Purpose**: Web browser application
- **Framework**: React Native Web + Vite
- **Entry Point**: `src/main.tsx`
- **Main Component**: `src/App.tsx`
- **Key Features**:
  - React Router for navigation
  - Protected routes
  - Theme system (Light/Dark mode)
  - Responsive layout (Desktop/Mobile)
  - Socket.io client integration

**Related Documentation**:
- [Web Setup](../01-web/WEB-SETUP.md)
- [Web Routing](../01-web/WEB-ROUTING.md)
- [Web Components](../01-web/WEB-RESTAURANT.md)

#### apps/mobile/ - Mobile Application
- **Purpose**: iOS & Android native application
- **Framework**: React Native
- **Navigation**: React Navigation (Bottom Tab + Stack)
- **Key Features**:
  - Native navigation
  - Platform-specific code (android/, ios/)
  - Maestro E2E tests
  - Socket.io client integration

**Related Documentation**:
- [Mobile Setup](../02-mobile/MOBILE-SETUP.md)
- [Mobile Navigation](../02-mobile/MOBILE-NAVIGATION.md)
- [Mobile Screens](../02-mobile/MOBILE-RESTAURANT-DETAIL.md)

#### apps/shared/ - Shared Module
- **Purpose**: Code sharing between Web and Mobile
- **Pattern**: Barrel Export Pattern
- **Import Aliases**:
  - Web: `@shared` (from vite.config.ts)
  - Mobile: `shared` (from metro.config.js)
- **Key Features**:
  - Cross-platform components
  - Shared hooks (useAuth, useLogin)
  - Shared contexts (ThemeContext, SocketContext)
  - Shared utilities (Alert, Storage, Socket)

**Related Documentation**:
- [Shared Overview](../03-shared/SHARED-OVERVIEW.md)
- [Shared Components](../03-shared/SHARED-COMPONENTS.md)
- [Shared Contexts](../03-shared/SHARED-CONTEXTS.md)

### 3.3 servers/ - Backend Services

#### servers/friendly/ - Fastify Backend
- **Purpose**: Main backend API, crawling, real-time features
- **Framework**: Fastify 5.6
- **Database**: SQLite3
- **Real-time**: Socket.io
- **Key Features**:
  - RESTful API endpoints
  - OpenAPI 3.0 documentation
  - Naver Map crawler (Puppeteer)
  - Review summarization (AI)
  - Unified Job + Socket management
  - Automated database migrations

**API Endpoints**:
- `/api/auth/*` - Authentication
- `/api/restaurants/*` - Restaurant data
- `/api/crawler/*` - Crawling operations
- `/api/reviews/*` - Review data
- `/api/review-summary/*` - AI review summaries
- `/api/jobs/*` - Job status
- `/docs` - Swagger UI
- `/reference` - Scalar API reference

**Related Documentation**:
- [Friendly Overview](../04-friendly/FRIENDLY-OVERVIEW.md)
- [Friendly Routes](../04-friendly/FRIENDLY-ROUTES.md)
- [Friendly Job + Socket](../04-friendly/FRIENDLY-JOB-SOCKET.md)

#### servers/smart/ - FastAPI Backend
- **Purpose**: ML/AI features (future expansion)
- **Framework**: FastAPI
- **Status**: Basic structure (minimal implementation)
- **Future**: ML model integration, advanced analytics

**Related Documentation**:
- [Smart Overview](../05-smart/SMART-OVERVIEW.md)

### 3.4 config/ - Configuration

#### Shared YAML Configuration
- **base.yml**: Base configuration for all environments
- **test.yml**: Test environment overrides
- **production.yml**: Production-specific overrides

**Configuration Loading**:
- Environment-based loading (NODE_ENV)
- Environment variable override
- Used by Web and Friendly server

---

## 4. Configuration System

### 4.1 YAML Configuration

#### 4.1.1 Configuration Files

**Location**: `config/` directory

**Files**:
- `base.yml` - Base configuration for all environments
- `base.example.yml` - Example template for new developers
- `test.yml` - Test environment overrides
- `production.yml` - Production environment overrides

**Structure Example** (`config/base.yml`):
```yaml
api:
  url: "http://192.168.0.10:4000"  # Web용
  timeout: 30000
  retries: 3
  mobile:
    android: "http://10.0.2.2:4000"       # Android 에뮬레이터
    ios: "http://192.168.0.10:4000"       # iOS 시뮬레이터/실기기

server:
  web:
    host: "0.0.0.0"
    port: 3000
  friendly:
    host: "0.0.0.0"
    port: 4000
```

#### 4.1.2 Loading Strategy

**Cascade Order**:
1. Load `base.yml` (always)
2. If `NODE_ENV !== 'development'`, merge `{env}.yml` (e.g., `production.yml`)
3. Environment variables override YAML settings

**Deep Merge Behavior**:
- Production values override base values
- Nested objects are merged recursively
- Arrays are replaced (not merged)

#### 4.1.3 Usage by Platform

| Platform | Tool | Config Loading |
|----------|------|----------------|
| **Web** | Vite | `apps/web/vite.config.ts` |
| **Mobile** | Babel | `apps/mobile/babel.config.js` |
| **Friendly** | Fastify | `servers/friendly/src/server.ts` |
| **Smart** | FastAPI | `servers/smart/` (future) |

### 4.2 Platform-Specific Configuration

#### 4.2.1 File Extension Pattern

**Shared Module**: `apps/shared/services/`
```
api.service.ts         # Main API service
api.config.web.ts      # Web-specific (import.meta support)
api.config.ts          # Mobile-specific (YAML-based)
```

**Auto-Selection Mechanism**:

**Web (Vite)**:
- `resolve.extensions: ['.web.ts', '.ts', ...]`
- Prefers `.web.ts` over `.ts`
- Result: Selects `api.config.web.ts`

**Mobile (Metro)**:
- Default platform extensions: `.native.ts`, `.ios.ts`, `.android.ts`
- Ignores `.web.ts` files
- Result: Selects `api.config.ts`

#### 4.2.2 Web Configuration Flow

```
YAML (config/base.yml, production.yml)
  ↓
vite.config.ts (loadConfig function)
  ↓
define: { 'import.meta.env.VITE_API_URL': ... }
  ↓
api.config.web.ts reads import.meta.env.VITE_API_URL
  ↓
Browser runtime
```

**Key Code** (`apps/web/vite.config.ts`):
```typescript
const loadedConfig = loadConfig();  // Loads YAML
const apiConfig = loadedConfig.api || {};

export default defineConfig({
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(apiConfig.url),
  },
});
```

#### 4.2.3 Mobile Configuration Flow

```
YAML (config/base.yml, production.yml)
  ↓
babel.config.js (loadConfig function)
  ↓
process.env.API_MOBILE_ANDROID = ...
process.env.API_MOBILE_IOS = ...
  ↓
babel-plugin-transform-inline-environment-variables
  ↓
api.config.ts (compile-time string replacement)
  ↓
Native app runtime
```

**Key Code** (`apps/mobile/babel.config.js`):
```javascript
const loadedConfig = loadConfig();  // Loads YAML
const apiConfig = loadedConfig.api || {};

// Inject environment variables
process.env.API_MOBILE_ANDROID = apiConfig.mobile?.android;
process.env.API_MOBILE_IOS = apiConfig.mobile?.ios;

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: ['babel-plugin-transform-inline-environment-variables'],
};
```

#### 4.2.4 API URL Configuration by Platform

| Platform | Development (base.yml) | Production (production.yml) |
|----------|------------------------|----------------------------|
| **Web** | `http://{hostname}:4000` (auto-detect) | `https://nlpfriendly.easypcb.co.kr` |
| **Android** | `http://10.0.2.2:4000` | `https://nlpfriendly.easypcb.co.kr` |
| **iOS** | `http://192.168.0.10:4000` | `https://nlpfriendly.easypcb.co.kr` |

**Android Emulator**:
- `10.0.2.2` maps to host machine's `localhost`
- Allows emulator to access backend on host

**iOS Simulator/Device**:
- Must use actual LAN IP address
- Update `config/base.yml` to match your network

### 4.3 Key Settings

#### 4.3.1 Ports
- **Web**: 3000 (default)
- **Friendly**: 4000 (default)
- **Smart**: 5000 (default)

#### 4.3.2 Network Configuration
- **HOST**: `0.0.0.0` (allows mobile device access)
- **CORS**: Enabled for cross-origin requests
- **Timeout**: 30s (dev), 60s (prod)

### 4.4 Environment Variables

#### 4.4.1 Server Environment Variables

```bash
# Server
NODE_ENV=development|test|production
PORT=4000

# Database
DATABASE_PATH=./data/niney.db
```

#### 4.4.2 Build-Time Environment Variables

**Web (Vite)**:
- `VITE_API_URL` - Injected from YAML at build time

**Mobile (Babel)**:
- `API_MOBILE_ANDROID` - Android API URL
- `API_MOBILE_IOS` - iOS API URL
- `NODE_ENV` - Build environment

**TypeScript Support** (`apps/mobile/env.d.ts`):
```typescript
declare namespace NodeJS {
  interface ProcessEnv {
    API_MOBILE_ANDROID?: string;
    API_MOBILE_IOS?: string;
    NODE_ENV?: 'development' | 'production' | 'test';
  }
}
```

### 4.5 Build Scripts

#### Web
```bash
cd apps/web
npm run dev      # Development (base.yml)
npm run build    # Production (production.yml)
```

#### Mobile
```bash
cd apps/mobile
npm run android:dev   # Development (base.yml)
npm run android:prod  # Production (production.yml)
npm run ios:dev       # Development (base.yml)
npm run ios:prod      # Production (production.yml)
```

**See Also**:
- **[MOBILE-SETUP.md](../02-mobile/MOBILE-SETUP.md)**: Detailed build script documentation
- **[SHARED-SERVICES.md](../03-shared/SHARED-SERVICES.md)**: API configuration details

---

## 5. 구현 현황

### 5.1 ✅ 완료된 기능

#### Backend (Friendly Server)
- ✅ Fastify-based backend service
- ✅ Comprehensive API documentation (Swagger UI, Scalar, OpenAPI 3.0)
- ✅ SQLite database integration
- ✅ Automated database migrations
- ✅ Complete authentication system
  - User registration (email/username validation, bcrypt hashing)
  - Login (case-insensitive email, last login tracking)
  - User management
- ✅ Standardized API response format (ResponseHelper)
- ✅ Multiple API documentation interfaces
- ✅ Route-specific documentation generation
- ✅ Naver Map crawler service (Puppeteer)
  - Restaurant info crawling
  - Menu crawling
  - Review crawling with keywords
- ✅ Database persistence for crawler data
  - Restaurants and menus tables (UPSERT pattern)
  - RestaurantService (crawling + DB storage)
  - RestaurantRepository (data access layer)
- ✅ Restaurant Data Management API
  - Category aggregation (GROUP BY with NULL handling)
  - Paginated restaurant listing
  - Restaurant detail view with menus
- ✅ Unified Job + Socket Management System
  - JobSocketService (all job types: review_crawl, review_summary, restaurant_crawl)
  - Automatic DB persistence (job.repository.ts)
  - Automatic Socket event emission (getSocketEvent)
  - 90% parameter reduction
  - Job lifecycle: start → progress → complete/error/cancel
  - Real-time cancellation support (AbortController for review_crawl)
  - Restaurant room-based multi-user collaboration
  - Job status API
- ✅ Review Summarization System
  - AI-based review summarization (local/cloud via Ollama)
  - Batch processing with progress tracking
  - JobService integration for DB + Socket
  - Review summary storage and retrieval
- ✅ Vitest + Supertest testing
- ✅ Python "smart" backend service (FastAPI - basic structure)
- ✅ pytest testing environment
- ✅ YAML-based configuration system
- ✅ Network access support (0.0.0.0 binding, local IP detection)

#### Frontend (Web & Mobile)
- ✅ Web application (React Native Web + React Router)
- ✅ Mobile application (React Native + React Navigation)
- ✅ Shared component system (Barrel Export Pattern)
- ✅ Unified login UI across platforms
- ✅ API integration with backend authentication
- ✅ Cross-platform utilities
  - Alert (cross-platform)
  - Storage (localStorage/AsyncStorage)
- ✅ Theme System
  - ThemeContext with useTheme hook
  - Light/Dark mode support
  - Theme persistence in storage
  - Auto-restore on app startup
  - THEME_COLORS constant
- ✅ UI Components (Web)
  - Header (hamburger menu, theme toggle, profile dropdown)
  - Drawer (slide-out sidebar, user info, navigation)
  - Restaurant component
    - Desktop/Mobile layout separation
    - Left panel (390px fixed) + Right panel (flex)
    - Mobile: Full-screen toggle (list ↔ review)
    - URL-based navigation (`/restaurant/:placeId`)
    - Review API integration
    - Socket.io real-time crawling
  - Responsive layout with theme-aware styling
- ✅ Authentication state management
  - useAuth hook (global auth state)
  - useLogin hook (login logic)
  - Cross-platform storage
  - Session persistence
  - Auto-restore on app restart
- ✅ Routing & Navigation
  - Web: React Router with protected routes
  - Mobile: Conditional rendering based on auth state
  - Loading states during auth check
- ✅ Testing
  - Playwright E2E tests (Web)
  - Maestro E2E tests (Mobile)
  - Login flow with alert handling
- ✅ Clean module separation (components/hooks/contexts/constants/services/types/utils)
- ✅ Socket.io Real-time System (Client)
  - SocketContext with unified state management
  - Restaurant room-based subscriptions
  - Real-time progress updates (crawling, summarization)
  - Shared types from `shared/utils/socket.utils.ts`
  - Auto-subscribe/unsubscribe on restaurant selection
  - Client-side status tracking (reviewCrawlStatus, reviewSummaryStatus)
  - Progress tracking (crawlProgress, dbProgress, summaryProgress)

### 5.2 🔲 진행 중 / 계획된 기능

- 🔲 JWT token authentication implementation
- 🔲 Backend business logic expansion
- 🔲 ML model integration in Smart server
- 🔲 Production database (PostgreSQL migration)
- 🔲 Advanced analytics features
- 🔲 User preferences and settings persistence
- 🔲 Push notifications (Mobile)

### 5.3 주요 패턴 및 Best Practices

#### Barrel Export Pattern (Shared Module)
- 각 폴더에 `index.ts` 파일로 export 통합
- Clean imports: `import { Button } from '@shared/components'`
- 도메인별 상수 분리 (app, auth)

#### Repository Pattern (Database)
- Data access layer 추상화
- CRUD operations 캡슐화
- UPSERT pattern (place_id, review_hash 기반)

#### Unified Job + Socket Pattern
- Single service for all job types
- Automatic DB persistence
- Automatic Socket event emission
- 90% parameter reduction (options objects eliminated)

#### Cross-platform Development
- React Native Web for web app
- Shared code between web and mobile
- Platform-specific code when necessary

---

## 6. 관련 문서

### 6.1 Core Documentation
- [Database Schema](./DATABASE.md) - DB 스키마, 마이그레이션, Repository 패턴
- [Development Workflow](./DEVELOPMENT.md) - 개발 워크플로우, 테스트 전략, 명령어

### 6.2 Frontend Documentation
- [Web Setup](../01-web/WEB-SETUP.md) - Vite, React Native Web 설정
- [Web Routing](../01-web/WEB-ROUTING.md) - React Router, 라우팅 구조
- [Web Theme](../01-web/WEB-THEME.md) - ThemeContext, Light/Dark mode
- [Mobile Setup](../02-mobile/MOBILE-SETUP.md) - Metro, React Native 설정
- [Mobile Navigation](../02-mobile/MOBILE-NAVIGATION.md) - React Navigation 구조
- [Shared Overview](../03-shared/SHARED-OVERVIEW.md) - Barrel Export 패턴

### 6.3 Backend Documentation
- [Friendly Overview](../04-friendly/FRIENDLY-OVERVIEW.md) - Fastify 구조, Path Alias
- [Friendly Job + Socket](../04-friendly/FRIENDLY-JOB-SOCKET.md) - Unified Job + Socket 시스템
- [Friendly Auth](../04-friendly/FRIENDLY-AUTH.md) - 인증 시스템
- [Friendly Crawler](../04-friendly/FRIENDLY-CRAWLER.md) - Naver Map 크롤러
- [Smart Overview](../05-smart/SMART-OVERVIEW.md) - FastAPI 기본 구조

---

**문서 버전**: 1.0
**작성일**: 2025-10-23
**관리**: Claude Code Documentation Team
