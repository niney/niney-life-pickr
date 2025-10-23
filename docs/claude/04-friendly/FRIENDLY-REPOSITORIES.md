# FRIENDLY-REPOSITORIES.md

> **Last Updated**: 2025-10-23 23:35
> **Purpose**: Repository pattern for database access

---

## Quick Reference

**Location**: `src/db/repositories/*.repository.ts`

**Pattern**: Data access layer with typed methods

**Repositories**:
- `RestaurantRepository` - Restaurant + menu CRUD
- `ReviewRepository` - Review storage with deduplication
- `ReviewSummaryRepository` - Summary CRUD and batch ops
- `JobRepository` - Job state persistence

### Repository Pattern Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Routes Layer                              │
│  (auth.routes.ts, crawler.routes.ts, restaurant.routes.ts)      │
└────────────────────────┬────────────────────────────────────────┘
                         │ Calls
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Services Layer                             │
│  (naver-crawler.service.ts, restaurant.service.ts,              │
│   review-summary.service.ts, job-socket.service.ts)             │
└────────────────────────┬────────────────────────────────────────┘
                         │ Uses
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Repositories Layer                            │
│                    (Data Access Layer)                           │
├──────────────┬─────────────┬─────────────────┬──────────────────┤
│  Restaurant  │   Review    │  ReviewSummary  │      Job         │
│  Repository  │ Repository  │   Repository    │   Repository     │
├──────────────┼─────────────┼─────────────────┼──────────────────┤
│ • upsert()   │ • upsert()  │ • create()      │ • create()       │
│ • findById() │ • find...() │ • update...()   │ • updateStatus() │
│ • list()     │ • delete()  │ • batch...()    │ • complete()     │
│ • delete()   │             │ • markFailed()  │ • fail()         │
└──────────────┴─────────────┴─────────────────┴──────────────────┘
                         │ Executes SQL
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Database Layer                               │
│                   (SQLite3 via database.ts)                      │
├─────────────┬──────────┬──────────┬────────┬────────────────────┤
│   users     │restaurants│  menus   │ reviews│review_summaries   │
│   sessions  │          │          │        │     jobs           │
└─────────────┴──────────┴──────────┴────────┴────────────────────┘
```

> **IMPORTANT**: Repository 패턴을 사용하면 **비즈니스 로직(Services)과 데이터 접근 로직(Repositories)이 분리**됩니다. 이는 테스트 용이성, 재사용성, 유지보수성을 크게 향상시킵니다. Repository를 mock하면 DB 없이도 Service 로직을 테스트할 수 있습니다.

---

## 1. RestaurantRepository

**File**: `src/db/repositories/restaurant.repository.ts`

**Key Methods**:
- `upsert(data)` - Insert or update restaurant by `place_id`
- `findById(id)` - Get restaurant by ID
- `findByPlaceId(placeId)` - Get restaurant by Naver Place ID
- `list(limit, offset, category?)` - Paginated list with optional filter
- `getCategories()` - Category aggregation with counts
- `deleteById(id)` - Hard delete with cascading

**Menu Methods**:
- `upsertMenus(restaurantId, menus)` - Replace all menus
- `getMenusByRestaurantId(id)` - Get all menus for restaurant

---

## 2. ReviewRepository

**File**: `src/db/repositories/review.repository.ts`

**Key Methods**:
- `upsert(restaurantId, review)` - Insert with hash-based deduplication
- `findByRestaurantId(restaurantId, options)` - Get reviews with filtering
- `deleteByRestaurantId(restaurantId)` - Delete all restaurant reviews

**Deduplication**: Uses `review_hash` (MD5 of review content) for UNIQUE constraint

**Filtering Options**:
- `limit`, `offset` - Pagination
- `sentiments` - Array of sentiment values
- `searchText` - Full-text search

---

## 3. ReviewSummaryRepository

**File**: `src/db/repositories/review-summary.repository.ts`

**Key Methods**:
- `create(reviewId, summary)` - Insert summary
- `findByReviewId(reviewId)` - Get summary for review
- `updateSummary(reviewId, summary)` - Update existing summary
- `updateSummaryBatch(summaries)` - Batch update multiple summaries
- `deleteByRestaurantId(restaurantId)` - Delete all summaries for restaurant
- `markAsFailed(reviewId, error)` - Mark summary generation as failed

**Batch Processing**: Optimized for bulk summary generation

---

## 4. JobRepository

**File**: `src/db/repositories/job.repository.ts`

**Key Methods**:
- `create(job)` - Insert new job
- `findById(jobId)` - Get job by ID
- `updateStatus(jobId, status, data?)` - Update job status
- `updateProgress(jobId, current, total)` - Update progress
- `complete(jobId, result)` - Mark job as completed
- `fail(jobId, error)` - Mark job as failed
- `deleteByRestaurantId(restaurantId)` - Delete all restaurant jobs

**Job Lifecycle**: pending → active → completed/failed/cancelled

---

## Benefits of Repository Pattern

1. **Separation of Concerns**: Business logic vs. data access
2. **Type Safety**: TypeScript interfaces for all operations
3. **Reusability**: Shared queries across routes
4. **Testability**: Easy to mock for unit tests
5. **Centralized SQL**: All queries in one place per entity

---

**See Also**:
- [FRIENDLY-DATABASE.md](./FRIENDLY-DATABASE.md) - Database schema
- [DATABASE.md](../00-core/DATABASE.md) - Full schema details
- [FRIENDLY-TESTING.md](./FRIENDLY-TESTING.md) - Repository testing
