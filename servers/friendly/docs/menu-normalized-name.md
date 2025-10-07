# Menu Normalized Name Feature

메뉴의 `normalized_name` 컬럼을 추가하여 AI가 처리한 정규화된 메뉴 이름을 저장할 수 있습니다.

## 📋 마이그레이션

### 마이그레이션 파일
- `004_add_normalized_name_to_menus.sql`

### 변경 사항
1. `menus` 테이블에 `normalized_name TEXT` 컬럼 추가
2. `idx_menus_normalized_name` 인덱스 추가

### 적용 방법

#### 방법 1: 자동 마이그레이션 (서버 시작 시)
서버가 시작되면 자동으로 마이그레이션이 적용됩니다.

#### 방법 2: 수동 마이그레이션
```bash
cd servers/friendly
node scripts/apply-migration.js
```

#### 방법 3: DB 리셋 (개발 환경)
```bash
cd servers/friendly
npm run db:reset
```

## 🔧 사용 방법

### 1. 메뉴 저장 시 normalized_name 포함

```typescript
import restaurantRepository from '../db/repositories/restaurant.repository';

const menuInputs = [
  {
    name: '김치찌개',
    description: '매콤한 김치찌개',
    price: '8000원',
    image: null,
    normalized_name: '김치찌개'  // ← AI가 정규화한 이름
  },
  {
    name: '김치찜개(1인분)',
    description: null,
    price: '7000원',
    image: null,
    normalized_name: '김치찌개'  // ← 동일한 메뉴로 정규화
  }
];

await restaurantRepository.saveMenus(restaurantId, menuInputs);
```

### 2. 기존 메뉴 업데이트

```typescript
// 단일 메뉴 업데이트
await restaurantRepository.updateMenuNormalizedName(
  menuId, 
  '김치찌개'
);

// 여러 메뉴 일괄 업데이트
await restaurantRepository.updateMenusNormalizedNames([
  { menuId: 1, normalizedName: '김치찌개' },
  { menuId: 2, normalizedName: '김치찌개' },
  { menuId: 3, normalizedName: '된장찌개' }
]);
```

### 3. AI로 메뉴 정규화 예시

```typescript
import { BaseLocalOllamaService } from '../services/ollama/local-ollama.service';
import { createLocalConfig } from '../services/ollama/ollama.config';

class MenuNormalizationService extends BaseLocalOllamaService {
  async normalizeMenuName(menuName: string): Promise<string | null> {
    const prompt = `
다음 메뉴 이름을 정규화해주세요. 괄호, 특수문자, 수량 표시를 제거하고 기본 메뉴명만 반환하세요.

입력: ${menuName}
출력 형식: {"normalized_name": "정규화된_메뉴명"}
`;

    const response = await this.generate(prompt, {
      temperature: 0.3,
      num_ctx: 512
    });

    const result = this.parseJsonResponse<{ normalized_name: string }>(response);
    return result?.normalized_name || null;
  }

  async normalizeMenus(restaurantId: number): Promise<void> {
    // 1. 메뉴 조회
    const menus = await restaurantRepository.findMenusByRestaurantId(restaurantId);

    // 2. AI로 정규화
    const updates = [];
    for (const menu of menus) {
      const normalizedName = await this.normalizeMenuName(menu.name);
      if (normalizedName) {
        updates.push({ menuId: menu.id, normalizedName });
      }
    }

    // 3. DB 업데이트
    await restaurantRepository.updateMenusNormalizedNames(updates);

    console.log(`✅ ${updates.length}개 메뉴 정규화 완료`);
  }
}

// 사용
const config = createLocalConfig();
const service = new MenuNormalizationService(config);
await service.normalizeMenus(restaurantId);
```

### 4. 정규화된 메뉴로 검색

```typescript
// SQL 예시
const menus = await db.all(
  `SELECT * FROM menus 
   WHERE normalized_name = ? 
   AND restaurant_id IN (?)`,
  ['김치찌개', restaurantIds.join(',')]
);
```

## 📊 데이터베이스 스키마

### Before
```sql
CREATE TABLE menus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price TEXT NOT NULL,
  image TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);
```

### After
```sql
CREATE TABLE menus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price TEXT NOT NULL,
  image TEXT,
  normalized_name TEXT,  -- ← 추가됨
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);

CREATE INDEX idx_menus_normalized_name ON menus(normalized_name);  -- ← 추가됨
```

## 🎯 활용 사례

1. **메뉴 통합 검색**
   - "김치찌개", "김치찜개(1인분)", "김치찜개 1인" → 모두 "김치찌개"로 검색

2. **메뉴 통계**
   - 동일 메뉴를 제공하는 음식점 개수
   - 가장 인기있는 메뉴 (정규화 기준)

3. **가격 비교**
   - 동일 메뉴의 가격 비교

4. **추천 시스템**
   - 정규화된 메뉴 기반 음식점 추천

## 🔍 예시 쿼리

```sql
-- 1. 정규화된 메뉴별 음식점 개수
SELECT 
  normalized_name,
  COUNT(DISTINCT restaurant_id) as restaurant_count,
  AVG(CAST(REPLACE(price, '원', '') AS INTEGER)) as avg_price
FROM menus
WHERE normalized_name IS NOT NULL
GROUP BY normalized_name
ORDER BY restaurant_count DESC
LIMIT 10;

-- 2. 특정 메뉴를 파는 음식점 찾기
SELECT r.name, r.address, m.price
FROM restaurants r
JOIN menus m ON r.id = m.restaurant_id
WHERE m.normalized_name = '김치찌개'
ORDER BY r.name;

-- 3. 아직 정규화되지 않은 메뉴
SELECT id, restaurant_id, name
FROM menus
WHERE normalized_name IS NULL
LIMIT 100;
```

## ✅ 구현 완료 체크리스트

- [x] 마이그레이션 파일 생성 (`004_add_normalized_name_to_menus.sql`)
- [x] 타입 정의 업데이트 (`MenuDB`, `MenuInput`)
- [x] Repository 메서드 추가 (`updateMenuNormalizedName`, `updateMenusNormalizedNames`)
- [x] INSERT 쿼리 업데이트 (normalized_name 컬럼 포함)
- [x] 인덱스 생성 (검색 성능 최적화)
- [x] 사용 예시 문서 작성

## 📚 참고

- Ollama 서비스: `servers/friendly/src/services/ollama/`
- Restaurant Repository: `servers/friendly/src/db/repositories/restaurant.repository.ts`
- 타입 정의: `servers/friendly/src/types/db.types.ts`
