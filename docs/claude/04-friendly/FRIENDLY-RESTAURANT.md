# FRIENDLY-RESTAURANT.md

> **Last Updated**: 2025-10-23 23:15
> **Purpose**: Restaurant data management API

---

## Quick Reference

**File**: `src/routes/restaurant.routes.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/restaurants/categories` | GET | Category list with counts |
| `/api/restaurants` | GET | List restaurants (paginated, filterable) |
| `/api/restaurants/:id` | GET | Restaurant details + menus |
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

## 3. Get Restaurant Detail

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

## 4. Delete Restaurant

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
