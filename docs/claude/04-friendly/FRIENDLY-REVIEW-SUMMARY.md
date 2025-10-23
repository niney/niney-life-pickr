# FRIENDLY-REVIEW-SUMMARY.md

> **Last Updated**: 2025-10-23 23:25
> **Purpose**: AI-powered review summarization with Ollama

---

## Quick Reference

**File**: `src/routes/review-summary.routes.ts`, `src/services/ollama/*.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/review-summary/generate` | POST | Generate summaries for restaurant |
| `/api/review-summary/reset` | POST | Delete all summaries |

---

## 1. Generate Summaries

**Endpoint**: `POST /api/review-summary/generate`

**Body**:
```json
{
  "restaurantId": 1
}
```

**Process**:
1. Find all reviews without summaries
2. Batch process with Ollama (llama3.2:latest)
3. Extract: summary, sentiment, score, tips, menu items
4. Store in `review_summaries` table
5. Emit Socket.io progress events

**Socket Events**:
- `review_summary:started`
- `review_summary:progress` (current/total/percentage)
- `review_summary:completed`
- `review_summary:error`

---

## 2. Reset Summaries

**Endpoint**: `POST /api/review-summary/reset`

**Body**:
```json
{
  "restaurantId": 1
}
```

**Behavior**: Deletes all summaries for restaurant, allowing regeneration

---

## 3. Ollama Integration

**Models**:
- **Local**: `http://localhost:11434` (default)
- **Cloud**: OpenAI-compatible endpoint (optional)

**Model**: `llama3.2:latest` (3B parameters)

**Prompt Engineering**:
- JSON output format
- Sentiment analysis (positive/negative/neutral)
- Satisfaction scoring (0-100)
- Menu item extraction with sentiment
- Actionable tips extraction

---

## 4. Summary Schema

```typescript
{
  summary: string;              // 한 문장 요약
  keyKeywords: string[];        // 핵심 키워드 (최대 5개)
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentReason: string;      // 감정 판단 근거
  satisfactionScore: number;    // 0-100 점수
  tips: string[];               // 실용적인 팁 (최대 3개)
  menuItems: [                  // 언급된 메뉴
    {
      name: string;
      sentiment: 'positive' | 'negative' | 'neutral';
      reason: string;
    }
  ]
}
```

---

## 5. Batch Processing

**Strategy**: Process reviews in batches to avoid overwhelming Ollama

**Progress Tracking**: Real-time Socket.io updates

**Error Handling**: Individual review failures don't stop batch

---

**See Also**:
- [FRIENDLY-JOB-SOCKET.md](./FRIENDLY-JOB-SOCKET.md) - Job system
- [FRIENDLY-REVIEW.md](./FRIENDLY-REVIEW.md) - Review API
- [DATABASE.md](../00-core/DATABASE.md) - review_summaries table
