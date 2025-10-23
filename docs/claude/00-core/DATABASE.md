# Database System

> **Last Updated**: 2025-10-23
> **Purpose**: SQLite 데이터베이스 스키마, 마이그레이션, Repository 패턴 설명

---

## 목차

1. [SQLite Integration](#1-sqlite-integration)
2. [Database Schema](#2-database-schema)
3. [Migration System](#3-migration-system)
4. [Timestamp Management](#4-timestamp-management)
5. [Repository Pattern](#5-repository-pattern)
6. [Database Operations](#6-database-operations)
7. [관련 문서](#7-관련-문서)

---

## 1. SQLite Integration

### 1.1 Database Overview

#### 1.1.1 기본 정보
- **Database Type**: SQLite3
- **Storage**: File-based storage
- **Location**: `servers/friendly/data/niney.db`
- **Migrations**: Automated on server startup
- **Migration Files**: `servers/friendly/src/db/migrations/`

#### 1.1.2 특징
- **Lightweight**: 별도 DB 서버 불필요
- **Serverless**: 파일 기반 저장
- **ACID Compliant**: 트랜잭션 지원
- **Cross-platform**: Windows, macOS, Linux 호환

#### 1.1.3 사용 이유
- 개발 및 프로토타입에 적합
- 간단한 설정 (별도 DB 서버 불필요)
- 파일 기반으로 백업 및 복구 용이
- Production에서는 PostgreSQL로 마이그레이션 예정

### 1.2 Timestamp Handling

#### 1.2.1 문제점
- SQLite의 `CURRENT_TIMESTAMP`는 UTC를 반환
- `created_at`은 DEFAULT CURRENT_TIMESTAMP (UTC)
- `updated_at` 동적 업데이트 시 UTC 사용하면 시간 불일치 발생

#### 1.2.2 해결 방안
- **Schema Default**: `DEFAULT CURRENT_TIMESTAMP` (일관성 유지)
- **Dynamic Updates**: `datetime('now', 'localtime')` 사용

```sql
-- Schema에서 (기존 마이그레이션 파일)
created_at DATETIME DEFAULT CURRENT_TIMESTAMP

-- 코드에서 동적 업데이트 시
UPDATE users
SET updated_at = datetime('now', 'localtime')
WHERE id = ?
```

#### 1.2.3 적용된 파일들
다음 파일들에서 `datetime('now', 'localtime')` 사용:
1. `review-summary.repository.ts` - 5 instances
   - `updateStatus()` - 1
   - `updateSummary()` - 1
   - `updateSummaryBatch()` - 2
   - `markAsFailed()` - 1
2. `restaurant.repository.ts` - 1 instance
   - `upsert()` - 1
3. `review.repository.ts` - 1 instance
   - `upsert()` - 1
4. `userService.ts` - 1 instance
   - `validateCredentials()` for `last_login` update - 1

**Total**: 8 instances

---

## 2. Database Schema

### 2.1 users Table

#### 2.1.1 Schema
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  provider TEXT DEFAULT 'local',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  is_active BOOLEAN DEFAULT 1
);
```

#### 2.1.2 컬럼 설명
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | 사용자 고유 ID |
| email | TEXT | UNIQUE, NOT NULL | 이메일 (로그인 ID) |
| username | TEXT | UNIQUE, NOT NULL | 사용자명 |
| password_hash | TEXT | NOT NULL | bcrypt 해시된 비밀번호 |
| provider | TEXT | DEFAULT 'local' | 인증 제공자 (local, google, etc.) |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 계정 생성 시간 (UTC) |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 마지막 업데이트 시간 |
| last_login | DATETIME | - | 마지막 로그인 시간 |
| is_active | BOOLEAN | DEFAULT 1 | 계정 활성화 여부 |

#### 2.1.3 인덱스
- PRIMARY KEY on `id` (자동 생성)
- UNIQUE INDEX on `email` (자동 생성)
- UNIQUE INDEX on `username` (자동 생성)

#### 2.1.4 사용 예시
```typescript
// 사용자 생성
await db.run(`
  INSERT INTO users (email, username, password_hash)
  VALUES (?, ?, ?)
`, ['user@example.com', 'username', hashedPassword])

// 로그인 시 last_login 업데이트
await db.run(`
  UPDATE users
  SET last_login = datetime('now', 'localtime')
  WHERE email = ?
`, [email])
```

### 2.2 sessions Table

#### 2.2.1 Schema
```sql
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 2.2.2 컬럼 설명
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | 세션 고유 ID |
| user_id | INTEGER | NOT NULL, FK | 사용자 ID (users.id 참조) |
| token | TEXT | UNIQUE, NOT NULL | JWT 토큰 또는 세션 토큰 |
| expires_at | DATETIME | NOT NULL | 토큰 만료 시간 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 세션 생성 시간 |

#### 2.2.3 제약조건
- FOREIGN KEY: `user_id` → `users(id)`

#### 2.2.4 목적
- JWT 토큰 관리 (향후 구현 예정)
- 세션 기반 인증
- 토큰 블랙리스트 관리

### 2.3 restaurants Table

#### 2.3.1 Schema
```sql
CREATE TABLE restaurants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  place_id TEXT UNIQUE NOT NULL,  -- Naver Place ID
  name TEXT NOT NULL,
  place_name TEXT,
  category TEXT,
  phone TEXT,
  address TEXT,
  description TEXT,
  business_hours TEXT,
  lat REAL,  -- Latitude
  lng REAL,  -- Longitude
  url TEXT NOT NULL,
  crawled_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 2.3.2 컬럼 설명
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | 레스토랑 고유 ID |
| place_id | TEXT | UNIQUE, NOT NULL | Naver Place ID (UPSERT 키) |
| name | TEXT | NOT NULL | 레스토랑 이름 |
| place_name | TEXT | - | 장소명 (상호명) |
| category | TEXT | - | 카테고리 (예: 한식, 중식) |
| phone | TEXT | - | 전화번호 |
| address | TEXT | - | 주소 |
| description | TEXT | - | 설명 |
| business_hours | TEXT | - | 영업 시간 |
| lat | REAL | - | 위도 |
| lng | REAL | - | 경도 |
| url | TEXT | NOT NULL | Naver Map URL |
| crawled_at | DATETIME | NOT NULL | 크롤링 수행 시간 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 레코드 생성 시간 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 마지막 업데이트 시간 |

#### 2.3.3 인덱스
- PRIMARY KEY on `id`
- UNIQUE INDEX on `place_id` (자동 생성)

#### 2.3.4 UPSERT 패턴
```typescript
// UPSERT by place_id
await db.run(`
  INSERT INTO restaurants (place_id, name, category, ...)
  VALUES (?, ?, ?, ...)
  ON CONFLICT(place_id) DO UPDATE SET
    name = excluded.name,
    category = excluded.category,
    updated_at = datetime('now', 'localtime')
`, [placeId, name, category, ...])
```

### 2.4 menus Table

#### 2.4.1 Schema
```sql
CREATE TABLE menus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price TEXT NOT NULL,
  image TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);
```

#### 2.4.2 컬럼 설명
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | 메뉴 고유 ID |
| restaurant_id | INTEGER | NOT NULL, FK | 레스토랑 ID (restaurants.id 참조) |
| name | TEXT | NOT NULL | 메뉴 이름 |
| description | TEXT | - | 메뉴 설명 |
| price | TEXT | NOT NULL | 가격 (문자열 형태) |
| image | TEXT | - | 메뉴 이미지 URL |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성 시간 |

#### 2.4.3 제약조건
- FOREIGN KEY: `restaurant_id` → `restaurants(id)` ON DELETE CASCADE
  - 레스토랑 삭제 시 관련 메뉴도 자동 삭제

#### 2.4.4 메뉴 교체 패턴
재크롤링 시 기존 메뉴 삭제 후 새 메뉴 삽입:
```typescript
// 1. 기존 메뉴 삭제
await db.run(`DELETE FROM menus WHERE restaurant_id = ?`, [restaurantId])

// 2. 새 메뉴 삽입
for (const menu of newMenus) {
  await db.run(`
    INSERT INTO menus (restaurant_id, name, price, description, image)
    VALUES (?, ?, ?, ?, ?)
  `, [restaurantId, menu.name, menu.price, menu.description, menu.image])
}
```

### 2.5 reviews Table

#### 2.5.1 Schema
```sql
CREATE TABLE reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL,
  review_hash TEXT UNIQUE NOT NULL,  -- Hash for duplicate detection
  user_name TEXT,
  review_text TEXT,
  visit_keywords TEXT,  -- JSON array
  emotion_keywords TEXT,  -- JSON array
  visit_date TEXT,
  visit_count TEXT,
  verification_method TEXT,
  wait_time TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);
```

#### 2.5.2 컬럼 설명
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | 리뷰 고유 ID |
| restaurant_id | INTEGER | NOT NULL, FK | 레스토랑 ID |
| review_hash | TEXT | UNIQUE, NOT NULL | 중복 감지용 해시 (UPSERT 키) |
| user_name | TEXT | - | 리뷰 작성자명 |
| review_text | TEXT | - | 리뷰 본문 |
| visit_keywords | TEXT | - | 방문 키워드 (JSON 배열) |
| emotion_keywords | TEXT | - | 감정 키워드 (JSON 배열) |
| visit_date | TEXT | - | 방문 날짜 |
| visit_count | TEXT | - | 방문 횟수 |
| verification_method | TEXT | - | 인증 방법 |
| wait_time | TEXT | - | 대기 시간 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성 시간 |

#### 2.5.3 제약조건
- FOREIGN KEY: `restaurant_id` → `restaurants(id)` ON DELETE CASCADE
- UNIQUE INDEX on `review_hash` (중복 방지)

#### 2.5.4 중복 감지 패턴
```typescript
// Hash 생성 (user_name + review_text + visit_date)
const hash = crypto
  .createHash('sha256')
  .update(`${userName}:${reviewText}:${visitDate}`)
  .digest('hex')

// UPSERT by review_hash
await db.run(`
  INSERT INTO reviews (restaurant_id, review_hash, user_name, review_text, ...)
  VALUES (?, ?, ?, ?, ...)
  ON CONFLICT(review_hash) DO NOTHING
`, [restaurantId, hash, userName, reviewText, ...])
```

### 2.6 jobs Table

#### 2.6.1 Schema
```sql
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,  -- UUID
  type TEXT NOT NULL,  -- 'review_crawl', 'review_summary', 'restaurant_crawl'
  restaurant_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'active', 'completed', 'failed', 'cancelled'
  progress_current INTEGER DEFAULT 0,
  progress_total INTEGER DEFAULT 0,
  progress_percentage INTEGER DEFAULT 0,
  metadata TEXT,  -- JSON string (작업별 커스텀 데이터)
  result TEXT,  -- JSON string (작업별 결과 데이터)
  error_message TEXT,
  started_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);
```

#### 2.6.2 컬럼 설명
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | TEXT | PRIMARY KEY | Job UUID (crypto.randomUUID()) |
| type | TEXT | NOT NULL | Job 타입 ('review_crawl', 'review_summary', 'restaurant_crawl') |
| restaurant_id | INTEGER | NOT NULL, FK | 레스토랑 ID |
| status | TEXT | NOT NULL, DEFAULT 'pending' | Job 상태 |
| progress_current | INTEGER | DEFAULT 0 | 현재 진행 수 |
| progress_total | INTEGER | DEFAULT 0 | 전체 작업 수 |
| progress_percentage | INTEGER | DEFAULT 0 | 진행률 (%) |
| metadata | TEXT | - | Job별 커스텀 데이터 (JSON) |
| result | TEXT | - | Job 결과 데이터 (JSON) |
| error_message | TEXT | - | 에러 메시지 (실패 시) |
| started_at | DATETIME | - | Job 시작 시간 |
| completed_at | DATETIME | - | Job 완료 시간 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성 시간 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 업데이트 시간 |

#### 2.6.3 Job 타입
1. **review_crawl**: 리뷰 크롤링
2. **review_summary**: 리뷰 요약 생성
3. **restaurant_crawl**: 레스토랑 크롤링

#### 2.6.4 Job 상태
1. **pending**: 대기 중
2. **active**: 실행 중
3. **completed**: 완료
4. **failed**: 실패
5. **cancelled**: 취소됨 (review_crawl만 지원)

#### 2.6.5 제약조건
- FOREIGN KEY: `restaurant_id` → `restaurants(id)` ON DELETE CASCADE

#### 2.6.6 사용 예시
```typescript
// Job 생성
const jobId = crypto.randomUUID()
await db.run(`
  INSERT INTO jobs (id, type, restaurant_id, status, metadata)
  VALUES (?, ?, ?, ?, ?)
`, [jobId, 'review_crawl', restaurantId, 'active', JSON.stringify({ url })])

// 진행 상황 업데이트
await db.run(`
  UPDATE jobs
  SET progress_current = ?,
      progress_total = ?,
      progress_percentage = ?,
      updated_at = datetime('now', 'localtime')
  WHERE id = ?
`, [current, total, Math.round((current / total) * 100), jobId])

// Job 완료
await db.run(`
  UPDATE jobs
  SET status = 'completed',
      completed_at = datetime('now', 'localtime'),
      result = ?
  WHERE id = ?
`, [JSON.stringify({ totalReviews: 100 }), jobId])
```

---

## 3. Migration System

### 3.1 Auto-execution

#### 3.1.1 실행 시점
- **Friendly server 시작 시 자동 실행**
- `servers/friendly/src/server.ts`에서 호출

```typescript
// server.ts
import { runMigrations } from './db/migrate'

async function startServer() {
  // 1. Run migrations first
  await runMigrations()

  // 2. Start Fastify server
  await app.listen({ port: 4000, host: '0.0.0.0' })
}
```

#### 3.1.2 Migration Tracking
- **migrations table**에 실행된 마이그레이션 기록
- 파일명을 기준으로 중복 실행 방지

```sql
CREATE TABLE IF NOT EXISTS migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT UNIQUE NOT NULL,
  executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 Migration Files

#### 3.2.1 파일 위치
- `servers/friendly/src/db/migrations/`

#### 3.2.2 파일 명명 규칙
- **Format**: `{sequence}_{description}.sql`
- **Example**:
  - `001_create_users.sql`
  - `002_create_sessions.sql`
  - `003_create_restaurants.sql`
  - `004_create_menus.sql`
  - `005_create_reviews.sql`
  - `006_create_jobs.sql`

#### 3.2.3 순차 실행
- 파일명의 알파벳 순서대로 실행
- 이미 실행된 파일은 스킵

### 3.3 Commands

#### 3.3.1 Database Reset
```bash
# Reset database (모든 테이블 삭제 후 재생성)
cd servers/friendly
npm run db:reset
```

#### 3.3.2 Manual Migration (필요 시)
```bash
# Migrations run automatically on server start
npm run dev  # or npm start
```

### 3.4 Migration 파일 작성 예시

```sql
-- 001_create_users.sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  provider TEXT DEFAULT 'local',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  is_active BOOLEAN DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

---

## 4. Timestamp Management

> **WARNING**: SQLite의 `CURRENT_TIMESTAMP`는 UTC를 반환합니다. 사용자에게 표시되는 시간과 일치시키려면 동적 업데이트에서 `datetime('now', 'localtime')`을 사용해야 합니다. 이를 잘못 사용하면 created_at과 updated_at의 시간대가 불일치하여 혼란을 야기할 수 있습니다.

### 4.1 Strategy

#### 4.1.1 두 가지 타임스탬프 방식
1. **Schema Default**: `DEFAULT CURRENT_TIMESTAMP` (UTC)
   - 용도: created_at 등 최초 생성 시간
   - 장점: 일관성, 마이그레이션 파일 변경 불필요

2. **Dynamic Updates**: `datetime('now', 'localtime')` (Local time)
   - 용도: updated_at, last_login 등 동적 업데이트
   - 장점: 사용자 친화적, created_at과 시간대 일치

#### 4.1.2 Why Local Time for Dynamic Updates?
- **Problem**: CURRENT_TIMESTAMP returns UTC
- **Issue**: created_at (UTC) vs updated_at (UTC) but displayed in local time causes confusion
- **Solution**: Use `datetime('now', 'localtime')` for dynamic updates to match local created_at display

### 4.2 Modified Files

#### 4.2.1 review-summary.repository.ts (5 instances)
```typescript
// updateStatus()
await db.run(`
  UPDATE review_summaries
  SET status = ?, updated_at = datetime('now', 'localtime')
  WHERE id = ?
`, [status, id])

// updateSummary()
await db.run(`
  UPDATE review_summaries
  SET summary = ?, updated_at = datetime('now', 'localtime')
  WHERE id = ?
`, [summary, id])

// updateSummaryBatch() - 2 instances
// markAsFailed()
```

#### 4.2.2 restaurant.repository.ts (1 instance)
```typescript
// upsert()
await db.run(`
  INSERT INTO restaurants (...)
  VALUES (...)
  ON CONFLICT(place_id) DO UPDATE SET
    ...,
    updated_at = datetime('now', 'localtime')
`)
```

#### 4.2.3 review.repository.ts (1 instance)
```typescript
// upsert() (actually uses ON CONFLICT DO NOTHING, no update)
// But prepared for future updates
```

#### 4.2.4 userService.ts (1 instance)
```typescript
// validateCredentials() - last_login update
await db.run(`
  UPDATE users
  SET last_login = datetime('now', 'localtime')
  WHERE email = ?
`, [email])
```

### 4.3 Implementation Pattern

```typescript
// ✅ CORRECT - Dynamic update
await db.run(`
  UPDATE table_name
  SET updated_at = datetime('now', 'localtime')
  WHERE id = ?
`, [id])

// ❌ INCORRECT - Uses UTC
await db.run(`
  UPDATE table_name
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`, [id])

// ✅ CORRECT - Schema default (no change needed)
CREATE TABLE table_name (
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

---

## 5. Repository Pattern

### 5.1 Overview

#### 5.1.1 Purpose
- **Data Access Layer Abstraction**: 데이터베이스 접근 로직 캡슐화
- **CRUD Operations**: Create, Read, Update, Delete 통합 관리
- **UPSERT Pattern**: Insert or Update (중복 처리)

#### 5.1.2 Benefits
- 비즈니스 로직과 데이터 접근 로직 분리
- 테스트 용이성 (Mock Repository)
- 재사용성 향상
- 일관된 에러 처리

### 5.2 Repository Files

#### 5.2.1 restaurant.repository.ts
- **Purpose**: Restaurant 및 Menu CRUD
- **Key Methods**:
  - `upsert()` - Restaurant UPSERT by place_id
  - `findById()` - Restaurant 조회 by ID
  - `findByPlaceId()` - Restaurant 조회 by Naver Place ID
  - `findAll()` - Paginated list
  - `findCategories()` - Category aggregation
  - `insertMenus()` - Menu 일괄 삽입
  - `deleteMenus()` - Menu 일괄 삭제

**상세 문서**: [Friendly Repositories](../04-friendly/FRIENDLY-REPOSITORIES.md#restaurant-repository)

#### 5.2.2 review.repository.ts
- **Purpose**: Review 저장 및 중복 감지
- **Key Methods**:
  - `upsert()` - Review UPSERT by review_hash (중복 방지)
  - `findByRestaurantId()` - Restaurant별 리뷰 조회
  - `countByRestaurantId()` - 리뷰 개수

**상세 문서**: [Friendly Repositories](../04-friendly/FRIENDLY-REPOSITORIES.md#review-repository)

#### 5.2.3 job.repository.ts
- **Purpose**: Job 상태 관리 (DB 영속성)
- **Key Methods**:
  - `create()` - Job 생성
  - `findById()` - Job 조회
  - `updateProgress()` - 진행 상황 업데이트
  - `updateStatus()` - 상태 변경
  - `markCompleted()` - 완료 처리
  - `markFailed()` - 실패 처리
  - `markCancelled()` - 취소 처리

**상세 문서**: [Friendly Repositories](../04-friendly/FRIENDLY-REPOSITORIES.md#job-repository)

#### 5.2.4 review-summary.repository.ts
- **Purpose**: AI 리뷰 요약 저장
- **Key Methods**:
  - `upsert()` - Summary UPSERT
  - `findByRestaurantId()` - Restaurant별 요약 조회
  - `updateStatus()` - 상태 업데이트
  - `updateSummary()` - 요약 내용 업데이트
  - `updateSummaryBatch()` - 배치 업데이트
  - `markAsFailed()` - 실패 처리

**상세 문서**: [Friendly Repositories](../04-friendly/FRIENDLY-REPOSITORIES.md#review-summary-repository)

### 5.3 UPSERT Pattern

#### 5.3.1 개념
- **UPSERT**: INSERT + UPDATE
- **Conflict Handling**: UNIQUE 제약 위반 시 UPDATE

#### 5.3.2 구현 (SQLite)
```sql
INSERT INTO table_name (unique_key, col1, col2)
VALUES (?, ?, ?)
ON CONFLICT(unique_key) DO UPDATE SET
  col1 = excluded.col1,
  col2 = excluded.col2,
  updated_at = datetime('now', 'localtime')
```

#### 5.3.3 사용 사례
- **Restaurants**: place_id로 UPSERT
- **Reviews**: review_hash로 UPSERT (중복 방지)
- **Review Summaries**: restaurant_id로 UPSERT

---

## 6. Database Operations

### 6.1 Connection Management

#### 6.1.1 database.ts
- **Location**: `servers/friendly/src/db/database.ts`
- **Purpose**: SQLite 연결 관리

```typescript
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

let db: Database | null = null

export async function getDatabase() {
  if (!db) {
    db = await open({
      filename: './data/niney.db',
      driver: sqlite3.Database
    })
  }
  return db
}
```

**상세 문서**: [Friendly Database](../04-friendly/FRIENDLY-DATABASE.md)

#### 6.1.2 Error Handling
```typescript
try {
  const db = await getDatabase()
  await db.run(query, params)
} catch (error) {
  console.error('Database error:', error)
  throw new Error('Database operation failed')
}
```

### 6.2 Common Tasks

#### 6.2.1 Database Reset
```bash
cd servers/friendly
npm run db:reset
```
- 모든 테이블 삭제
- 마이그레이션 재실행
- 테스트 데이터 초기화 (seed.ts)

#### 6.2.2 Seed Data
```typescript
// seed.ts
export async function seedDatabase() {
  const db = await getDatabase()

  // Insert test user
  await db.run(`
    INSERT INTO users (email, username, password_hash)
    VALUES (?, ?, ?)
  `, ['test@example.com', 'testuser', hashedPassword])
}
```

#### 6.2.3 Backup/Restore
```bash
# Backup
cp servers/friendly/data/niney.db servers/friendly/data/niney.db.backup

# Restore
cp servers/friendly/data/niney.db.backup servers/friendly/data/niney.db
```

---

## 7. 관련 문서

### 7.1 Core Documentation
- [Architecture](./ARCHITECTURE.md) - 전체 아키텍처, 프로젝트 구조
- [Development Workflow](./DEVELOPMENT.md) - 개발 워크플로우, 명령어

### 7.2 Friendly Server Documentation
- [Friendly Database Module](../04-friendly/FRIENDLY-DATABASE.md) - database.ts, migrate.ts, seed.ts 상세
- [Friendly Repositories](../04-friendly/FRIENDLY-REPOSITORIES.md) - Repository 구현 상세
- [Friendly Job + Socket](../04-friendly/FRIENDLY-JOB-SOCKET.md) - Job 테이블 사용 (JobSocketService)

### 7.3 관련 주제
- **Migrations**: [Friendly Database](../04-friendly/FRIENDLY-DATABASE.md#migration-system)
- **Repositories**: [Friendly Repositories](../04-friendly/FRIENDLY-REPOSITORIES.md)
- **Job Management**: [Friendly Job + Socket](../04-friendly/FRIENDLY-JOB-SOCKET.md)

---

**문서 버전**: 1.0
**작성일**: 2025-10-23
**관리**: Claude Code Documentation Team
