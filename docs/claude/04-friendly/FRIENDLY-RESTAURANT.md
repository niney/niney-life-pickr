# FRIENDLY-RESTAURANT.md

> **Last Updated**: 2026-01-03
> **Purpose**: Restaurant data management API

---

## Quick Reference

**File**: `src/routes/restaurant.routes.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/restaurants/categories` | GET | Category list with counts |
| `/api/restaurants/rankings` | GET | 감정률 순위 TOP N |
| `/api/restaurants` | GET | List restaurants (paginated, filterable) |
| `/api/restaurants/:id` | GET | Restaurant details + menus |
| `/api/restaurants/:id/reviews` | GET | Reviews with summary (paginated) |
| `/api/restaurants/:id/statistics` | GET | 리뷰 감정 통계 |
| `/api/restaurants/:id` | PATCH | Partial update (catchtable_id 등) |
| `/api/restaurants/:id` | DELETE | Hard delete restaurant |

---

## 1. Get Categories

**Endpoint**: `GET /api/restaurants/categories`

**Example (curl)**:
```bash
curl -X GET http://localhost:4000/api/restaurants/categories
```

**Response**:
```json
{
  "result": true,
  "data": [
    { "category": "한식", "count": 10 },
    { "category": "Unknown", "count": 2 }
  ]
}
```

**Note**: NULL categories returned as "Unknown"

---

## 2. List Restaurants

**Endpoint**: `GET /api/restaurants?limit=20&offset=0&category=한식`

**Query Params**:
- `limit` (default: 20)
- `offset` (default: 0)
- `category` (optional filter)

**Example (curl)**:
```bash
# List all restaurants (default pagination)
curl -X GET "http://localhost:4000/api/restaurants"

# With pagination and filter
curl -X GET "http://localhost:4000/api/restaurants?limit=10&offset=20&category=한식"
```

**Response**:
```json
{
  "result": true,
  "data": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "restaurants": [...]
  }
}
```

---

## 3. Get Rankings

**Endpoint**: `GET /api/restaurants/rankings`

**Query Params**:
- `type`: `positive` | `negative` | `neutral` (default: positive)
- `limit`: 1-100 (default: 5)
- `minReviews`: 최소 분석 리뷰 수 (default: 10)
- `category`: 카테고리 필터 (optional)
- `excludeNeutral`: 중립 제외 여부 (default: false)

**Example (curl)**:
```bash
curl -X GET "http://localhost:4000/api/restaurants/rankings?type=positive&limit=10"
```

**Response**:
```json
{
  "result": true,
  "data": {
    "type": "positive",
    "limit": 10,
    "minReviews": 10,
    "rankings": [
      {
        "rank": 1,
        "restaurant": { "id": 1, "name": "맛집", "category": "한식" },
        "statistics": { "positiveRate": 95.5, ... }
      }
    ]
  }
}
```

---

## 4. Get Restaurant Detail

**Endpoint**: `GET /api/restaurants/:id`

**Example (curl)**:
```bash
curl -X GET http://localhost:4000/api/restaurants/1
```

**Response**:
```json
{
  "result": true,
  "data": {
    "restaurant": {
      "id": 1,
      "place_id": "123456",
      "catchtable_id": null,
      "name": "레스토랑명",
      ...
    },
    "menus": [
      { "name": "김치찌개", "price": "8000원", "image": "/data/..." }
    ]
  }
}
```

**Error**: 404 if restaurant not found

---

## 5. Get Restaurant Reviews

**Endpoint**: `GET /api/restaurants/:id/reviews`

**Query Params**:
- `limit` (default: 20)
- `offset` (default: 0)
- `sentiment`: `positive` | `negative` | `neutral` (다중 선택 가능)

**Example (curl)**:
```bash
curl -X GET "http://localhost:4000/api/restaurants/1/reviews?limit=10&sentiment=positive"
```

**Response**:
```json
{
  "result": true,
  "data": {
    "total": 50,
    "limit": 10,
    "offset": 0,
    "reviews": [
      {
        "id": 1,
        "userName": "사용자",
        "reviewText": "맛있어요",
        "summary": { "sentiment": "positive", ... }
      }
    ]
  }
}
```

---

## 6. Get Restaurant Statistics

**Endpoint**: `GET /api/restaurants/:id/statistics`

**Example (curl)**:
```bash
curl -X GET http://localhost:4000/api/restaurants/1/statistics
```

**Response**:
```json
{
  "result": true,
  "data": {
    "restaurantId": 1,
    "totalReviews": 100,
    "analyzedReviews": 95,
    "positive": 80,
    "negative": 10,
    "neutral": 5,
    "positiveRate": 84.2,
    "negativeRate": 10.5,
    "neutralRate": 5.3
  }
}
```

---

## 7. Update Restaurant (Partial)

**Endpoint**: `PATCH /api/restaurants/:id`

**Body** (all fields optional):
```json
{
  "catchtable_id": "abc123",
  "name": "새 이름",
  "category": "한식",
  "phone": "02-1234-5678",
  "address": "서울시...",
  "description": "설명",
  "business_hours": "11:00-22:00"
}
```

**Example (curl)**:
```bash
# catchtable_id만 업데이트
curl -X PATCH http://localhost:4000/api/restaurants/1 \
  -H "Content-Type: application/json" \
  -d '{"catchtable_id": "abc123"}'
```

**Response** (업데이트된 레스토랑 전체 정보 반환):
```json
{
  "result": true,
  "message": "음식점 정보가 업데이트되었습니다",
  "data": {
    "id": 1,
    "place_id": "123456",
    "catchtable_id": "abc123",
    "name": "레스토랑명",
    "category": "한식",
    ...
  }
}
```

**Error**: 404 if restaurant not found

---

## 8. Delete Restaurant

**Endpoint**: `DELETE /api/restaurants/:id`

**Behavior**: Hard delete (cascading)
- Deletes restaurant row
- Deletes all related menus (CASCADE)
- Deletes all related reviews (CASCADE)
- Deletes all related jobs (CASCADE)
- Deletes menu/review images from filesystem

**Example (curl)**:
```bash
curl -X DELETE http://localhost:4000/api/restaurants/1
```

**Response**:
```json
{
  "result": true,
  "data": {
    "restaurantId": 1,
    "placeId": "123456",
    "deletedMenus": 10,
    "deletedReviews": 50,
    "deletedJobs": 3,
    "deletedImages": {
      "menus": 5,
      "reviews": 20
    }
  }
}
```

---

**See Also**:
- [FRIENDLY-REPOSITORIES.md](./FRIENDLY-REPOSITORIES.md) - Repository layer
- [DATABASE.md](../00-core/DATABASE.md) - Schema
- [SHARED-SERVICES.md](../03-shared/SHARED-SERVICES.md) - API client
