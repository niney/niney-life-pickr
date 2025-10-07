# Menu Normalization with AI

AI를 사용하여 메뉴명을 자동으로 정규화하는 기능입니다.

## 🎯 목적

크롤링한 메뉴명에서 브랜드명, 특선 표시, 가격 정보 등을 제거하고 순수한 음식명과 메뉴명을 추출합니다.

### 예시

| 원본 메뉴명 | 음식명 | 메뉴명 | normalized_name |
|------------|--------|--------|----------------|
| 오봉집 LA갈비 600G 한상(특선) | LA갈비 | LA갈비 600G 한상 | LA갈비\|LA갈비 600G 한상 |
| 김치찌개 | 김치찌개 | 김치찌개 | 김치찌개 |
| 맘스터치 싸이버거 세트 | 싸이버거 | 싸이버거 세트 | 싸이버거\|싸이버거 세트 |
| 점심특선 보쌈(대) | 보쌈 | 보쌈(대) | 보쌈\|보쌈(대) |

## 🔄 자동 정규화 흐름

메뉴 저장 시 자동으로 AI 정규화가 적용됩니다:

```
1. POST /api/crawler/restaurant { url, crawlMenus: true }
   ↓
2. naverCrawlerService.crawlRestaurant()
   → menuItems: MenuItem[]
   ↓
3. RestaurantService.crawlAndSaveRestaurant()
   ↓
4. 🤖 normalizeMenuItems(menuItems)  ← AI 정규화
   → menuItems with normalizedName
   ↓
5. convertToMenuInputs()
   → normalized_name 포함
   ↓
6. restaurantRepository.saveMenus()
   ↓
7. DB 저장 완료
```

## 📋 AI 정규화 규칙

1. **브랜드명 제거**: 오봉집, 맘스터치, BBQ 등
2. **음식명 추출**: 순수한 음식 이름만 (LA갈비, 보쌈, 싸이버거, 김치찌개 등)
3. **메뉴명 추출**: 용량, 구성 등이 포함된 전체 메뉴명 (LA갈비 600G 한상, 보쌈(대) 등)
4. **부가 설명 제거**: 특선, 점심특선, 추천 등
5. **가격 정보 제거**: 가격 표시 제거
6. **동일 처리**: 음식명과 메뉴명이 같으면 하나만 저장

## 🚀 사용 방법

### 1. 자동 정규화 (기본)

메뉴 크롤링 시 자동으로 적용됩니다:

```bash
POST /api/crawler/restaurant
{
  "url": "https://map.naver.com/...",
  "crawlMenus": true
}
```

### 2. 프로그래매틱 사용

```typescript
import { normalizeMenuItems } from './services/menu-normalization.service';
import type { MenuItem } from './types/crawler.types';

const menuItems: MenuItem[] = [
  { name: '오봉집 LA갈비 600G 한상(특선)', price: '45000원' },
  { name: '김치찌개', price: '8000원' }
];

// Local Ollama 사용
const normalized = await normalizeMenuItems(menuItems, false);

// Cloud Ollama 사용
const normalized = await normalizeMenuItems(menuItems, true);

console.log(normalized[0].normalizedName); // "LA갈비|LA갈비 600G 한상"
console.log(normalized[1].normalizedName); // "김치찌개"
```

### 3. 테스트 실행

```bash
cd servers/friendly
npx ts-node src/services/test-menu-normalization.ts
```

## 📊 데이터 구조

### MenuItem (크롤링 결과)

```typescript
interface MenuItem {
  name: string;              // 원본 메뉴명
  description?: string;
  price: string;
  image?: string;
  normalizedName?: string;   // AI가 추가한 정규화 결과
}
```

### MenuInput (DB 저장)

```typescript
interface MenuInput {
  name: string;
  description?: string | null;
  price: string;
  image?: string | null;
  normalized_name?: string | null;  // DB에 저장됨
}
```

### MenuDB (DB 엔티티)

```typescript
interface MenuDB {
  id: number;
  restaurant_id: number;
  name: string;
  description: string | null;
  price: string;
  image: string | null;
  normalized_name: string | null;  // "음식명|메뉴명" 또는 "음식명"
  created_at: string;
}
```

## 🔍 normalized_name 파싱

```typescript
// normalized_name에서 음식명과 메뉴명 추출
function parseNormalizedName(normalizedName: string): { foodName: string; menuName: string } {
  const parts = normalizedName.split('|');
  
  if (parts.length === 2) {
    return {
      foodName: parts[0],   // "LA갈비"
      menuName: parts[1]    // "LA갈비 600G 한상"
    };
  } else {
    // 음식명과 메뉴명이 같은 경우
    return {
      foodName: parts[0],   // "김치찌개"
      menuName: parts[0]    // "김치찌개"
    };
  }
}
```

## 🔧 설정

### Local vs Cloud Ollama

기본적으로 **Local Ollama**를 사용합니다:

```typescript
// restaurant.service.ts에서
const normalizedMenuItems = await normalizeMenuItems(
  restaurantInfo.menuItems, 
  false  // false = Local Ollama, true = Cloud Ollama
);
```

Cloud Ollama 사용하려면:

```typescript
const normalizedMenuItems = await normalizeMenuItems(
  restaurantInfo.menuItems, 
  true  // Cloud 사용
);
```

### AI 모델 설정

`config/base.yml`에서 설정:

```yaml
ollama:
  local:
    url: "http://localhost:11434"
    model: "gemma3:27b"  # 정규화에 사용할 모델
    timeout: 60000
  
  cloud:
    host: "https://ollama.com"
    model: "gpt-oss:20b"
    timeout: 60000
    apiKey: "your-api-key"
```

## 📈 활용 예시

### 1. 음식명으로 검색

```sql
-- "김치찌개"를 파는 음식점 찾기
SELECT r.name, r.address, m.name, m.price
FROM restaurants r
JOIN menus m ON r.id = m.restaurant_id
WHERE m.normalized_name LIKE '김치찌개%'  -- "김치찌개" 또는 "김치찌개|..."
ORDER BY r.name;
```

### 2. 동일 메뉴 가격 비교

```sql
-- LA갈비 가격 비교
SELECT 
  r.name as restaurant_name,
  m.name as menu_name,
  m.price,
  m.normalized_name
FROM restaurants r
JOIN menus m ON r.id = m.restaurant_id
WHERE m.normalized_name LIKE 'LA갈비%'
ORDER BY CAST(REPLACE(REPLACE(m.price, '원', ''), ',', '') AS INTEGER) ASC;
```

### 3. 인기 음식 통계

```sql
-- 가장 많이 판매되는 음식 TOP 10
SELECT 
  CASE 
    WHEN normalized_name LIKE '%|%' 
    THEN SUBSTR(normalized_name, 1, INSTR(normalized_name, '|') - 1)
    ELSE normalized_name
  END as food_name,
  COUNT(*) as restaurant_count,
  AVG(CAST(REPLACE(REPLACE(price, '원', ''), ',', '') AS INTEGER)) as avg_price
FROM menus
WHERE normalized_name IS NOT NULL
GROUP BY food_name
ORDER BY restaurant_count DESC
LIMIT 10;
```

## ⚡ 성능 최적화

### 배치 처리

한 번에 여러 메뉴를 처리하여 AI 호출 횟수를 줄입니다:

```typescript
// ❌ 비효율적 (메뉴마다 AI 호출)
for (const menu of menus) {
  const result = await normalizeOneMenu(menu);
}

// ✅ 효율적 (한 번의 AI 호출로 모든 메뉴 처리)
const results = await normalizeMenuItems(menus);
```

### 캐싱 (향후 개선)

동일한 메뉴명에 대해서는 캐시된 결과 사용:

```typescript
// TODO: 구현 예정
const cache = new Map<string, string>();

if (cache.has(menuName)) {
  return cache.get(menuName);
}

const normalized = await normalizeMenu(menuName);
cache.set(menuName, normalized);
```

## 🐛 트러블슈팅

### AI 응답 파싱 실패

AI 응답을 파싱할 수 없는 경우 원본 메뉴명을 사용합니다:

```typescript
// Fallback: 원본 메뉴명 사용
{
  foodName: "원본 메뉴명",
  menuName: "원본 메뉴명",
  normalizedName: "원본 메뉴명"
}
```

### Ollama 서버 연결 실패

```bash
# Ollama 서버 실행 확인
ollama serve

# 모델 설치 확인
ollama list

# 모델 다운로드
ollama pull gemma3:27b
```

### 타임아웃 오류

`config/base.yml`에서 timeout 증가:

```yaml
ollama:
  local:
    timeout: 120000  # 2분
```

## 📚 관련 문서

- [Ollama Service](../services/ollama/README.md)
- [Menu Normalized Name](./menu-normalized-name.md)
- [Restaurant Service](../services/restaurant.service.ts)

## ✅ 구현 완료 체크리스트

- [x] 메뉴 정규화 서비스 구현
- [x] AI 프롬프트 작성
- [x] MenuItem 타입에 normalizedName 추가
- [x] RestaurantService에 자동 정규화 통합
- [x] DB 저장 시 normalized_name 포함
- [x] 테스트 스크립트 작성
- [x] 사용 가이드 작성

## 🎉 완료!

메뉴 크롤링 시 자동으로 AI가 메뉴를 정규화합니다!
