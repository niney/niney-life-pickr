# Development Workflow & Testing

> **Last Updated**: 2025-10-23
> **Purpose**: 개발 워크플로우, 테스트 전략, 명령어, 커밋 컨벤션

---

## 목차

1. [Quick Start Commands](#1-quick-start-commands)
2. [Development Workflow](#2-development-workflow)
3. [Testing Strategy](#3-testing-strategy)
4. [Common Development Tasks](#4-common-development-tasks)
5. [Code Style and Quality](#5-code-style-and-quality)
6. [Environment Configuration](#6-environment-configuration)
7. [Performance Considerations](#7-performance-considerations)
8. [관련 문서](#8-관련-문서)

---

## 1. Quick Start Commands

### 1.1 Development Servers

#### 1.1.1 Web Dev Server
```bash
cd apps/web
npm run dev
```
- **Port**: 3000 (default)
- **Features**: Hot Module Replacement (HMR), Fast Refresh
- **Access**: http://localhost:3000

#### 1.1.2 Friendly Server (Backend)
```bash
cd servers/friendly
npm run dev
```
- **Port**: 4000 (default)
- **Features**: Auto-reload on file changes, pino logging
- **Access**: http://localhost:4000
- **API Docs**: http://localhost:4000/docs (Swagger UI)
- **API Reference**: http://localhost:4000/reference (Scalar)

#### 1.1.3 Smart Server (Python)
```bash
cd servers/smart
python scripts/dev.py
```
- **Port**: 5000 (default)
- **Features**: Auto-reload
- **Access**: http://localhost:5000

#### 1.1.4 Mobile (Metro Bundler)
```bash
cd apps/mobile
npm start
```
- **Port**: 8081 (Metro bundler)
- **Features**: Fast Refresh, Developer Menu

**Run on Device:**
```bash
# Android
npm run android

# iOS
npm run ios
```

### 1.2 Testing Commands

#### 1.2.1 Web E2E (Playwright)
```bash
cd apps/web
npm run test:e2e
```
- **Browsers**: Chromium, Mobile Chrome, Mobile Safari
- **Output**: Test results + Screenshots/Videos on failure

#### 1.2.2 Mobile E2E (Maestro)
```bash
cd apps/mobile
maestro test .maestro/
```
- **Platforms**: Android & iOS
- **Format**: YAML flows

#### 1.2.3 Friendly Server Tests (Vitest)
```bash
cd servers/friendly
npm run test
```
- **Type**: Integration tests
- **Coverage**: `npm run test:coverage`
- **Threshold**: 80% coverage

#### 1.2.4 Smart Server Tests (pytest)
```bash
cd servers/smart
pytest
```
- **Type**: Unit & Integration tests

### 1.3 Build Commands

#### 1.3.1 Web Build
```bash
cd apps/web
npm run build
```
- **Output**: `dist/` directory
- **Features**: Minification, Tree-shaking

#### 1.3.2 Friendly Server Build
```bash
cd servers/friendly
npm run build
```
- **Output**: `dist/` directory
- **Config**: Uses `tsconfig.build.json`

---

## 2. Development Workflow

### 2.1 Kill Script

#### 2.1.1 Purpose
- 특정 포트에서 실행 중인 프로세스 종료
- 서버 재시작 전 포트 충돌 방지

#### 2.1.2 Usage
```bash
cd servers/friendly
npm run kill
```
- Reads port from `config/base.yml`
- Kills process on that port (Windows/Mac/Linux compatible)

#### 2.1.3 Kill + Start
```bash
npm run dev:clean
```
- Runs `kill` script first
- Then starts dev server
- Useful for clean restart

### 2.2 Cross-platform Support

#### 2.2.1 Kill Script Implementation
```bash
# Windows
netstat -ano | findstr :4000
taskkill /PID <pid> /F

# Mac/Linux
lsof -ti:4000 | xargs kill -9
```

#### 2.2.2 Package.json Scripts
```json
{
  "scripts": {
    "kill": "node scripts/kill-port.js",
    "dev": "tsx src/server.ts",
    "dev:clean": "npm run kill && npm run dev"
  }
}
```

### 2.3 Development Best Practices

#### 2.3.1 Code Organization
- 파일 역할별 분리 (routes, services, repositories)
- Barrel exports 사용 (index.ts)
- Path aliases 활용 (@routes, @services, @types)

#### 2.3.2 Error Handling
- Try-catch 블록 사용
- 명확한 에러 메시지
- 적절한 HTTP 상태 코드

#### 2.3.3 Logging
- pino 사용 (Friendly server)
- 적절한 로그 레벨 (info, warn, error)
- 민감 정보 제외 (password, token)

---

## 3. Testing Strategy

### 3.1 Overview

#### 3.1.1 테스트 유형
1. **Web E2E**: Playwright (UI 테스트)
2. **Mobile E2E**: Maestro (UI 테스트)
3. **Backend Integration**: Vitest + Supertest (API 테스트)
4. **Backend Unit**: Vitest (로직 테스트)
5. **Python Tests**: pytest (Smart server)

#### 3.1.2 테스트 철학
- **Fast**: 빠른 실행 시간
- **Isolated**: 독립적인 테스트
- **Repeatable**: 일관된 결과
- **Self-Checking**: 자동 검증
- **Timely**: 코드 작성과 동시에 테스트 작성

### 3.2 Test Organization

#### 3.2.1 Web E2E Tests (Playwright)
- **Location**: `apps/web/e2e/`
- **Files**:
  - `login.spec.ts` - Login flow test
  - `restaurant.spec.ts` - Restaurant features test (planned)
- **Browsers**: Chromium, Mobile Chrome, Mobile Safari
- **Important**: React Native Web buttons are `<div>`, use `getByText()` not `getByRole('button')`

**Related Documentation**: [Web Testing](../01-web/WEB-TESTING.md)

#### 3.2.2 Mobile E2E Tests (Maestro)
- **Location**: `apps/mobile/.maestro/`
- **Files**:
  - `login.yaml` - Login flow test
  - (Additional flows as needed)
- **Platforms**: Android & iOS
- **Features**: YAML-based test flows, Alert handling

**Related Documentation**: [Mobile Testing](../02-mobile/MOBILE-TESTING.md)

#### 3.2.3 Friendly Server Tests (Vitest)
- **Location**: `servers/friendly/src/tests/`
- **Files**:
  - `auth.test.ts` - Authentication routes test
  - `crawler.test.ts` - Crawler service test
  - `restaurant.test.ts` - Restaurant routes test
  - (More test files as features grow)
- **Coverage Threshold**: 80%
- **Framework**: Vitest + Supertest

**Related Documentation**: [Friendly Testing](../04-friendly/FRIENDLY-TESTING.md)

### 3.3 Testing Best Practices

#### 3.3.1 Test Naming
```typescript
// Describe-It pattern
describe('Auth Routes', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user with valid credentials', async () => {
      // Test code
    })

    it('should return 400 for duplicate email', async () => {
      // Test code
    })
  })
})
```

#### 3.3.2 Test Structure (AAA Pattern)
```typescript
it('should do something', async () => {
  // Arrange - 준비
  const email = 'test@example.com'
  const password = 'password123'

  // Act - 실행
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password })

  // Assert - 검증
  expect(response.status).toBe(200)
  expect(response.body.result).toBe(true)
})
```

#### 3.3.3 Test Data Management
```typescript
// Setup - beforeEach
beforeEach(async () => {
  // Clean database
  await db.run('DELETE FROM users')

  // Insert test data
  await db.run(`INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)`,
    ['test@example.com', 'testuser', hashedPassword])
})

// Cleanup - afterEach
afterEach(async () => {
  // Clean up test data
  await db.run('DELETE FROM users')
})
```

---

## 4. Common Development Tasks

### 4.1 Quick Reference

#### 4.1.1 Credentials
- **Test Account**:
  - Email: `niney@ks.com`
  - Password: `tester`

#### 4.1.2 URLs
- **Web App**: http://localhost:3000
- **Friendly API**: http://localhost:4000
- **API Docs (Swagger)**: http://localhost:4000/docs
- **API Reference (Scalar)**: http://localhost:4000/reference
- **Smart Server**: http://localhost:5000

#### 4.1.3 Database
- **Location**: `servers/friendly/data/niney.db`
- **Reset**: `cd servers/friendly && npm run db:reset`

### 4.2 API Testing Examples

#### 4.2.1 Using curl

**Register User**:
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "username",
    "password": "password123"
  }'
```

**Login**:
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Get Restaurants**:
```bash
curl http://localhost:4000/api/restaurants?limit=10&offset=0
```

**Get Restaurant Detail**:
```bash
curl http://localhost:4000/api/restaurants/1
```

**Crawl Restaurant**:
```bash
curl -X POST http://localhost:4000/api/crawler/restaurant \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://map.naver.com/p/entry/place/1234567890"
  }'
```

**For more examples**: See [README.md - API Testing](../../../README.md#api-테스트-예제)

#### 4.2.2 Using Swagger UI
1. Navigate to http://localhost:4000/docs
2. Click on endpoint
3. Click "Try it out"
4. Fill in parameters
5. Click "Execute"

### 4.3 Database Management

#### 4.3.1 Database Reset
```bash
cd servers/friendly
npm run db:reset
```
- Deletes all tables
- Re-runs migrations
- Seeds test data (if seed script exists)

#### 4.3.2 Database Backup
```bash
# Backup
cp servers/friendly/data/niney.db servers/friendly/data/niney.db.backup

# Restore
cp servers/friendly/data/niney.db.backup servers/friendly/data/niney.db
```

#### 4.3.3 Direct SQL Queries
```bash
# Using sqlite3 CLI
cd servers/friendly/data
sqlite3 niney.db

# Example queries
sqlite> SELECT * FROM users;
sqlite> SELECT COUNT(*) FROM restaurants;
sqlite> .schema restaurants
sqlite> .quit
```

**For more details**: See [Database](./DATABASE.md)

---

## 5. Code Style and Quality

### 5.1 Commit Message Convention

#### 5.1.1 **IMPORTANT: 커밋 메시지는 반드시 한글로 작성**

#### 5.1.2 Scope Prefixes
- `[web]` - Web application
- `[mobile]` - Mobile application
- `[shared]` - Shared module
- `[friendly]` - Friendly server
- `[smart]` - Smart server
- `[config]` - Configuration changes
- `[docs]` - Documentation changes

#### 5.1.3 Commit Message Format
```
[scope] 변경 내용 요약 (한 줄)

상세 설명 (선택사항, 2줄 이상 작성 시 빈 줄 후 작성)
- 변경 이유
- 주요 변경 사항
- 영향 범위
```

#### 5.1.4 Examples

**Good Examples**:
```
[web] 데스크탑/모바일 레이아웃 분리 및 리뷰 기능 추가

[friendly] Place ID 기반 리뷰 조회 API 추가

[shared] SocketContext에 리뷰 요약 상태 추가

[mobile] RestaurantDetailScreen에 무한 스크롤 구현

[config] 프로덕션 환경 YAML 설정 추가

[docs] CLAUDE.md를 45개 파일로 분리
```

**Bad Examples**:
```
❌ Update code
❌ Fix bug
❌ [web] Add feature  (영어 사용)
❌ 리뷰 기능 추가  (scope 없음)
```

#### 5.1.5 Multiple Scopes
```
[web][mobile] 공통 컴포넌트 Button 스타일 수정

[friendly][smart] API 응답 형식 통일
```

### 5.2 Linting

#### 5.2.1 ESLint (JavaScript/TypeScript)
```bash
# Web
cd apps/web
npm run lint

# Friendly
cd servers/friendly
npm run lint
```

#### 5.2.2 Prettier (Code Formatting)
```bash
# Format all files
npm run format

# Check formatting
npm run format:check
```

### 5.3 TypeScript

#### 5.3.1 Type Safety
- Strict mode enabled
- No implicit any
- Proper type definitions

#### 5.3.2 Type Organization
- Shared types in `types/` folder
- Domain-specific types in respective modules
- Type exports via barrel pattern

---

## 6. Environment Configuration

### 6.1 Ports

#### 6.1.1 Default Ports
- **Web**: 3000
- **Friendly**: 4000
- **Smart**: 5000
- **Metro Bundler**: 8081

#### 6.1.2 Custom Ports
```bash
# Set in config/base.yml or environment variables
PORT=4000  # Friendly server

# Web (in vite.config.ts)
server: {
  port: 3000
}
```

### 6.2 Network Access

#### 6.2.1 Host Configuration
```bash
# For mobile device access
HOST=0.0.0.0
```

#### 6.2.2 Mobile API Access
- **Android Emulator**: `10.0.2.2:4000`
  - 10.0.2.2 points to host machine's localhost
- **iOS Simulator**: `localhost:4000`
- **Physical Device**: `<your-local-ip>:4000`
  - Example: `192.168.1.100:4000`

#### 6.2.3 Finding Local IP
```bash
# Mac/Linux
ifconfig | grep inet

# Windows
ipconfig
```

### 6.3 Environment Variables

#### 6.3.1 Common Variables
```bash
# Node Environment
NODE_ENV=development|test|production

# Server
PORT=4000
HOST=0.0.0.0

# Database
DATABASE_PATH=./data/niney.db

# API URLs
API_URL=http://localhost:4000
SMART_API_URL=http://localhost:5000
```

#### 6.3.2 .env Files (if used)
```
# .env.development
NODE_ENV=development
PORT=4000

# .env.production
NODE_ENV=production
PORT=8080
```

---

## 7. Performance Considerations

### 7.1 Fastify Performance

#### 7.1.1 TypeBox Schema Validation
- Compile-time schema validation
- Faster than runtime validation
- Auto-generated JSON Schema

#### 7.1.2 Serialization Optimization
- TypeBox serialization
- Faster than JSON.stringify

#### 7.1.3 pino Logging
- Fast logging library
- Structured logging
- Minimal performance impact

### 7.2 Build Optimization

#### 7.2.1 Conditional Minification
```typescript
// vite.config.ts
build: {
  minify: process.env.NODE_ENV === 'production'
}
```

#### 7.2.2 Tree-shaking
- Automatic dead code elimination
- Import only what's needed
- Smaller bundle size

### 7.3 Database Performance

#### 7.3.1 Indexing
- PRIMARY KEY indexes (automatic)
- UNIQUE indexes (automatic)
- Manual indexes as needed

```sql
CREATE INDEX idx_restaurants_category ON restaurants(category);
```

#### 7.3.2 Query Optimization
- Use prepared statements
- Avoid N+1 queries
- Pagination for large datasets

---

## 8. 관련 문서

### 8.1 Core Documentation
- [Architecture](./ARCHITECTURE.md) - 전체 아키텍처, 프로젝트 구조
- [Database](./DATABASE.md) - DB 스키마, 마이그레이션

### 8.2 Testing Documentation
- [Web Testing](../01-web/WEB-TESTING.md) - Playwright E2E 테스트
- [Mobile Testing](../02-mobile/MOBILE-TESTING.md) - Maestro E2E 테스트
- [Friendly Testing](../04-friendly/FRIENDLY-TESTING.md) - Vitest 통합 테스트

### 8.3 Setup Documentation
- [Web Setup](../01-web/WEB-SETUP.md) - Vite 설정
- [Mobile Setup](../02-mobile/MOBILE-SETUP.md) - Metro 설정
- [Friendly Overview](../04-friendly/FRIENDLY-OVERVIEW.md) - Fastify 설정

### 8.4 External Resources
- [README.md](../../../README.md) - 사용자용 문서, API 테스트 예제

---

**문서 버전**: 1.0
**작성일**: 2025-10-23
**관리**: Claude Code Documentation Team
