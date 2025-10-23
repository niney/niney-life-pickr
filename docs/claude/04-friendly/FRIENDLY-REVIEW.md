# FRIENDLY-REVIEW.md

> **Last Updated**: 2025-10-23 23:20
> **Purpose**: Review data management and filtering

---

## Quick Reference

**File**: `src/routes/review.routes.ts`

**Endpoint**: `GET /api/restaurants/:id/reviews`

**Features**:
- Pagination support
- Sentiment filtering (positive/negative/neutral)
- Full-text search in review text
- Includes AI-generated summaries

---

## 1. Get Reviews

**Endpoint**: `GET /api/restaurants/:id/reviews?limit=20&offset=0&sentiment=positive&searchText=맛있`

**Query Params**:
- `limit` (default: 20)
- `offset` (default: 0)
- `sentiment` (array: positive, negative, neutral)
- `searchText` (optional, searches review text)

**Response**:
```json
{
  "result": true,
  "data": {
    "total": 50,
    "limit": 20,
    "offset": 0,
    "reviews": [
      {
        "id": 1,
        "userName": "홍길동",
        "reviewText": "맛있어요!",
        "visitKeywords": ["맛있다", "깨끗하다"],
        "emotionKeywords": ["좋아요"],
        "visitInfo": {
          "visitDate": "2025-10",
          "visitCount": "첫 방문",
          "verificationMethod": "방문 인증"
        },
        "images": ["/data/review-images/..."],
        "summary": {
          "summary": "음식이 맛있고 분위기가 좋음",
          "sentiment": "positive",
          "satisfactionScore": 85,
          "tips": ["점심 시간 피크 조심"],
          "menuItems": [
            {"name": "김치찌개", "sentiment": "positive", "reason": "맛있다"}
          ]
        }
      }
    ]
  }
}
```

---

## 2. Sentiment Filtering

**Values**: `positive`, `negative`, `neutral`

**Query**:
```
/api/restaurants/1/reviews?sentiment=positive&sentiment=neutral
```

**Logic**: SQL `IN` clause with provided sentiments

---

## 3. Search

**Query**:
```
/api/restaurants/1/reviews?searchText=김치찌개
```

**Logic**: SQL `LIKE` on `review_text` column

---

**See Also**:
- [FRIENDLY-REVIEW-SUMMARY.md](./FRIENDLY-REVIEW-SUMMARY.md) - Summary generation
- [FRIENDLY-REPOSITORIES.md](./FRIENDLY-REPOSITORIES.md) - Review repository
- [DATABASE.md](../00-core/DATABASE.md) - Reviews table
