# FRIENDLY-ROUTES.md

> **Last Updated**: 2025-11-04
> **Purpose**: Complete API route reference for Friendly backend

---

## Table of Contents

1. [Overview](#1-overview)
2. [Health Routes](#2-health-routes)
3. [API Routes](#3-api-routes)
4. [Auth Routes](#4-auth-routes)
5. [Crawler Routes](#5-crawler-routes)
6. [Restaurant Routes](#6-restaurant-routes)
7. [Review Routes](#7-review-routes)
8. [Review Summary Routes](#8-review-summary-routes)
9. [Restaurant Statistics Routes](#9-restaurant-statistics-routes)
10. [Menu Statistics Routes](#10-menu-statistics-routes)
11. [Job Routes](#11-job-routes)
12. [Docs Routes](#12-docs-routes)

---

## 1. Overview

All routes are defined in `servers/friendly/src/routes/*.routes.ts` and registered in `src/app.ts`.

**Base URL**: `http://localhost:4000` (development)

**Response Format**: Standardized `ApiResponse<T>` with `result`, `message`, `data`, `timestamp`

---

## 2. Health Routes

**File**: `src/routes/health.routes.ts`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check endpoint |

**Response**:
```json
{
  "result": true,
  "message": "Server is healthy",
  "data": { "status": "ok", "timestamp": "2025-10-23T14:00:00.000Z" }
}
```

---

## 3. API Routes

**File**: `src/routes/api.routes.ts`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api` | API information |

**Response**: Version, description, available endpoints

---

## 4. Auth Routes

**File**: `src/routes/auth.routes.ts`

**Tag**: `auth`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login with credentials |
| GET | `/api/auth/users` | List all users (test) |

**See**: [FRIENDLY-AUTH.md](./FRIENDLY-AUTH.md)

---

## 5. Crawler Routes

**File**: `src/routes/crawler.routes.ts`

**Tag**: `crawler`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/crawler/crawl` | Unified crawl/recrawl API |

**Body Options**:
- `url` OR `restaurantId` (required)
- `crawlMenus` (boolean)
- `crawlReviews` (boolean)
- `createSummary` (boolean)
- `resetSummary` (boolean)

**See**: [FRIENDLY-CRAWLER.md](./FRIENDLY-CRAWLER.md)

---

## 6. Restaurant Routes

**File**: `src/routes/restaurant.routes.ts`

**Tag**: `restaurant`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/restaurants/rankings` | **NEW** Get restaurant rankings by sentiment rate |
| GET | `/api/restaurants/categories` | Get category list with counts |
| GET | `/api/restaurants` | List restaurants (paginated, filterable, searchable) |
| GET | `/api/restaurants/:id` | Get restaurant details with menus |
| DELETE | `/api/restaurants/:id` | Delete restaurant (hard delete) |

### 6.1 Rankings Endpoint (NEW)

**GET** `/api/restaurants/rankings`

Get top restaurants by positive/negative/neutral sentiment rates.

**Query Params**:
- `type` (string): `'positive'` | `'negative'` | `'neutral'` (default: `'positive'`)
- `limit` (number): Results count, 1-100 (default: 5)
- `minReviews` (number): Minimum analyzed reviews, 1-100 (default: 10)
- `category` (string, optional): Filter by category
- `excludeNeutral` (boolean): Exclude neutral from calculations (default: false)
- `invalidateCache` (boolean): Force refresh cache (default: false)

**Response**:
```json
{
  "result": true,
  "data": {
    "type": "positive",
    "limit": 5,
    "minReviews": 10,
    "rankings": [
      {
        "rank": 1,
        "restaurant": {
          "id": 123,
          "name": "Restaurant Name",
          "category": "Korean",
          "address": "Seoul..."
        },
        "statistics": {
          "totalReviews": 150,
          "analyzedReviews": 120,
          "positive": 100,
          "negative": 15,
          "neutral": 5,
          "positiveRate": 83.3,
          "negativeRate": 12.5,
          "neutralRate": 4.2
        }
      }
    ]
  }
}
```

**Cache**: Results are cached for 5 minutes. Use `invalidateCache=true` to force refresh.

### 6.2 List Restaurants (UPDATED)

**GET** `/api/restaurants`

**Query Params**:
- `limit` (number, default: 20, max: 1000)
- `offset` (number, default: 0)
- `category` (string, optional)
- **`searchName`** (string, optional): **NEW** Search by restaurant name
- **`searchAddress`** (string, optional): **NEW** Search by address

**See**: [FRIENDLY-RESTAURANT.md](./FRIENDLY-RESTAURANT.md)

---

## 7. Review Routes

**File**: `src/routes/review.routes.ts`

**Tag**: `review`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/restaurants/:id/reviews` | Get reviews for restaurant |

**Query Params**:
- `limit` (number, default: 20)
- `offset` (number, default: 0)
- `sentiment` (array: positive, negative, neutral)
- `searchText` (string, optional)

**See**: [FRIENDLY-REVIEW.md](./FRIENDLY-REVIEW.md)

---

## 8. Review Summary Routes

**File**: `src/routes/review-summary.routes.ts`

**Tag**: `review-summary`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/review-summary/generate` | Generate summaries for restaurant |
| POST | `/api/review-summary/reset` | Delete all summaries for restaurant |

**Body** (generate):
- `restaurantId` (number)

**Body** (reset):
- `restaurantId` (number)

**See**: [FRIENDLY-REVIEW-SUMMARY.md](./FRIENDLY-REVIEW-SUMMARY.md)

---

## 9. Restaurant Statistics Routes (NEW)

**File**: `src/routes/restaurant.routes.ts`

**Tag**: `restaurant`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/restaurants/:id/statistics` | **NEW** Get review sentiment statistics for a restaurant |

### 9.1 Restaurant Statistics Endpoint

**GET** `/api/restaurants/:id/statistics`

Get aggregated review sentiment statistics for a specific restaurant.

**Response**:
```json
{
  "result": true,
  "data": {
    "restaurantId": 123,
    "totalReviews": 150,
    "analyzedReviews": 120,
    "positive": 100,
    "negative": 15,
    "neutral": 5,
    "positiveRate": 83.3,
    "negativeRate": 12.5,
    "neutralRate": 4.2
  }
}
```

---

## 10. Menu Statistics Routes

**File**: `src/routes/menu-statistics.routes.ts`

**Tag**: `menu-statistics`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/restaurants/:id/menu-statistics` | Get menu sentiment statistics |

**Query Params**:
- `minMentions` (number, default: 1): Minimum mention count to include menu

**Response**: Aggregated sentiment stats per menu, filtered by minimum mentions

---

## 11. Job Routes

**File**: `src/routes/job.routes.ts`

**Tag**: `job`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/jobs/:jobId` | Get job status and progress |

**Response**: Job state (pending/active/completed/failed/cancelled), progress, metadata, result

**See**: [FRIENDLY-JOB-SOCKET.md](./FRIENDLY-JOB-SOCKET.md)

---

## 12. Docs Routes

**File**: `src/routes/docs.routes.ts`

**Tag**: `docs`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/docs/spec` | OpenAPI 3.0 specification (JSON) |
| POST | `/api/docs/generate/:routeName` | Generate markdown docs for route |
| GET | `/api/docs/ai-prompt` | AI-friendly API documentation prompt |

**Supported Route Names** (generate):
- `auth`, `health`, `crawler`, `restaurant`, `review`

**See**: [FRIENDLY-API-DOCS.md](./FRIENDLY-API-DOCS.md)

---

**Document Version**: 2.0.0
**Last Updated**: 2025-11-04
**Covers Files**: All route definitions in `src/routes/*.routes.ts`

**Changelog (v2.0.0)**:
- Added GET `/api/restaurants/rankings` - Restaurant rankings by sentiment
- Added GET `/api/restaurants/:id/statistics` - Restaurant sentiment statistics
- Updated GET `/api/restaurants` - Added `searchName` and `searchAddress` params
- Updated Menu Statistics with `minMentions` param
