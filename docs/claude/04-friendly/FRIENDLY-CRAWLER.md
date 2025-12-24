# FRIENDLY-CRAWLER.md

> **Last Updated**: 2025-12-24
> **Purpose**: Naver Map web crawling with Puppeteer

---

## Quick Reference

**Files**:
- `src/routes/crawler.routes.ts` - API 라우트
- `src/services/naver-crawler.service.ts` - 기본 크롤러 (v1)
- `src/services/review-crawler/` - 리뷰 크롤러 v2 (모듈형)
- `src/services/review-crawler-processor.service.ts` - 리뷰 크롤링 프로세서

**Endpoint**: `POST /api/crawler/crawl`

**Features**:
- Restaurant info scraping (name, address, category, etc.)
- Menu crawling with image download
- Review crawling with pagination (v2: 모듈형 스텝 기반)
- Image storage in `data/menu-images/` and `data/review-images/`

---

## 1. Unified Crawl API

**Endpoint**: `POST /api/crawler/crawl`

**Body (New Crawl)**:
```json
{
  "url": "https://m.place.naver.com/restaurant/123456",
  "crawlMenus": true,
  "crawlReviews": true,
  "createSummary": true
}
```

**Body (Re-Crawl)**:
```json
{
  "restaurantId": 1,
  "crawlMenus": false,
  "crawlReviews": true,
  "createSummary": true,
  "resetSummary": true
}
```

**Options**:
- `url` OR `restaurantId` (one required)
- `crawlMenus`: Download menu images, store in DB
- `crawlReviews`: Scrape reviews, emit Socket.io progress
- `createSummary`: Generate AI summaries after review crawl
- `resetSummary`: Delete existing summaries before generating new ones

**Example (curl - New Crawl)**:
```bash
curl -X POST http://localhost:4000/api/crawler/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://m.place.naver.com/restaurant/1234567890",
    "crawlMenus": true,
    "crawlReviews": true,
    "createSummary": true
  }'
```

**Example (curl - Re-Crawl)**:
```bash
curl -X POST http://localhost:4000/api/crawler/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "restaurantId": 1,
    "crawlMenus": false,
    "crawlReviews": true,
    "createSummary": true,
    "resetSummary": true
  }'
```

**Response**:
```json
{
  "result": true,
  "message": "Crawling completed",
  "data": {
    "restaurant": { "id": 1, "name": "Restaurant Name", ... },
    "jobId": "uuid-..."
  }
}
```

---

## 2. Crawler Service

### 2.1 기본 크롤러 (v1)

**File**: `src/services/naver-crawler.service.ts`

**Key Methods**:
1. `crawlRestaurant(url)` - Restaurant + Menu 크롤링
2. `crawlReviews(url, callbacks)` - 리뷰 크롤링 (레거시)

**Technology**: Puppeteer (headless Chrome)

### 2.2 리뷰 크롤러 v2 (권장)

**Folder**: `src/services/review-crawler/`

**구조**:
```
review-crawler/
├── index.ts              # 진입점 + 오케스트레이션
├── types.ts              # 타입 정의
├── browser.step.ts       # 브라우저 생성/설정/종료
├── page-load.step.ts     # 페이지 로드 + URL 처리
├── load-all-reviews.step.ts  # 더보기 클릭 + 스크롤
├── extract-reviews.step.ts   # DOM에서 리뷰 추출
└── download-images.step.ts   # 이미지 다운로드
```

**사용법**:
```typescript
import { crawlReviews } from './review-crawler';

const result = await crawlReviews(url, {
  enableScroll: true,
  downloadImages: true,
  maxMoreClicks: 5000
}, {
  onCrawlProgress: (current, total) => { ... },
  onImageProgress: (current, total) => { ... }
});
```

**v1 대비 개선점**:

| 항목 | v1 | v2 |
|------|-----|-----|
| 구조 | 단일 파일 450줄 | 6개 파일로 분리 |
| 더보기 클릭 | 1초 고정 대기 | waitForFunction (즉시 반응) |
| 스크롤 | 이미지 대기 500ms | DOM만 로드 (30ms) |
| 이미지 로딩 | 브라우저 렌더링 | 비활성화 (URL만 추출) |
| 속도 | 기본 | 약 10배 빠름 |

**Performance Optimizations**:
- `--blink-settings=imagesEnabled=false` (이미지 렌더링 비활성화)
- `--disable-remote-fonts` (웹폰트 비활성화)
- `waitForFunction` 기반 빠른 더보기 클릭
- 10개씩 건너뛰며 스크롤 (DOM만 로드)

---

## 3. Data Flow

**Restaurant Crawl**:
1. Parse URL → Extract Place ID
2. Launch Puppeteer browser
3. Scrape restaurant info
4. If `crawlMenus`: Scrape menus, download images
5. Store in database (UPSERT by `place_id`)
6. If `crawlReviews`: Start review job (separate flow)

**Review Crawl v2** (review-crawler + JobSocketService):
```
1. 브라우저 초기화
   └─ initBrowser() - Puppeteer 시작, 리소스 차단 설정

2. 페이지 로드
   ├─ loadPage() - URL 처리, 리다이렉트
   ├─ waitForReviewList() - DOM 대기
   └─ getTotalReviewCount() - 전체 개수 추출

3. 모든 리뷰 로드
   ├─ loadAllReviews() - "더보기" 버튼 반복 클릭
   │   └─ emit REVIEW_CRAWL_PROGRESS
   ├─ scrollForDomLoad() - 빠른 스크롤 (DOM만)
   └─ expandEmotionKeywords() - 감정 키워드 확장

4. 리뷰 추출
   └─ extractReviews() - DOM 파싱

5. 후처리
   ├─ processReviews() - 날짜 파싱 + 이미지 다운로드
   │   └─ emit REVIEW_IMAGE_PROGRESS
   └─ saveReviewsToDb() - DB 일괄 저장
       └─ emit REVIEW_DB_PROGRESS

6. 브라우저 종료
   └─ closeBrowser()
```

---

## 4. Image Handling

**Menu Images**:
- Destination: `data/menu-images/${placeId}/${timestamp}-${index}.jpg`
- Strategy: Download all menu images, store paths in DB

**Review Images**:
- Destination: `data/review-images/${placeId}/${timestamp}-${index}.jpg`
- Strategy: Download first image per review, store in JSON array

**Serving**: Fastify static middleware at `/data/*`

---

## 5. Job Progress Tracking

**Socket.io Events**:
1. `review:started` - Job created
2. `review:crawl_progress` - Web scraping progress (current/total pages)
3. `review:db_progress` - Database saving progress
4. `review:completed` - Success with stats
5. `review:error` - Failure with error message
6. `review:cancelled` - User-initiated cancellation

**Cancellation**: Supported via `JobManager.cancel(jobId)`

---

## 6. Error Handling

**Common Errors**:
- Invalid URL format
- Restaurant not found (404 page)
- Timeout (default: 30 seconds per page)
- Puppeteer crash (auto-cleanup)

**Strategy**: Graceful failure, close browser, emit error event

---

**See Also**:
- [FRIENDLY-JOB-SOCKET.md](./FRIENDLY-JOB-SOCKET.md) - Job system
- [FRIENDLY-RESTAURANT.md](./FRIENDLY-RESTAURANT.md) - Data storage
- [DATABASE.md](../00-core/DATABASE.md) - Schema
