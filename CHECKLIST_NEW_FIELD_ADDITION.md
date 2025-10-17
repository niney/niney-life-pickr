# 새 필드 추가 체크리스트 (코드 수정 누락 방지)

> **이 문서는**: 데이터 모델에 새로운 필드를 추가할 때 모든 레이어를 누락 없이 수정하기 위한 체크리스트입니다.

## 📋 새 필드 추가 시 체크리스트

새로운 필드를 추가할 때는 다음 항목들을 순차적으로 확인하세요.

### 1. **백엔드 (서버)**

#### 1.1 타입 정의
- [ ] `src/types/db.types.ts` - DB 인터페이스에 필드 추가
- [ ] JSDoc 주석 추가

#### 1.2 API 스키마 (Swagger/OpenAPI)
- [ ] `src/routes/*.routes.ts` - TypeBox 스키마에 필드 추가
- [ ] 필드 설명 (`description`) 명확히 작성
- [ ] Optional/Required 여부 설정

#### 1.3 데이터베이스
- [ ] 마이그레이션 파일 생성 (필요한 경우)
- [ ] `src/db/migrations/*.sql` - 컬럼 추가

#### 1.4 Repository
- [ ] `src/db/repositories/*.repository.ts` - CRUD 메서드 확인
- [ ] SQL 쿼리에 새 컬럼 포함
- [ ] JSON 필드의 경우 `JSON.parse/stringify` 처리

#### 1.5 Service/Business Logic
- [ ] `src/services/*.service.ts` - 비즈니스 로직 업데이트
- [ ] 기본값 처리
- [ ] Validation 로직

#### 1.6 API 응답 매핑
- [ ] `src/routes/*.routes.ts` - 응답 객체에 필드 포함
- [ ] DB → API 변환 로직 업데이트

---

### 2. **프론트엔드 (클라이언트)**

#### 2.1 공유 타입 (Shared)
- [ ] `apps/shared/services/api.service.ts` - 타입 인터페이스 업데이트
- [ ] `apps/shared/types/*.ts` - 공통 타입 업데이트

#### 2.2 Web UI
- [ ] 컴포넌트에서 새 필드 렌더링
- [ ] 스타일 추가 (`StyleSheet` 또는 CSS)
- [ ] Null/Undefined 체크

#### 2.3 Mobile UI
- [ ] 컴포넌트에서 새 필드 렌더링
- [ ] 스타일 추가 (`StyleSheet`)
- [ ] Null/Undefined 체크

---

### 3. **테스트**

#### 3.1 단위 테스트
- [ ] Repository 테스트
- [ ] Service 테스트
- [ ] API 엔드포인트 테스트

#### 3.2 통합 테스트
- [ ] E2E 테스트 업데이트
- [ ] API 응답 검증

#### 3.3 수동 테스트
- [ ] Swagger UI에서 API 테스트
- [ ] 웹 브라우저에서 확인
- [ ] 모바일 앱에서 확인

---

## 🔍 코드 누락 방지 방법

### 방법 1: **타입 기반 개발 (Type-Driven Development)**

```typescript
// ✅ 좋은 예: 중앙 집중식 타입 정의
// servers/friendly/src/types/db.types.ts
export interface ReviewSummaryData {
  summary: string;
  keyKeywords: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentReason: string;
  satisfactionScore?: number;
  tips?: string[];
  menuItems?: string[];  // 새 필드 추가
}

// ✅ 이 타입을 모든 곳에서 재사용
// - Repository
// - Service
// - API Routes
// - 프론트엔드 (별도 타입이지만 동기화)
```

**장점**: 타입을 변경하면 TypeScript 컴파일러가 모든 사용처를 찾아줌

---

### 방법 2: **검색을 활용한 확인**

#### 2.1 전체 프로젝트 검색 (VS Code)
```
Ctrl/Cmd + Shift + F

검색어 예시:
- "ReviewSummaryData"
- "summary_data"
- "keyKeywords"
- "satisfactionScore"
```

#### 2.2 특정 패턴 검색 (Regex)
```regex
# JSON.parse.*summary_data 패턴 찾기
JSON\.parse\(.*summary_data

# summaryData = { 패턴 찾기
summaryData\s*=\s*\{
```

---

### 방법 3: **린터/정적 분석 도구**

#### 3.1 TypeScript Strict Mode
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictPropertyInitialization": true
  }
}
```

#### 3.2 ESLint 규칙
```json
// .eslintrc.json
{
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

---

### 방법 4: **자동화된 체크리스트**

#### 4.1 Git Pre-commit Hook
```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# TypeScript 컴파일 체크
npm run type-check

# 린트 체크
npm run lint

# 테스트 실행 (선택)
# npm test
```

#### 4.2 CI/CD 파이프라인
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Type Check
        run: npm run type-check
      - name: Lint
        run: npm run lint
      - name: Test
        run: npm test
```

---

### 방법 5: **코드 리뷰 체크리스트**

Pull Request 템플릿 작성:

```markdown
## 체크리스트

### 백엔드
- [ ] 타입 정의 업데이트
- [ ] API 스키마 업데이트
- [ ] DB 마이그레이션 (필요시)
- [ ] Repository 메서드 업데이트
- [ ] API 응답 매핑 업데이트

### 프론트엔드
- [ ] Shared 타입 업데이트
- [ ] Web UI 컴포넌트 업데이트
- [ ] Mobile UI 컴포넌트 업데이트

### 테스트
- [ ] 단위 테스트 작성/업데이트
- [ ] 수동 테스트 완료

### 문서
- [ ] API 문서 업데이트
- [ ] CHANGELOG 업데이트
```

---

### 방법 6: **의존성 추적**

#### 6.1 파일 간 의존성 시각화
```bash
# madge 설치
npm install -g madge

# 의존성 그래프 생성
madge --image graph.svg src/
```

#### 6.2 타입 사용처 찾기 (VS Code)
```
1. 타입 이름에 커서 두기
2. Shift + F12 (Find All References)
3. 모든 사용처 확인
```

---

### 방법 7: **문서화**

#### 7.1 Architecture Decision Records (ADR)
```markdown
# ADR-001: ReviewSummaryData에 menuItems 추가

## 결정 사항
리뷰 요약에 메뉴명/음식명 필드 추가

## 영향 받는 파일
- servers/friendly/src/types/db.types.ts
- servers/friendly/src/routes/restaurant.routes.ts
- apps/shared/services/api.service.ts
- apps/web/src/components/Restaurant/RestaurantDetail.tsx
- apps/mobile/src/screens/RestaurantDetailScreen.tsx
```

#### 7.2 데이터 플로우 다이어그램
```
[AI Service] 
    ↓ (menuItems 추출)
[ReviewSummaryData]
    ↓ (JSON.stringify)
[review_summaries.summary_data]
    ↓ (JSON.parse)
[API Response]
    ↓ (타입 변환)
[Frontend ReviewSummary]
    ↓ (렌더링)
[UI Components]
```

---

## 🛠️ 즉시 적용 가능한 팁

### 1. **변경 전 체크리스트 만들기**
```bash
# 새 필드 추가 시 실행할 스크립트
./scripts/check-field-coverage.sh "menuItems"
```

### 2. **TODO 주석 활용**
```typescript
// TODO: [FIELD_ADD] menuItems 필드가 추가되면 여기도 업데이트 필요
const summaryData = {
  summary: parsed.summary || '',
  // ...
};
```

### 3. **IDE 북마크 활용**
- 수정이 필요한 위치에 북마크 설정
- 모든 북마크 완료 후 제거

### 4. **변경 로그 작성**
```markdown
# CHANGELOG.md

## [Unreleased]
### Added
- ReviewSummaryData에 menuItems 필드 추가
  - 영향 파일: [파일 목록]
  - PR: #123
```

---

## 📊 권장 워크플로우

```
1. 요구사항 정의
   ↓
2. 체크리스트 작성
   ↓
3. 타입 정의 업데이트 (중앙)
   ↓
4. TypeScript 컴파일 → 에러 확인
   ↓
5. 각 레이어 순차적 수정
   - DB/Repository
   - Service
   - API Routes
   - Frontend Types
   - UI Components
   ↓
6. 전체 검색으로 누락 확인
   ↓
7. 테스트 실행
   ↓
8. 수동 테스트
   ↓
9. 코드 리뷰
   ↓
10. 배포
```

---

## 🎯 이번 케이스 적용

### Case 1: menuItems 필드 추가 (완료)

- [x] 1. `db.types.ts` - ReviewSummaryData 타입 업데이트
- [x] 2. `restaurant.routes.ts` - ReviewSummarySchema 업데이트
- [x] 3. `review-summary.service.ts` - 프롬프트 업데이트
- [x] 4. `review-summary.service.ts` - Fallback 업데이트
- [x] 5. `restaurant.routes.ts` - API 응답 매핑 업데이트
- [x] 6. `api.service.ts` (Shared) - ReviewSummary 타입 업데이트
- [x] 7. Web UI - 컴포넌트 & 스타일 추가
- [x] 8. Mobile UI - 컴포넌트 & 스타일 추가
- [ ] 9. 테스트 작성
- [ ] 10. 문서 업데이트

---

### Case 2: 메뉴별 감정 분석 (향후 개선)

#### 📋 개요
리뷰 요약에서 추출된 메뉴명에 대해 긍정/부정 감정을 함께 저장하고 표시

#### 🎯 목표
메뉴명 + 감정(positive/negative/neutral) + 이유를 객체로 저장
```json
[
  {"name": "꼼장어", "sentiment": "positive", "reason": "맛있음"},
  {"name": "된장찌개", "sentiment": "negative", "reason": "너무 짬"},
  {"name": "삼겹살", "sentiment": "neutral", "reason": "평범함"}
]
```

#### 📊 데이터 구조 설계

```typescript
// servers/friendly/src/types/db.types.ts
export type MenuItemSentiment = 'positive' | 'negative' | 'neutral';

export interface MenuItemWithSentiment {
  name: string;                      // 메뉴명
  sentiment: MenuItemSentiment;      // 해당 메뉴에 대한 감정
  reason?: string;                   // 감정 이유 (10자 이내)
}

export interface ReviewSummaryData {
  summary: string;
  keyKeywords: string[];
  sentiment: 'positive' | 'negative' | 'neutral';  // 전체 리뷰 감정
  sentimentReason: string;
  satisfactionScore?: number;
  tips?: string[];
  menuItems?: MenuItemWithSentiment[];  // 📌 변경: 객체 배열
}
```

#### 🤖 AI 프롬프트 예시

```
7. ✨ 메뉴별 감정 분석:
   - "꼼장어가 맛있었다" → {"name": "꼼장어", "sentiment": "positive", "reason": "맛있음"}
   - "된장찌개는 너무 짰다" → {"name": "된장찌개", "sentiment": "negative", "reason": "너무 짬"}
   
   규칙:
   - 구체적인 메뉴명만 추출
   - 각 메뉴에 대한 감정 분석 (positive/negative/neutral)
   - reason은 10자 이내로 간단히
   - 최대 5개까지
```

#### 🎨 UI 디자인

```
🍽️ 언급된 메뉴:
[😊 꼼장어 (맛있음)]  [😞 된장찌개 (너무 짬)]  [😐 삼겹살 (평범함)]
```

**색상**:
- 😊 긍정: 초록색 (`#e8f5e9`)
- 😞 부정: 빨간색 (`#ffebee`)
- 😐 중립: 주황색 (`#fff3e0`)

#### 🔄 하위 호환성 전략

```typescript
// API 응답 매핑 시 기존 문자열 배열 → 객체 배열 변환
if (parsed.menuItems && Array.isArray(parsed.menuItems)) {
  if (typeof parsed.menuItems[0] === 'string') {
    // 기존 형식
    menuItems = parsed.menuItems.map((name: string) => ({
      name,
      sentiment: 'neutral' as MenuItemSentiment,
      reason: undefined
    }));
  } else {
    // 새 형식
    menuItems = parsed.menuItems;
  }
}
```

#### 📋 구현 체크리스트

**Phase 1: 백엔드**
- [ ] `db.types.ts` - MenuItemWithSentiment 타입 정의
- [ ] `db.types.ts` - ReviewSummaryData.menuItems 타입 변경
- [ ] `review-summary.service.ts` - 프롬프트 업데이트 (메뉴별 감정 분석 추가)
- [ ] `review-summary.service.ts` - Fallback 로직 업데이트
- [ ] `restaurant.routes.ts` - API 응답 매핑에 하위 호환성 로직 추가

**Phase 2: API 스키마**
- [ ] `restaurant.routes.ts` - MenuItemWithSentimentSchema 생성
- [ ] `restaurant.routes.ts` - ReviewSummarySchema 업데이트

**Phase 3: 프론트엔드**
- [ ] `api.service.ts` (Shared) - MenuItemWithSentiment 타입 추가
- [ ] `api.service.ts` (Shared) - ReviewSummary.menuItems 타입 변경
- [ ] Web - 감정별 색상 및 이모지 렌더링
- [ ] Web - 스타일 업데이트
- [ ] Mobile - 감정별 색상 및 이모지 렌더링
- [ ] Mobile - 스타일 업데이트
- [ ] 타입 가드 함수 추가 (하위 호환성)

**Phase 4: 테스트 & 배포**
- [ ] 기존 데이터 변환 테스트
- [ ] 새 데이터 렌더링 테스트
- [ ] Feature Flag 적용
- [ ] 단계적 배포 (Alpha 10% → Beta 50% → GA 100%)

#### 🎯 예상 효과
- 메뉴별 좋았던 점/아쉬웠던 점 한눈에 파악
- 메뉴별 긍정/부정 통계 분석 가능
- 추천 시스템 기반 구축

---

## 📚 추가 리소스

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Husky Git Hooks](https://typicode.github.io/husky/)
- [Conventional Commits](https://www.conventionalcommits.org/)
