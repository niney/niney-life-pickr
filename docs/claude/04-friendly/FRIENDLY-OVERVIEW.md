# FRIENDLY-OVERVIEW.md

> **Last Updated**: 2025-10-23 22:55
> **Purpose**: Overview of Friendly backend server architecture and features

---

## Table of Contents

1. [Overview](#1-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Core Features](#4-core-features)
5. [API Documentation System](#5-api-documentation-system)
6. [Database Layer](#6-database-layer)
7. [Real-time Communication](#7-real-time-communication)
8. [Development Workflow](#8-development-workflow)
9. [Testing Strategy](#9-testing-strategy)
10. [Related Documentation](#10-related-documentation)

---

## 1. Overview

### 1.1 Purpose

**Friendly** is the primary Node.js backend server for Niney Life Pickr, providing:
- RESTful API endpoints for web and mobile clients
- Web crawling services (Naver Map restaurant data)
- Real-time job progress updates via Socket.io
- AI-powered review summarization
- SQLite database management with automated migrations

### 1.2 Server Information

**Location**: `servers/friendly/`

**Package Name**: `@niney-life-pickr/friendly-server`

**Version**: 1.0.0

**Port**: 4000 (development), configurable via `PORT` environment variable

**Entry Point**: `src/server.ts`

### 1.3 Key Responsibilities

1. **Authentication**: User registration, login, session management
2. **Web Crawling**: Naver Map restaurant scraping with Puppeteer
3. **Data Management**: Restaurant, menu, review CRUD operations
4. **Job Processing**: Background task management with progress tracking
5. **Real-time Updates**: Socket.io events for crawling progress
6. **AI Integration**: Local/cloud Ollama for review summarization

---

## 2. Technology Stack

### 2.1 Core Framework

**Fastify 5.6.0**
- High-performance Node.js web framework
- Schema-based validation with TypeBox
- Automatic OpenAPI generation
- Async/await support throughout

### 2.2 Language and Build Tools

- **TypeScript 5.8**: Full type safety
- **TSC**: TypeScript compiler
- **ts-node**: Development execution
- **nodemon**: Hot reload during development

### 2.3 Database

- **SQLite3**: File-based relational database
- **Location**: `servers/friendly/data/niney.db`
- **Migrations**: Automated on server startup

### 2.4 Web Scraping

- **Puppeteer 24.1.0**: Headless Chrome automation
- **Target**: Naver Map restaurant pages
- **Features**: Restaurant info, menus, reviews with images

### 2.5 Real-time Communication

- **Socket.io 4.8.1**: WebSocket-based bidirectional communication
- **Use Case**: Live job progress updates to clients
- **Room Strategy**: Restaurant ID-based rooms for multi-user collaboration

### 2.6 AI/ML Integration

- **Ollama**: Local and cloud LLM service
- **Models**: llama3.2:latest (3B parameters)
- **Use Case**: Review summarization, sentiment analysis, menu extraction

### 2.7 API Documentation

- **@fastify/swagger**: OpenAPI 3.0 spec generation
- **@fastify/swagger-ui**: Interactive Swagger UI
- **@scalar/fastify-api-reference**: Modern Scalar API reference

### 2.8 Security and Middleware

- **@fastify/helmet**: Security headers
- **@fastify/cors**: Cross-origin resource sharing
- **bcrypt**: Password hashing
- **@fastify/sensible**: HTTP errors and utilities

### 2.9 Testing

- **Vitest**: Unit and integration testing
- **Supertest**: HTTP request testing
- **Coverage**: 80% threshold

---

## 3. Project Structure

### 3.1 Directory Layout

```
servers/friendly/
├── src/
│   ├── app.ts                    # Fastify app configuration
│   ├── server.ts                 # Server entry point
│   ├── routes/                   # API route definitions
│   │   ├── health.routes.ts      # Health check endpoints
│   │   ├── api.routes.ts         # General API info
│   │   ├── auth.routes.ts        # Authentication (login, register)
│   │   ├── crawler.routes.ts     # Web crawling endpoints
│   │   ├── restaurant.routes.ts  # Restaurant CRUD
│   │   ├── review.routes.ts      # Review management
│   │   ├── review-summary.routes.ts # Review summarization
│   │   ├── menu-statistics.routes.ts # Menu sentiment statistics
│   │   ├── job.routes.ts         # Job status queries
│   │   └── docs.routes.ts        # API documentation generation
│   ├── services/                 # Business logic layer
│   │   ├── naver-crawler.service.ts     # Puppeteer-based crawler
│   │   ├── job-manager.service.ts       # In-memory job state
│   │   ├── job-socket.service.ts        # Unified job+socket management
│   │   ├── menu-normalization.service.ts # Menu name normalization
│   │   ├── menu-statistics.service.ts   # Menu sentiment aggregation
│   │   └── ollama/                      # AI services
│   │       ├── base-ollama.service.ts   # Abstract base class
│   │       ├── local-ollama.service.ts  # Local Ollama client
│   │       ├── cloud-ollama.service.ts  # Cloud Ollama client
│   │       └── ollama.config.ts         # Ollama configuration
│   ├── db/                       # Database layer
│   │   ├── database.ts           # SQLite connection manager
│   │   ├── migrate.ts            # Migration runner
│   │   ├── migrations/           # SQL migration files
│   │   └── repositories/         # Data access layer
│   │       ├── restaurant.repository.ts
│   │       ├── review.repository.ts
│   │       ├── review-summary.repository.ts
│   │       └── job.repository.ts
│   ├── socket/                   # Socket.io configuration
│   │   ├── socket.ts             # Socket server initialization
│   │   └── events.ts             # Event constants and types
│   ├── types/                    # TypeScript type definitions
│   │   ├── crawler.types.ts      # Crawler service types
│   │   └── db.types.ts           # Database entity types
│   ├── utils/                    # Utility functions
│   │   ├── response.helpers.ts   # Standardized API responses
│   │   └── validation.ts         # Input validation utilities
│   ├── middlewares/              # Custom middleware
│   └── __tests__/                # Test files
│       ├── integration/          # Integration tests
│       │   ├── auth.routes.test.ts
│       │   ├── crawler.routes.test.ts
│       │   └── restaurant.routes.test.ts
│       └── unit/                 # Unit tests
├── data/                         # SQLite database and images
│   ├── niney.db                  # SQLite database file
│   ├── menu-images/              # Crawled menu images
│   └── review-images/            # Crawled review images
├── dist/                         # Compiled JavaScript output
├── scripts/                      # Development/build scripts
│   ├── kill.js                   # Kill server on port
│   ├── db-reset.js               # Reset database
│   └── copy-assets.js            # Copy assets to dist
├── config/                       # Configuration files
│   ├── base.yml                  # Base configuration
│   ├── test.yml                  # Test environment
│   └── production.yml            # Production settings
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript config (development)
└── tsconfig.build.json           # TypeScript config (production)
```

### 3.2 Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `src/app.ts` | Fastify app setup, plugin registration | ~200 |
| `src/server.ts` | Server startup, Socket.io initialization | ~150 |
| `src/routes/*.routes.ts` | API endpoint definitions | ~100-300 each |
| `src/services/job-socket.service.ts` | Unified job management | ~400 |
| `src/services/naver-crawler.service.ts` | Web scraping logic | ~800 |
| `src/db/repositories/*.repository.ts` | Database operations | ~200-400 each |

---

## 4. Core Features

### 4.1 Authentication

**Endpoints**: `/api/auth/*`

**Features**:
- User registration with validation
- Login with bcrypt password verification
- Session persistence (preparing for JWT)
- User listing (test endpoint)

**See**: [FRIENDLY-AUTH.md](./FRIENDLY-AUTH.md)

### 4.2 Web Crawling

**Endpoints**: `/api/crawler/*`

**Features**:
- Naver Map restaurant crawling (URL-based)
- Menu crawling with image download
- Review crawling with pagination
- Unified crawl/recrawl API

**Technology**: Puppeteer (headless Chrome)

**See**: [FRIENDLY-CRAWLER.md](./FRIENDLY-CRAWLER.md)

### 4.3 Restaurant Management

**Endpoints**: `/api/restaurants/*`

**Features**:
- List restaurants with pagination and category filter
- Get restaurant details with menus
- Category aggregation
- Restaurant deletion (hard delete with cascading)

**See**: [FRIENDLY-RESTAURANT.md](./FRIENDLY-RESTAURANT.md)

### 4.4 Review Management

**Endpoints**: `/api/restaurants/:id/reviews`

**Features**:
- List reviews with sentiment filter
- Search reviews by text
- Pagination support
- Review summarization status

**See**: [FRIENDLY-REVIEW.md](./FRIENDLY-REVIEW.md)

### 4.5 Review Summarization

**Endpoints**: `/api/review-summary/*`

**Features**:
- AI-powered review summarization (Ollama)
- Sentiment analysis (positive/negative/neutral)
- Satisfaction scoring (0-100)
- Menu item extraction with sentiment
- Tips extraction

**See**: [FRIENDLY-REVIEW-SUMMARY.md](./FRIENDLY-REVIEW-SUMMARY.md)

### 4.6 Menu Statistics

**Endpoints**: `/api/restaurants/:id/menu-statistics`

**Features**:
- Aggregate sentiment statistics per menu item
- Top positive/negative menus
- Mention count and positive rate
- Menu name normalization

**Technology**: Menu normalization service, review summary aggregation

### 4.7 Job Management

**Endpoints**: `/api/jobs/:jobId`

**Features**:
- Query job status (pending, active, completed, failed, cancelled)
- Job progress tracking (current/total/percentage)
- Job metadata and result data
- Real-time Socket.io updates

**See**: [FRIENDLY-JOB-SOCKET.md](./FRIENDLY-JOB-SOCKET.md) (already documented)

---

## 5. API Documentation System

### 5.1 Multiple Documentation Formats

The server provides comprehensive API documentation in three formats:

1. **Swagger UI** (`/docs`)
   - Interactive API testing interface
   - Try endpoints with sample requests
   - Bearer token authentication support

2. **Scalar Reference** (`/reference`)
   - Modern, sleek API reference
   - Better UX than Swagger UI
   - Dark mode support

3. **OpenAPI Spec** (`/api/docs/spec`)
   - JSON OpenAPI 3.0 specification
   - Machine-readable format
   - Importable to Postman, Insomnia, etc.

### 5.2 Auto-Generated Documentation

**Feature**: Route-specific documentation generation

**Endpoint**: `POST /api/docs/generate/:routeName`

**Supported Routes**:
- `auth` - Authentication endpoints
- `health` - Health check
- `crawler` - Crawling endpoints
- `restaurant` - Restaurant CRUD
- `review` - Review management

**Output**: Markdown documentation with examples

**Example**:
```bash
curl -X POST http://localhost:4000/api/docs/generate/auth > AUTH_API.md
```

### 5.3 AI-Friendly Prompt

**Endpoint**: `GET /api/docs/ai-prompt`

**Purpose**: Provide a comprehensive prompt for AI assistants working with the API

**Output**: Full API documentation in a single prompt format

**See**: [FRIENDLY-API-DOCS.md](./FRIENDLY-API-DOCS.md)

---

## 6. Database Layer

### 6.1 SQLite Configuration

**File**: `servers/friendly/data/niney.db`

**Connection Manager**: `src/db/database.ts`

**Auto-Migration**: Runs on server startup via `src/db/migrate.ts`

### 6.2 Schema Overview

**Tables**:
- `users` - User accounts
- `sessions` - Session tokens (prepared for JWT)
- `restaurants` - Restaurant metadata
- `menus` - Restaurant menu items
- `reviews` - Customer reviews
- `review_summaries` - AI-generated summaries
- `jobs` - Background task tracking

**See**: [FRIENDLY-DATABASE.md](./FRIENDLY-DATABASE.md) and [DATABASE.md](../00-core/DATABASE.md)

### 6.3 Repository Pattern

**Location**: `src/db/repositories/*.repository.ts`

**Pattern**: Data access layer with typed methods

**Repositories**:
- `RestaurantRepository` - Restaurant and menu CRUD
- `ReviewRepository` - Review storage with deduplication
- `ReviewSummaryRepository` - Summary CRUD and batch operations
- `JobRepository` - Job state persistence

**Benefits**:
- Separation of concerns (business logic vs. data access)
- Type-safe SQL queries
- Centralized database error handling
- Easy mocking for tests

**See**: [FRIENDLY-REPOSITORIES.md](./FRIENDLY-REPOSITORIES.md)

---

## 7. Real-time Communication

### 7.1 Socket.io Integration

**Server**: Initialized in `src/server.ts` and configured in `src/socket/socket.ts`

**Port**: Same as HTTP server (4000)

**CORS**: Enabled for all origins

### 7.2 Room Strategy

**Pattern**: Restaurant ID-based rooms

**Room Format**: `restaurant:${restaurantId}`

**Usage**:
- Clients subscribe to specific restaurant rooms
- Server emits job progress updates to rooms
- All users viewing the same restaurant see identical progress

**Example**:
```typescript
// Client subscribes
socket.emit('subscribe:restaurant', '123');

// Server emits to room
io.to('restaurant:123').emit('review:crawl_progress', {
  jobId,
  current: 10,
  total: 100,
  percentage: 10
});
```

### 7.3 Event Types

**Review Crawling**:
- `review:started`
- `review:crawl_progress`
- `review:db_progress`
- `review:completed`
- `review:error`
- `review:cancelled`

**Review Summarization**:
- `review_summary:started`
- `review_summary:progress`
- `review_summary:completed`
- `review_summary:error`

**See**: [FRIENDLY-JOB-SOCKET.md](./FRIENDLY-JOB-SOCKET.md)

---

## 8. Development Workflow

### 8.1 Development Commands

**Start Server**:
```bash
cd servers/friendly
npm run dev  # Starts with nodemon (hot reload)
```

**Clean Restart**:
```bash
npm run dev:clean  # Kill existing + start fresh
```

**Build for Production**:
```bash
npm run build  # Compile TypeScript to dist/
```

**Start Production**:
```bash
npm start  # or npm run start:prod
```

### 8.2 Environment Variables

**File**: `servers/friendly/.env` (not committed)

**Required Variables**:
```env
PORT=4000
NODE_ENV=development
LOG_LEVEL=info
```

**Optional Variables**:
```env
OLLAMA_BASE_URL=http://localhost:11434
OPENAI_API_KEY=sk-...
```

### 8.3 Port Management

**Kill Script**: `npm run kill`
- Kills process on configured port (cross-platform)
- Useful when server doesn't shut down cleanly

---

## 9. Testing Strategy

### 9.1 Test Commands

**Run All Tests**:
```bash
npm test  # or npm run test:watch
```

**Integration Tests**:
```bash
npm run test:integration
```

**Unit Tests**:
```bash
npm run test:unit
```

**Specific Route Tests**:
```bash
npm run test:auth
npm run test:crawler
npm run test:restaurant
```

**Coverage**:
```bash
npm run test:coverage  # 80% threshold
```

### 9.2 Test Structure

**Location**: `src/__tests__/`

**Integration Tests** (`integration/*.test.ts`):
- Full HTTP request/response testing with Supertest
- Database integration (uses in-memory SQLite)
- Covers all route handlers
- Examples: auth flow, crawling, restaurant CRUD

**Unit Tests** (`unit/*.test.ts`):
- Isolated service logic testing
- Mocked dependencies
- Examples: validation, utilities, helpers

### 9.3 Test Database

**Strategy**: In-memory SQLite for tests

**Reset**: Each test suite creates fresh database

**Migrations**: Run automatically in test setup

**See**: [FRIENDLY-TESTING.md](./FRIENDLY-TESTING.md)

---

## 10. Related Documentation

### Friendly Backend (Detailed)
- **[FRIENDLY-ROUTES.md](./FRIENDLY-ROUTES.md)**: All route definitions
- **[FRIENDLY-AUTH.md](./FRIENDLY-AUTH.md)**: Authentication system
- **[FRIENDLY-CRAWLER.md](./FRIENDLY-CRAWLER.md)**: Web crawling service
- **[FRIENDLY-RESTAURANT.md](./FRIENDLY-RESTAURANT.md)**: Restaurant management
- **[FRIENDLY-REVIEW.md](./FRIENDLY-REVIEW.md)**: Review management
- **[FRIENDLY-REVIEW-SUMMARY.md](./FRIENDLY-REVIEW-SUMMARY.md)**: AI summarization
- **[FRIENDLY-DATABASE.md](./FRIENDLY-DATABASE.md)**: Database layer
- **[FRIENDLY-REPOSITORIES.md](./FRIENDLY-REPOSITORIES.md)**: Repository pattern
- **[FRIENDLY-API-DOCS.md](./FRIENDLY-API-DOCS.md)**: API documentation system
- **[FRIENDLY-TESTING.md](./FRIENDLY-TESTING.md)**: Testing strategy
- **[FRIENDLY-JOB-SOCKET.md](./FRIENDLY-JOB-SOCKET.md)**: Job + Socket system (already documented)

### Frontend (Clients)
- **[SHARED-SERVICES.md](../03-shared/SHARED-SERVICES.md)**: API client (connects to Friendly)
- **[SHARED-CONTEXTS.md](../03-shared/SHARED-CONTEXTS.md)**: SocketContext (Socket.io client)
- **[WEB-RESTAURANT.md](../01-web/WEB-RESTAURANT.md)**: Web client using APIs
- **[MOBILE-RESTAURANT-DETAIL.md](../02-mobile/MOBILE-RESTAURANT-DETAIL.md)**: Mobile client

### Core Documentation
- **[ARCHITECTURE.md](../00-core/ARCHITECTURE.md)**: Overall system architecture
- **[DATABASE.md](../00-core/DATABASE.md)**: Database schema and migrations
- **[DEVELOPMENT.md](../00-core/DEVELOPMENT.md)**: Development workflow

---

## Appendix: Technology Choices

### Why Fastify over Express?

1. **Performance**: ~20% faster than Express (benchmarks)
2. **Schema Validation**: Built-in with TypeBox/JSON Schema
3. **TypeScript**: First-class TypeScript support
4. **OpenAPI**: Automatic API documentation generation
5. **Plugins**: Rich ecosystem with typed plugins

### Why SQLite over PostgreSQL?

1. **Simplicity**: Single file database, no server needed
2. **Development**: Easy setup, portable across machines
3. **Performance**: Fast for read-heavy workloads
4. **Future**: Designed to migrate to PostgreSQL in production

### Why Puppeteer over Cheerio?

1. **JavaScript Rendering**: Naver Map uses heavy client-side JavaScript
2. **Pagination**: Can handle infinite scroll and click interactions
3. **Images**: Can download images referenced in JavaScript
4. **Reliability**: More robust for modern SPAs

### Why Socket.io over WebSockets?

1. **Fallback**: Graceful degradation to long polling
2. **Rooms**: Built-in room management for multi-user
3. **Reconnection**: Automatic reconnection handling
4. **Events**: Named event system (easier than raw WebSocket messages)

---

**Document Version**: 1.0.0
**Covers Files**: Friendly server architecture, technology stack, core features overview
