# 레스토랑 기능 개발 워크플로우

**목적**: 레스토랑 관련 새 기능을 풀스택으로 추가할 때 사용하는 가이드 (백엔드 → Shared → 웹 → 모바일)

**복잡도**: 중간 | **예상 소요 시간**: 기능당 2-4시간

---

## 🎯 언제 이 스킬을 사용하나요?

사용자 요청에 다음이 포함될 때 이 스킬을 실행:
- "레스토랑 검색 기능 추가해줘"
- "레스토랑 필터/정렬 추가"
- "Add restaurant search/filter/sort"
- "레스토랑 API 수정"
- "레스토랑 목록 UI 업데이트"

**키워드**: `restaurant`, `레스토랑`, `full stack`, `API + UI`

---

## ✅ 이 스킬이 다루는 것

- 데이터베이스 마이그레이션 (SQLite)
- 백엔드 API 업데이트 (Fastify)
- Shared 레이어 업데이트 (Hooks, API Service)
- 웹 UI 업데이트 (React Native Web)
- 모바일 UI 업데이트 (React Native)
- 테스트 및 문서화

## ❌ 다루지 않는 것

- 프로젝트 초기 설정 → [ARCHITECTURE.md](../../docs/claude/00-core/ARCHITECTURE.md) 참고
- 배포 → [DEVELOPMENT.md](../../docs/claude/00-core/DEVELOPMENT.md) 참고
- 상세 API 문서 → [FRIENDLY-RESTAURANT.md](../../docs/claude/04-friendly/FRIENDLY-RESTAURANT.md) 참고

---

## 📁 프로젝트 구조 빠른 참조

```
niney-life-pickr/
├── servers/friendly/          # 백엔드 (Fastify + SQLite)
│   ├── src/db/migrations/     # 데이터베이스 마이그레이션
│   ├── src/db/repositories/   # 데이터 접근 계층
│   └── src/routes/            # API 라우트
├── apps/shared/               # 공통 로직 (웹 + 모바일)
│   ├── hooks/                 # 커스텀 React 훅
│   └── services/              # API 서비스
├── apps/web/                  # 웹 UI (React Native Web)
│   └── src/components/Restaurant/
└── apps/mobile/               # 모바일 UI (React Native)
    └── src/screens/RestaurantListScreen.tsx
```

---

## 🌲 빠른 의사결정 트리

작업 시작 전에 다음 질문에 답하기:

```
1. 기능에 데이터베이스 변경이 필요한가?
   ├─ 예 → 마이그레이션 생성 → 리포지토리 업데이트
   └─ 아니오 → 2단계로

2. 기능에 새로운 API 엔드포인트가 필요한가?
   ├─ 예 → 새 라우트 + 스키마 추가
   └─ 아니오 → 기존 라우트 수정

3. 프론트엔드에 새로운 상태가 필요한가?
   ├─ 예 → useRestaurantList 훅 업데이트
   └─ 아니오 → 기존 상태 사용

4. UI에 영향을 주는가?
   ├─ 예 → Shared → 웹 → 모바일 업데이트
   └─ 아니오 → 완료, 문서만 업데이트
```

---

## 📋 레이어별 체크리스트

### 🗄️ 레이어 1: 데이터베이스 (필요한 경우)

**언제**: 새 컬럼, 인덱스, 테이블이 필요할 때

**파일**: `servers/friendly/src/db/migrations/{번호}_{설명}.sql`

**단계**:
1. ✅ 가장 높은 마이그레이션 번호 찾기 (예: `005`)
2. ✅ 새 파일 생성: `006_add_restaurant_{feature}.sql`
3. ✅ 마이그레이션 작성:
   ```sql
   -- Add index for performance
   CREATE INDEX IF NOT EXISTS idx_restaurants_{column_name} ON restaurants({column_name});
   ```
4. ✅ 서버 재시작으로 적용: `cd servers/friendly && npm run dev`
5. ✅ 로그에서 확인: "All migrations completed"

**도구**: 마이그레이션 파일에 `Write` 도구 사용

---

### ⚙️ 레이어 2: 백엔드 API

#### 2A. 리포지토리 레이어

**파일**: `servers/friendly/src/db/repositories/restaurant.repository.ts`

**단계**:
1. ✅ 현재 `findAll()` 및 `count()` 메서드 읽기
2. ✅ 메서드 시그니처에 새 파라미터 추가:
   ```typescript
   async findAll(
     limit: number = 20,
     offset: number = 0,
     category?: string,
     newParam?: string  // ADD THIS
   ): Promise<RestaurantDB[]>
   ```
3. ✅ SQL 쿼리 로직 업데이트:
   ```typescript
   const conditions: string[] = [];
   const params: any[] = [];

   if (newParam && newParam.trim()) {
     conditions.push('column_name LIKE ?');
     params.push(`%${newParam.trim()}%`);
   }

   if (conditions.length > 0) {
     query += ' WHERE ' + conditions.join(' AND ');
   }
   ```
4. ✅ `count()` 메서드도 동일한 로직으로 업데이트

**도구**:
- `Read` → 리포지토리 파일 먼저 읽기
- `Edit` → 메서드 수정

#### 2B. 라우트 레이어

**파일**: `servers/friendly/src/routes/restaurant.routes.ts`

**단계**:
1. ✅ 현재 라우트 스키마 읽기
2. ✅ TypeBox 스키마에 새 파라미터 추가:
   ```typescript
   querystring: Type.Object({
     // ... existing params
     newParam: Type.Optional(Type.String({
       description: 'Description here',
       minLength: 1,
       maxLength: 100
     }))
   })
   ```
3. ✅ 요청 핸들러 업데이트:
   ```typescript
   const { limit, offset, category, newParam } = request.query as {
     // ... add type
     newParam?: string;
   };

   const [restaurants, total] = await Promise.all([
     restaurantRepository.findAll(limit, offset, category, newParam),
     restaurantRepository.count(category, newParam)
   ]);
   ```

**도구**:
- `Read` → 라우트 파일 읽기
- `Edit` → 스키마와 핸들러 업데이트

#### 2C. 백엔드 API 테스트

**명령어**:
```bash
# curl로 테스트
curl "http://localhost:4000/api/restaurants?newParam=test&limit=5"

# 또는 Swagger UI 사용
open http://localhost:4000/docs
```

**예상 결과**: 필터링된 결과와 함께 `200 OK`

**도구**: `Bash` → curl 명령어 실행

---

### 🔗 레이어 3: Shared 레이어

#### 3A. API 서비스

**파일**: `apps/shared/services/api.service.ts`

**단계**:
1. ✅ `getRestaurants()` 메서드 읽기
2. ✅ 새 파라미터 추가:
   ```typescript
   async getRestaurants(
     limit: number = 1000,
     offset: number = 0,
     category?: string,
     newParam?: string  // ADD THIS
   ): Promise<ApiResponse<RestaurantListResponse>> {
     let url = `/api/restaurants?limit=${limit}&offset=${offset}`;

     if (category) {
       url += `&category=${encodeURIComponent(category)}`;
     }

     // ADD THIS BLOCK
     if (newParam && newParam.trim()) {
       url += `&newParam=${encodeURIComponent(newParam.trim())}`;
     }

     return this.request<RestaurantListResponse>(url, { method: 'GET' });
   }
   ```

**도구**:
- `Read` → api.service.ts 읽기
- `Edit` → 파라미터 추가

#### 3B. 커스텀 훅

**파일**: `apps/shared/hooks/useRestaurantList.ts`

**단계**:
1. ✅ 훅 파일 읽기
2. ✅ 새 상태 추가:
   ```typescript
   const [newState, setNewState] = useState('')
   ```
3. ✅ `fetchRestaurants()` 업데이트:
   ```typescript
   const response = await apiService.getRestaurants(
     limit,
     offset,
     selectedCategory || undefined,
     newState || undefined  // Pass new state
   )
   ```
4. ✅ 디바운스 효과 추가 (검색/필터인 경우):
   ```typescript
   useEffect(() => {
     const timer = setTimeout(() => {
       fetchRestaurants()
     }, 300) // 300ms debounce

     return () => clearTimeout(timer)
   }, [newState])
   ```
5. ✅ 반환 객체 업데이트:
   ```typescript
   return {
     // ... existing returns
     newState,
     setNewState,
   }
   ```

**도구**:
- `Read` → 훅 파일 읽기
- `Edit` → 상태 추가, fetch 업데이트, effect 추가

---

### 🖥️ 레이어 4: 웹 UI

#### 4A. 컴포넌트 Props

**파일**: `apps/web/src/components/Restaurant/RestaurantList.tsx`

**단계**:
1. ✅ 컴포넌트 파일 읽기
2. ✅ `RestaurantListProps` 인터페이스 업데이트:
   ```typescript
   interface RestaurantListProps {
     // ... existing props
     newState: string
     setNewState: (value: string) => void
   }
   ```
3. ✅ 컴포넌트 파라미터 업데이트:
   ```typescript
   const RestaurantList: React.FC<RestaurantListProps> = ({
     // ... existing params
     newState,
     setNewState,
   }) => {
   ```

**도구**:
- `Read` → 컴포넌트 읽기
- `Edit` → 인터페이스와 파라미터 업데이트

#### 4B. UI 요소 추가

**같은 파일에**: 새 기능용 UI 추가

```tsx
{/* Add this UI block */}
<View style={styles.newFeatureContainer}>
  <TextInput
    style={[styles.input, { borderColor: colors.border, color: colors.text }]}
    placeholder="Placeholder text..."
    placeholderTextColor={colors.textSecondary}
    value={newState}
    onChangeText={setNewState}
  />
  {newState.length > 0 && (
    <TouchableOpacity onPress={() => setNewState('')} style={styles.clearButton}>
      <FontAwesomeIcon icon={faTimes} size={16} color={colors.textSecondary} />
    </TouchableOpacity>
  )}
</View>
```

**스타일 추가**:
```typescript
const styles = StyleSheet.create({
  // ... existing styles
  newFeatureContainer: {
    marginBottom: 16,
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: 14,
    padding: 4,
  },
})
```

**도구**: `Edit` → UI 및 스타일 추가

#### 4C. 부모 컴포넌트

**파일**: `apps/web/src/components/Restaurant.tsx`

**단계**:
1. ✅ 부모 컴포넌트 읽기
2. ✅ 훅에서 새 상태 추출:
   ```typescript
   const {
     // ... existing state
     newState,
     setNewState,
   } = restaurantState
   ```
3. ✅ 자식 컴포넌트에 전달:
   ```typescript
   <RestaurantList
     // ... existing props
     newState={newState}
     setNewState={setNewState}
   />
   ```
4. ✅ 필요시 `DesktopLayout` 인터페이스 업데이트

**도구**:
- `Read` → 부모 컴포넌트 읽기
- `Edit` → 상태 추출 및 props 전달

---

### 📱 레이어 5: 모바일 UI

**파일**: `apps/mobile/src/screens/RestaurantListScreen.tsx`

**단계**:
1. ✅ 스크린 파일 읽기
2. ✅ 훅에서 새 상태 추출:
   ```typescript
   const {
     // ... existing
     newState,
     setNewState,
   } = useRestaurantList({ /* callbacks */ })
   ```
3. ✅ UI 추가 (웹과 동일한 패턴):
   ```tsx
   <View style={styles.newFeatureContainer}>
     <TextInput
       style={[styles.input, { /* theme colors */ }]}
       placeholder="Placeholder text..."
       placeholderTextColor={colors.textSecondary}
       value={newState}
       onChangeText={setNewState}
       keyboardAppearance={theme === 'dark' ? 'dark' : 'light'}
     />
     {newState.length > 0 && (
       <TouchableOpacity onPress={() => setNewState('')} style={styles.clearButton}>
         <Text style={{ fontSize: 16, color: colors.textSecondary }}>✕</Text>
       </TouchableOpacity>
     )}
   </View>
   ```
4. ✅ `StyleSheet.create()`에 스타일 추가

**도구**:
- `Read` → 스크린 파일 읽기
- `Edit` → 상태 추출, UI 추가, 스타일 추가

---

## ✅ 검증 단계

각 레이어 완료 후 검증:

### 백엔드 검증
```bash
# 서버 실행 중?
cd servers/friendly && npm run dev

# API 작동?
curl "http://localhost:4000/api/restaurants?newParam=test"

# 예상: 데이터와 함께 200 OK
```

### Shared 검증
```bash
# TypeScript 컴파일?
cd apps/shared && npm run type-check

# 에러 없음? → 진행
```

### 웹 검증
```bash
# 웹 앱 시작
cd apps/web && npm run dev

# 브라우저 열기
open http://localhost:3000/restaurant

# 테스트:
# 1. UI가 올바르게 렌더링되는가
# 2. 기능이 예상대로 동작하는가
# 3. 콘솔 에러가 없는가
```

### 모바일 검증
```bash
# 모바일 앱 시작
cd apps/mobile && npm start

# iOS/Android 테스트
npm run ios
# 또는
npm run android

# 테스트:
# 1. UI가 올바르게 렌더링되는가
# 2. 기능이 동작하는가
# 3. 빨간 화면 에러가 없는가
```

---

## 🚨 자주 발생하는 문제와 해결법

### ❌ TypeBox 검증 실패 (400 Bad Request)
**원인**: 라우트에서 스키마를 업데이트하지 않음
**해결**: 라우트 스키마의 `Type.Object({ ... })`에 파라미터 추가

### ❌ React Props 타입 에러
**원인**: 부모에서 props를 전달하지 않음
**해결**:
1. 훅이 새 상태를 export하는지 확인
2. 부모가 훅에서 추출하는지 확인
3. 부모가 자식에게 전달하는지 확인
4. 자식 인터페이스에 prop이 포함되었는지 확인

### ❌ API가 이전 데이터 반환
**원인**: 코드 변경 후 서버를 재시작하지 않음
**해결**:
```bash
cd servers/friendly
npm run kill  # 이전 프로세스 종료
npm run dev   # 재시작
```

### ❌ 훅이 다시 fetch하지 않음
**원인**: useEffect 의존성 배열 누락
**해결**: 새 상태를 useEffect 의존성 배열에 추가

---

## 🛠️ 사용할 Claude Code 도구

### 🔍 구현 전
```typescript
// 기존 패턴 찾기
Grep: pattern="useRestaurantList", output_mode="files_with_matches"
Grep: pattern="getRestaurants", output_mode="files_with_matches"

// 모든 레스토랑 파일 찾기
Glob: pattern="**/*Restaurant*.{ts,tsx}"
```

### 📖 구현 중
```typescript
// 편집 전 파일 읽기
Read: file_path="servers/friendly/src/db/repositories/restaurant.repository.ts"
Read: file_path="apps/shared/hooks/useRestaurantList.ts"

// 파일 편집
Edit: old_string="...", new_string="..."

// 즉시 테스트
Bash: command="curl http://localhost:4000/api/restaurants?test=value"
```

### ✅ 구현 후
```typescript
// 테스트 실행
Bash: command="cd servers/friendly && npm test"
Bash: command="cd apps/web && npm run type-check"

// git 상태 확인
Bash: command="git status"
```

---

## 💡 예시: 레스토랑 이름 검색 추가

**사용자 요청**: "레스토랑 이름 검색 기능 추가해줘"

**빠른 단계**:
1. ✅ **DB**: `name` 컬럼에 인덱스를 추가하는 `005_add_restaurant_name_index.sql` 생성
2. ✅ **리포지토리**: `findAll()`과 `count()`에 `searchName?: string` 추가
3. ✅ **라우트**: TypeBox 스키마에 `searchName` 추가, 리포지토리에 전달
4. ✅ **API 서비스**: `getRestaurants()`에 `searchName` 파라미터 추가
5. ✅ **훅**: `searchName` 상태 추가, `fetchRestaurants()` 업데이트, 디바운스 effect 추가
6. ✅ **웹 UI**: 검색 입력창 추가, 부모에서 props 전달
7. ✅ **모바일 UI**: 검색 입력창 추가, 훅에서 추출
8. ✅ **테스트**: 백엔드 curl, 웹 브라우저, 모바일 시뮬레이터

**소요 시간**: 약 2시간

---

## 📚 관련 문서

- **아키텍처**: [ARCHITECTURE.md](../../docs/claude/00-core/ARCHITECTURE.md)
- **데이터베이스**: [DATABASE.md](../../docs/claude/00-core/DATABASE.md)
- **백엔드 API**: [FRIENDLY-RESTAURANT.md](../../docs/claude/04-friendly/FRIENDLY-RESTAURANT.md)
- **웹 UI**: [WEB-RESTAURANT.md](../../docs/claude/01-web/WEB-RESTAURANT.md)
- **모바일 UI**: [MOBILE-RESTAURANT-LIST.md](../../docs/claude/02-mobile/MOBILE-RESTAURANT-LIST.md)
- **테스팅**: [FRIENDLY-TESTING.md](../../docs/claude/04-friendly/FRIENDLY-TESTING.md)

---

## 🎬 스킬 호출 방법

사용자가 다음과 같이 말할 때:
- "Add restaurant [feature]"
- "레스토랑 [기능] 추가"
- "Modify restaurant API"
- "Update restaurant list"

**Claude는**:
1. 이 스킬을 체크리스트로 사용
2. 레이어별 접근 방식 따름
3. 각 레이어 완료 후 검증
4. 필요시 상세 문서 참조
5. 진행 상황 추적을 위한 TODO 리스트 생성

**예상 작업 시간**: 복잡도에 따라 2-4시간

---

**버전**: 2.0 (skill-creator로 정제됨)
**마지막 업데이트**: 2025-10-29
**관리자**: Claude Code
