# FRIENDLY-CRAWLER.md

> **Last Updated**: 2025-10-23 23:10
> **Purpose**: Naver Map web crawling with Puppeteer

---

## Quick Reference

**File**: `src/routes/crawler.routes.ts`, `src/services/naver-crawler.service.ts`

**Endpoint**: `POST /api/crawler/crawl`

**Features**:
- Restaurant info scraping (name, address, category, etc.)
- Menu crawling with image download
- Review crawling with pagination
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

**File**: `src/services/naver-crawler.service.ts`

**Key Methods**:
1. `scrapeRestaurantInfo(url)` - Basic restaurant data
2. `scrapeMenus(page)` - Menu items with images
3. `scrapeReviews(page, options)` - Reviews with pagination

**Technology**: Puppeteer (headless Chrome)

**Performance Optimizations**:
- Block images/CSS during navigation (`--disable-images`)
- Per-crawl browser instance (clean state)
- Mobile viewport emulation

---

## 3. Data Flow

**Restaurant Crawl**:
1. Parse URL → Extract Place ID
2. Launch Puppeteer browser
3. Scrape restaurant info
4. If `crawlMenus`: Scrape menus, download images
5. Store in database (UPSERT by `place_id`)
6. If `crawlReviews`: Start review job (separate flow)

**Review Crawl** (with JobSocketService):
1. Create job in DB + emit `review:started`
2. Paginate through review pages
3. Emit `review:crawl_progress` (web scraping phase)
4. Save reviews to DB with deduplication
5. Emit `review:db_progress` (database phase)
6. Emit `review:completed` with stats
7. If `createSummary`: Start summary generation job

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
