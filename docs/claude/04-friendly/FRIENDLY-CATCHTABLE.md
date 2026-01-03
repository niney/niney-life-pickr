# FRIENDLY-CATCHTABLE.md

> **Last Updated**: 2026-01-04
> **Purpose**: 캐치테이블 리뷰 크롤링 및 AI 요약

---

## Quick Reference

**Files**:
- `src/routes/catchtable.routes.ts` - API 라우트
- `src/services/catchtable.service.ts` - 리뷰 크롤링 서비스
- `src/services/catchtable-review-summary.service.ts` - AI 요약 서비스
- `src/services/catchtable-review-summary-processor.service.ts` - 요약 프로세서
- `src/db/repositories/catchtable-review.repository.ts` - 리뷰 저장소
- `src/db/repositories/catchtable-review-summary.repository.ts` - 요약 저장소
- `src/types/catchtable.types.ts` - 타입 정의

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/catchtable/:restaurantId/process` | POST | 통합 처리 (ID 저장 + 크롤링 + 요약) |
| `/api/catchtable/:restaurantId/reviews` | GET | 리뷰 리스트 조회 (페이지네이션) |
| `/api/catchtable/:restaurantId/reviews/summary/status` | GET | 요약 상태 조회 |

---

## 1. 통합 처리 API

**Endpoint**: `POST /api/catchtable/:restaurantId/process`

모든 캐치테이블 관련 작업을 하나의 API로 처리합니다.

**Body**:
```json
{
  "catchtableId": "12345",        // 캐치테이블 ID (저장할 경우)
  "crawlReviews": true,           // 리뷰 크롤링 여부
  "summarizeReviews": true,       // 리뷰 요약 여부
  "useCloud": true                // Cloud AI 사용 여부 (기본: true)
}
```

**처리 순서**:
1. `catchtableId` 저장 (동기) - DB에 즉시 저장 후 리턴
2. `crawlReviews` 크롤링 (백그라운드) - Socket.io로 진행률 전송
3. `summarizeReviews` 요약 (백그라운드) - Socket.io로 진행률 전송

**Response**:
```json
{
  "result": true,
  "message": "ID 저장 완료, 크롤링 시작, 요약 시작",
  "data": {
    "catchtableIdUpdated": true,
    "crawlJobId": "job_abc123",
    "summarizeJobId": "job_def456"
  }
}
```

---

## 2. 리뷰 리스트 조회

**Endpoint**: `GET /api/catchtable/:restaurantId/reviews`

레스토랑의 캐치테이블 리뷰 리스트를 페이지네이션하여 조회합니다. AI 요약 데이터가 있으면 함께 반환합니다.

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 20 | 조회 개수 (1-100) |
| `offset` | number | 0 | 조회 시작 위치 |

**Response**:
```json
{
  "result": true,
  "message": "Success",
  "data": {
    "reviews": [
      {
        "id": 12345,
        "restaurant_id": 1,
        "reg_date": 1704067200000,
        "writer_display_name": "홍길동",
        "total_score": 4.5,
        "taste_score": 5.0,
        "mood_score": 4.0,
        "service_score": 4.5,
        "review_content": "음식이 정말 맛있었어요!",
        "boss_reply": "감사합니다!",
        "reply_cnt": 1,
        "like_cnt": 5,
        "crawled_at": "2025-01-04T12:00:00",
        "created_at": "2025-01-04T12:00:00",
        "updated_at": "2025-01-04T12:00:00",
        "summary": {
          "summary": "전통주와 안주가 훌륭해 여름에 마시기 딱 좋았으며...",
          "keyKeywords": ["전통주", "안주맛", "서비스우수"],
          "sentiment": "positive",
          "sentimentReason": "맛과 분위기, 서비스 모두 훌륭했기 때문",
          "satisfactionScore": 100,
          "tips": ["여름에 마시기 좋은 전통주 추천"],
          "menuItems": [
            { "name": "남산의 밤", "sentiment": "positive", "reason": "맛있음" }
          ]
        }
      }
    ],
    "pagination": {
      "total": 150,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  },
  "timestamp": "2025-01-04T12:00:00.000Z"
}
```

### Summary 필드 구조
| Field | Type | Description |
|-------|------|-------------|
| `summary` | string | AI 요약 텍스트 |
| `keyKeywords` | string[] | 핵심 키워드 |
| `sentiment` | string | 감정 (positive/negative/neutral) |
| `sentimentReason` | string | 감정 판단 이유 |
| `satisfactionScore` | number | 만족도 점수 (0-100) |
| `tips` | string[] | 방문 팁 |
| `menuItems` | array | 언급된 메뉴 목록 |

> **Note**: `summary`가 "요약 내용이 없습니다"인 경우 UI에서 미표시 처리

---

## 3. 요약 상태 조회

**Endpoint**: `GET /api/catchtable/:restaurantId/reviews/summary/status`

**Response**:
```json
{
  "result": true,
  "data": {
    "total": 100,        // 전체 리뷰 수
    "completed": 80,     // 요약 완료 수
    "incomplete": 20,    // 미완료 수
    "percentage": 80     // 완료율 (%)
  }
}
```

---

## 4. Socket.io 이벤트

### 리뷰 크롤링 진행률
```typescript
// 이벤트: catchtable:review_progress
{
  jobId: string,
  restaurantId: number,
  current: number,
  total: number,
  percentage: number,
  metadata: {
    step: 'fetch' | 'save',
    page?: number,
    fetched?: number,
    saved?: number
  }
}
```

### 리뷰 요약 진행률
```typescript
// 이벤트: catchtable:review_summary_progress
{
  jobId: string,
  restaurantId: number,
  current: number,
  total: number,
  percentage: number,
  metadata: {
    step: 'summary',
    substep: 'processing',
    serviceType: 'cloud' | 'local',
    succeeded: number,
    failed: number
  }
}
```

### 에러 이벤트
```typescript
// 이벤트: catchtable:review_summary_error
{
  jobId: string,
  restaurantId: number,
  error: string
}
```

---

## 5. 데이터베이스 스키마

### catchtable_reviews 테이블
```sql
CREATE TABLE catchtable_reviews (
  id INTEGER PRIMARY KEY,           -- reviewSeq 값을 id로 사용
  restaurant_id INTEGER NOT NULL,
  article_seq INTEGER,
  is_editable INTEGER DEFAULT 0,
  reg_date TEXT,
  -- 작성자 정보
  writer_identifier TEXT,
  writer_display_name TEXT,
  writer_profile_thumb_url TEXT,
  writer_grade TEXT,
  writer_total_review_cnt INTEGER,
  writer_total_avg_score REAL,
  -- 리뷰 내용
  boss_reply TEXT,
  total_score REAL,
  taste_score REAL,
  mood_score REAL,
  service_score REAL,
  review_content TEXT,
  review_comment TEXT,
  -- 예약 정보
  reservation_type TEXT,
  is_take_out INTEGER DEFAULT 0,
  food_type_code TEXT,
  food_type_label TEXT,
  -- 반응 정보
  reply_cnt INTEGER DEFAULT 0,
  like_cnt INTEGER DEFAULT 0,
  is_liked INTEGER DEFAULT 0,
  -- 메타데이터
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### catchtable_review_summaries 테이블
```sql
CREATE TABLE catchtable_review_summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL,
  review_id INTEGER NOT NULL UNIQUE,   -- catchtable_reviews.id 참조
  summary TEXT,
  sentiment TEXT,
  score INTEGER,
  tips TEXT,                           -- JSON array
  menu_items TEXT,                     -- JSON array
  status TEXT DEFAULT 'pending',       -- pending, completed, failed
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 6. 타입 정의

### CatchtableApiReview (API 응답)
```typescript
interface CatchtableApiReview {
  reviewSeq: number;
  articleSeq?: number;
  isEditable: boolean;
  regDate?: string;
  writer?: {
    userIdentifier?: string;
    displayName?: string;
    profileThumbUrl?: string;
    grade?: string;
    totalReviewCnt?: number;
    totalAvgScore?: number;
  };
  bossReply?: string;
  content?: {
    totalScore?: number;
    tasteScore?: number;
    moodScore?: number;
    serviceScore?: number;
    reviewContent?: string;
    reviewComment?: string;
  };
  reservation?: {
    reservationType?: string;
    isTakeOut?: boolean;
    foodType?: { code?: string; label?: string };
  };
  engagement?: {
    replyCnt?: number;
    likeCnt?: number;
    isLiked?: boolean;
  };
}
```

### CatchtableReviewInput (DB 저장용)
```typescript
interface CatchtableReviewInput {
  id: number;                    // reviewSeq 값을 id로 사용
  restaurant_id: number;
  article_seq: number | null;
  is_editable: boolean;
  reg_date: string | null;
  writer_identifier: string | null;
  writer_display_name: string | null;
  // ... 나머지 필드
}
```

---

## 7. 크롤링 설정

**상수** (`catchtable.service.ts`):
```typescript
const CATCHTABLE_API_BASE = 'https://ct-api.catchtable.co.kr/api/review/v1/shops';
const PAGE_SIZE = 12;        // 페이지당 리뷰 수
const MAX_REVIEWS = 1000;     // 최대 크롤링 리뷰 수
const DELAY_MS = 500;        // 페이지 간 딜레이 (ms)
```

**크롤링 URL 패턴**:
```
GET https://ct-api.catchtable.co.kr/api/review/v1/shops/{catchtableId}/reviews?page={page}&size=12&sort=D
```

---

## 8. AI 요약 설정

**서비스**: `CatchtableReviewSummaryService` (UnifiedOllamaService 상속)

**기본 설정**:
- `useCloud`: `true` (기본값)
- 배치 처리: Cloud 10건, Local 1건
- 실패 시 재시도 로직 포함

**요약 출력 형식**:
```json
{
  "summary": "리뷰 요약 텍스트",
  "sentiment": "positive|negative|neutral",
  "score": 85,
  "tips": ["팁1", "팁2"],
  "menu_items": [
    { "name": "메뉴명", "sentiment": "positive" }
  ]
}
```

---

## 9. 클라이언트 연동

### SocketContext (apps/shared)
```typescript
const { catchtableSummaryProgress } = useSocket();

// catchtableSummaryProgress: SummaryProgress | null
// { current, total, percentage, completed, failed }
```

### RestaurantDetail (apps/web)
```tsx
{isCatchtableSummarizing && (
  <SummaryProgressCard
    summaryProgress={catchtableSummaryProgress}
    title="🍽️ 캐치테이블 리뷰 요약 중..."
  />
)}
```

### 캡리뷰 탭 (CatchtableReviewTab)

**위치**: `apps/web/src/components/Restaurant/tabs/`

**구성 파일**:
- `CatchtableReviewTab.tsx` - 탭 컴포넌트
- `CatchtableReviewCard.tsx` - 리뷰 카드 컴포넌트

**커스텀 훅**: `useCatchtableReviews.ts`
```typescript
const {
  catchtableReviews,
  catchtableReviewsLoading,
  catchtableReviewsTotal,
  hasMoreCatchtableReviews,
  fetchCatchtableReviews,
  loadMoreCatchtableReviews,
  resetCatchtableReviews,
} = useCatchtableReviews();
```

**TabMenu 타입**:
```typescript
type TabType = 'menu' | 'review' | 'catchtable' | 'statistics' | 'map' | 'vworld'
```

### RecrawlModal 옵션
```typescript
{
  catchtableId?: string;              // ID 저장
  crawlCatchtableReviews?: boolean;   // 리뷰 크롤링
  summarizeCatchtableReviews?: boolean; // 리뷰 요약
}
```

---

## 10. 관련 문서

- [FRIENDLY-JOB-SOCKET](./FRIENDLY-JOB-SOCKET.md) - Job + Socket.io 통합
- [FRIENDLY-REVIEW-SUMMARY](./FRIENDLY-REVIEW-SUMMARY.md) - 네이버 리뷰 요약
- [SHARED-CONTEXTS](../03-shared/SHARED-CONTEXTS.md) - SocketContext
- [WEB-JOB-MONITOR](../01-web/WEB-JOB-MONITOR.md) - Job 모니터링 UI
