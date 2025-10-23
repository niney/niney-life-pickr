# 성능 최적화 가이드

> **Last Updated**: 2025-10-24
> **Purpose**: 프로젝트 전반의 성능 최적화 전략 및 Best Practices

---

## 목차

1. [Frontend 최적화](#1-frontend-최적화)
2. [Backend 최적화](#2-backend-최적화)
3. [Database 최적화](#3-database-최적화)
4. [Network 최적화](#4-network-최적화)
5. [Real-time (Socket.io) 최적화](#5-real-time-socketio-최적화)
6. [Build & Deploy 최적화](#6-build--deploy-최적화)
7. [Monitoring & Profiling](#7-monitoring--profiling)

---

## 1. Frontend 최적화

### 1.1 React 최적화

#### 1.1.1 React.memo로 불필요한 리렌더링 방지

**문제**: 부모 컴포넌트 리렌더링 시 자식도 무조건 리렌더링

**해결**:
```typescript
// ❌ 매번 리렌더링
const RestaurantCard = ({ restaurant }) => {
  return <View>...</View>
}

// ✅ props 변경 시만 리렌더링
const RestaurantCard = React.memo(({ restaurant }) => {
  return <View>...</View>
})
```

**적용 대상**:
- 리스트 아이템 컴포넌트 (RestaurantCard, ReviewCard)
- 자주 렌더링되는 컴포넌트 (Header, TabBar)

---

#### 1.1.2 useMemo/useCallback으로 값/함수 캐싱

**문제**: 매 렌더링마다 객체/함수 재생성으로 자식 컴포넌트 리렌더링

**해결**:
```typescript
// ❌ 매번 새 객체 생성
const filteredReviews = reviews.filter(r => r.sentiment === 'positive')

// ✅ 의존성 변경 시만 재계산
const filteredReviews = useMemo(
  () => reviews.filter(r => r.sentiment === 'positive'),
  [reviews]
)

// ❌ 매번 새 함수 생성
const handleClick = () => { ... }

// ✅ 함수 캐싱
const handleClick = useCallback(() => { ... }, [dependencies])
```

**적용 시점**:
- 계산 비용이 큰 작업 (filter, map, reduce)
- 자식 컴포넌트에 전달되는 함수

> **WARNING**: useMemo/useCallback을 **과도하게 사용하면 오히려 성능 저하**. 실제 성능 문제가 있을 때만 적용하세요.

---

#### 1.1.3 Virtual List (Infinite Scroll)

**문제**: 1000개 리뷰를 모두 렌더링하면 메모리/성능 이슈

**해결**:
```typescript
// ✅ 현재 화면에 보이는 것만 렌더링
const ReviewList = () => {
  const [reviews, setReviews] = useState([])
  const [hasMore, setHasMore] = useState(true)

  const loadMore = async () => {
    const newReviews = await fetchReviews(offset)
    setReviews(prev => [...prev, ...newReviews])
  }

  return (
    <InfiniteScroll onLoadMore={loadMore} hasMore={hasMore}>
      {reviews.map(review => <ReviewCard key={review.id} {...review} />)}
    </InfiniteScroll>
  )
}
```

**현재 적용 위치**:
- WEB-RESTAURANT.md: RestaurantDetail 리뷰 탭
- MOBILE-RESTAURANT-DETAIL.md: 리뷰 탭 무한 스크롤

---

### 1.2 Image 최적화

#### 1.2.1 Lazy Loading

**문제**: 모든 이미지를 즉시 로드하면 초기 로딩 느림

**해결**:
```typescript
// ✅ Web
<img src={src} loading="lazy" />

// ✅ React Native
<Image source={{ uri }} resizeMode="cover" />
```

**적용 대상**:
- 메뉴 이미지 (menu-images/)
- 리뷰 이미지 (review-images/)

---

#### 1.2.2 이미지 리사이징

**문제**: 원본 크기 이미지 로드로 대역폭 낭비

**해결**:
```typescript
// Backend에서 리사이징 후 저장
import sharp from 'sharp'

await sharp(imagePath)
  .resize(800, 600, { fit: 'cover' })
  .jpeg({ quality: 80 })
  .toFile(resizedPath)
```

**권장 크기**:
- 썸네일: 200x200
- 중간 크기: 800x600
- 원본: 1920x1080 max

---

### 1.3 Bundle Size 최적화

#### 1.3.1 Code Splitting

**문제**: 전체 앱을 하나의 번들로 로드하면 초기 로딩 느림

**해결**:
```typescript
// ✅ React.lazy로 동적 import
const RestaurantDetail = React.lazy(() => import('./RestaurantDetail'))

<Suspense fallback={<Loading />}>
  <RestaurantDetail />
</Suspense>
```

**적용 대상**:
- 큰 화면 컴포넌트 (RestaurantDetail, Settings)
- 라이브러리 (Chart.js, PDF Viewer 등)

---

#### 1.3.2 Tree Shaking

**문제**: 사용하지 않는 코드도 번들에 포함

**해결**:
```typescript
// ❌ 전체 import
import * as _ from 'lodash'

// ✅ 필요한 것만 import
import debounce from 'lodash/debounce'
```

**적용**:
- Vite는 자동으로 tree shaking 지원
- ESM (import/export) 사용 권장

---

## 2. Backend 최적화

### 2.1 Database Query 최적화

#### 2.1.1 N+1 Query 문제 방지

**문제**: 레스토랑 100개를 가져올 때 메뉴를 각각 조회 (101번 쿼리)

**해결**:
```typescript
// ❌ N+1 Query
const restaurants = await db.all('SELECT * FROM restaurants')
for (const r of restaurants) {
  r.menus = await db.all('SELECT * FROM menus WHERE restaurant_id = ?', r.id)
}

// ✅ JOIN으로 1번 쿼리
const result = await db.all(`
  SELECT r.*, m.id as menu_id, m.name as menu_name, m.price
  FROM restaurants r
  LEFT JOIN menus m ON r.id = m.restaurant_id
`)
// 결과를 그룹화하여 restaurant별로 menus 배열 생성
```

**적용 위치**:
- RestaurantRepository.findById() (restaurant + menus)
- ReviewRepository.findByRestaurantId() (review + summary)

---

#### 2.1.2 인덱스 활용

**문제**: WHERE 절에 인덱스 없으면 Full Table Scan

**해결**:
```sql
-- ✅ 자주 검색되는 컬럼에 인덱스 추가
CREATE INDEX idx_restaurants_category ON restaurants(category);
CREATE INDEX idx_reviews_restaurant_id ON reviews(restaurant_id);
CREATE INDEX idx_jobs_status ON jobs(status);
```

**현재 인덱스**:
- PRIMARY KEY: 모든 테이블의 id
- UNIQUE INDEX: email, username, place_id, review_hash

**추가 권장**:
- category (레스토랑 필터링)
- status (작업 조회)

---

### 2.2 Caching

#### 2.2.1 In-Memory Cache

**문제**: 카테고리 목록을 매번 DB 조회

**해결**:
```typescript
// ✅ Node.js 메모리 캐시
const cache = new Map()

const getCategories = async () => {
  const cached = cache.get('categories')
  if (cached && Date.now() - cached.timestamp < 60000) {
    return cached.data
  }

  const data = await db.all('SELECT category, COUNT(*) ...')
  cache.set('categories', { data, timestamp: Date.now() })
  return data
}
```

**적용 대상**:
- 카테고리 목록 (1분 TTL)
- 레스토랑 통계 (5분 TTL)

---

#### 2.2.2 HTTP 캐싱 (ETag, Cache-Control)

**문제**: 변경되지 않은 데이터도 매번 전송

**해결**:
```typescript
// ✅ Fastify 플러그인
import fastifyEtag from '@fastify/etag'

app.register(fastifyEtag)

app.get('/api/restaurants/:id', async (request, reply) => {
  const restaurant = await restaurantRepository.findById(id)

  reply.header('Cache-Control', 'public, max-age=300') // 5분 캐싱
  return restaurant
})
```

---

### 2.3 Puppeteer 최적화

#### 2.3.1 리소스 차단

**문제**: 불필요한 이미지/CSS 로드로 크롤링 느림

**해결** (이미 적용됨):
```typescript
// ✅ 이미지/CSS 차단
await page.setRequestInterception(true)
page.on('request', (req) => {
  if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
    req.abort()
  } else {
    req.continue()
  }
})
```

**적용 위치**: naver-crawler.service.ts

---

#### 2.3.2 Browser Pool

**문제**: 매번 브라우저 인스턴스 생성/종료 (오버헤드)

**해결**:
```typescript
// ✅ Browser Pool 사용
import { BrowserPool } from 'puppeteer-pool'

const pool = new BrowserPool({ max: 3 })

const crawl = async (url) => {
  const browser = await pool.acquire()
  try {
    const page = await browser.newPage()
    // ... crawl logic
  } finally {
    await pool.release(browser)
  }
}
```

**효과**: 크롤링 속도 30-50% 향상

---

## 3. Database 최적화

### 3.1 PRAGMA 설정 (SQLite)

**문제**: 기본 설정은 성능보다 안정성 우선

**해결**:
```typescript
// ✅ WAL 모드 + 동기화 설정
await db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA cache_size = -64000;  -- 64MB
  PRAGMA temp_store = MEMORY;
`)
```

**효과**:
- WAL 모드: 동시 읽기/쓰기 성능 향상
- synchronous=NORMAL: 쓰기 성능 2-3배 향상
- cache_size: 메모리 캐시 크기 증가

**적용 위치**: database.ts 초기화 시

---

### 3.2 Batch Insert

**문제**: 리뷰 100개를 하나씩 INSERT (100번 트랜잭션)

**해결**:
```typescript
// ❌ 100번 INSERT
for (const review of reviews) {
  await db.run('INSERT INTO reviews ...', [review])
}

// ✅ 1번 트랜잭션
await db.run('BEGIN TRANSACTION')
for (const review of reviews) {
  await db.run('INSERT INTO reviews ...', [review])
}
await db.run('COMMIT')
```

**효과**: 10-20배 성능 향상

**적용 위치**:
- ReviewRepository.upsert() (review-crawler-processor)
- ReviewSummaryRepository.updateSummaryBatch()

---

## 4. Network 최적화

### 4.1 압축 (gzip/brotli)

**문제**: 큰 JSON 응답으로 대역폭 낭비

**해결**:
```typescript
// ✅ Fastify 압축 플러그인
import fastifyCompress from '@fastify/compress'

app.register(fastifyCompress, {
  global: true,
  threshold: 1024 // 1KB 이상만 압축
})
```

**효과**: 응답 크기 60-80% 감소

---

### 4.2 Pagination

**문제**: 리뷰 1000개를 한 번에 전송

**해결** (이미 적용됨):
```typescript
// ✅ Pagination
GET /api/restaurants?limit=20&offset=0
```

**권장 limit**:
- 모바일: 10-20
- 데스크탑: 20-50

---

### 4.3 GraphQL or Partial Response

**문제**: 필요하지 않은 필드도 전송 (over-fetching)

**미래 개선안**:
```typescript
// ✅ Partial response (필요한 필드만 요청)
GET /api/restaurants?fields=id,name,category
```

---

## 5. Real-time (Socket.io) 최적화

### 5.1 Room 기반 Broadcasting

**문제**: 모든 클라이언트에게 이벤트 전송

**해결** (이미 적용됨):
```typescript
// ✅ Restaurant room만
io.to(`restaurant:${restaurantId}`).emit('review:progress', data)
```

**효과**: 불필요한 메시지 전송 방지

---

### 5.2 Event Throttling

**문제**: 초당 100번 progress 이벤트 전송

**해결**:
```typescript
// ✅ 100ms마다 1번만 전송
let lastEmit = 0
const emitProgress = (data) => {
  const now = Date.now()
  if (now - lastEmit > 100) {
    io.emit('progress', data)
    lastEmit = now
  }
}
```

**적용 대상**: review-crawler-processor (진행 상황 업데이트)

---

## 6. Build & Deploy 최적화

### 6.1 Production Build

#### 6.1.1 Vite Production Build

```bash
# ✅ Minification + Tree shaking
npm run build

# 결과: dist/ (압축된 번들)
```

**설정** (vite.config.ts):
```typescript
export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true // console.log 제거
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom']
        }
      }
    }
  }
})
```

---

#### 6.1.2 TypeScript Build (Backend)

```bash
# ✅ tsconfig.build.json 사용
npm run build

# 결과: dist/ (컴파일된 JS)
```

---

### 6.2 CDN 활용

**미래 개선안**:
- 정적 파일 (이미지, CSS, JS) → CDN 서빙
- 메뉴/리뷰 이미지 → S3 + CloudFront

---

## 7. Monitoring & Profiling

### 7.1 React DevTools Profiler

**사용법**:
1. Chrome DevTools → Profiler 탭
2. Record 시작 → 앱 사용 → 중지
3. Flame Chart로 느린 컴포넌트 확인

**찾는 것**:
- Render 시간이 긴 컴포넌트 (100ms+)
- 불필요하게 자주 렌더링되는 컴포넌트

---

### 7.2 Backend Profiling

#### 7.2.1 Fastify 로깅

```typescript
// ✅ pino 로거로 요청 시간 측정
app.get('/api/restaurants', async (request, reply) => {
  const start = Date.now()

  const result = await restaurantRepository.list(...)

  request.log.info({ duration: Date.now() - start }, 'List restaurants')
  return result
})
```

**분석**:
- 100ms 이상 소요되는 엔드포인트 찾기
- DB 쿼리 최적화 필요 여부 판단

---

#### 7.2.2 Database Query Profiling

```typescript
// ✅ EXPLAIN QUERY PLAN
const explain = await db.all(`
  EXPLAIN QUERY PLAN
  SELECT * FROM restaurants WHERE category = 'Korean'
`)

console.log(explain)
// → SCAN vs INDEX 확인
```

---

### 7.3 Network Performance

**Chrome DevTools**:
- Network 탭 → Size/Time 컬럼 확인
- 느린 API (1초+) 찾기
- 큰 응답 (1MB+) 찾기

---

## 8. Best Practices 요약

### 8.1 Frontend
- ✅ React.memo, useMemo, useCallback 적절히 사용
- ✅ Infinite Scroll로 Virtual List 구현
- ✅ Image Lazy Loading
- ✅ Code Splitting (React.lazy)

### 8.2 Backend
- ✅ N+1 Query 방지 (JOIN 사용)
- ✅ 인덱스 추가 (category, status)
- ✅ Batch Insert (트랜잭션)
- ✅ Puppeteer 리소스 차단

### 8.3 Database
- ✅ WAL 모드 + PRAGMA 최적화
- ✅ Pagination
- ✅ Query Profiling

### 8.4 Network
- ✅ gzip/brotli 압축
- ✅ HTTP 캐싱 (ETag, Cache-Control)
- ✅ Socket.io Room 기반 Broadcasting

---

## 9. Performance Checklist

### Before Release
- [ ] Vite Production Build 실행
- [ ] console.log 제거 확인
- [ ] SQLite PRAGMA 설정 확인
- [ ] 이미지 Lazy Loading 적용 확인
- [ ] Infinite Scroll 작동 확인

### After Release
- [ ] Chrome DevTools로 Bundle Size 확인 (<1MB)
- [ ] API 응답 시간 모니터링 (<500ms)
- [ ] Database 쿼리 프로파일링
- [ ] Socket.io 메시지 빈도 확인

---

## 관련 문서

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 시스템 아키텍처
- **[DATABASE.md](./DATABASE.md)** - DB 최적화
- **[WEB-PATTERNS.md](../01-web/WEB-PATTERNS.md)** - React Native Web 최적화
- **[FRIENDLY-JOB-SOCKET.md](../04-friendly/FRIENDLY-JOB-SOCKET.md)** - Socket.io 최적화

---

**문서 버전**: 1.0.0
**작성일**: 2025-10-24
