# Niney Life Pickr

크로스 플랫폼 생활 의사결정 애플리케이션

## 프로젝트 구조

- **Web**: React + React Native Web + Vite
- **Mobile**: React Native (Android & iOS)
- **Shared**: 웹/모바일 공유 컴포넌트
- **Backend**: Node.js (Fastify) + Python (FastAPI)

자세한 아키텍처는 [CLAUDE.md](./CLAUDE.md)를 참조하세요.

## 환경 설정

### 포트 구성
- Web: 3000
- Friendly Server: 4000
- Smart Server: 5000

### 환경 변수
```bash
NODE_ENV=development    # development | test | production
PORT=4000              # 서버 포트
HOST=0.0.0.0          # 네트워크 접근 허용
LOG_LEVEL=info        # debug | info | warn | error
CORS_ORIGIN=*         # CORS 허용 도메인
```

### 네트워크 접근 (모바일)
- **Android 에뮬레이터**: `http://10.0.2.2:4000`
- **iOS 시뮬레이터**: `http://localhost:4000`
- **실제 디바이스**: 로컬 IP 사용 (예: `http://192.168.0.100:4000`)

### 설정 파일
- `config/base.yml` - 기본 설정
- `config/test.yml` - 테스트 환경
- `config/production.yml` - 프로덕션 환경

## 시작하기

### 필수 요구사항

- Node.js 18+
- Python 3.10+
- npm 또는 yarn

### 설치

```bash
# 웹 애플리케이션
cd apps/web
npm install

# 모바일 애플리케이션
cd apps/mobile
npm install

# Friendly 서버 (Node.js)
cd servers/friendly
npm install

# Smart 서버 (Python)
cd servers/smart
pip install -e .
```

## 개발 서버 실행

### 웹 애플리케이션
```bash
cd apps/web
npm run dev        # http://localhost:3000
```

### 모바일 애플리케이션
```bash
cd apps/mobile
npm start          # Metro bundler 시작
npm run android    # Android 실행
npm run ios        # iOS 실행
```

### Friendly 서버 (Node.js)
```bash
cd servers/friendly
npm run dev        # http://localhost:4000
npm run dev:clean  # 기존 서버 종료 후 시작
```

### Smart 서버 (Python)
```bash
cd servers/smart
python scripts/dev.py    # http://localhost:5000
```

## API 문서

Friendly 서버 실행 후 다음 URL에서 API 문서를 확인할 수 있습니다:

- **Swagger UI**: http://localhost:4000/docs
- **Scalar API Reference**: http://localhost:4000/reference
- **OpenAPI Spec**: http://localhost:4000/api/docs/spec

## 테스트

### 웹 E2E 테스트 (Playwright)
```bash
cd apps/web
npm run test:e2e           # Headless 모드
npm run test:e2e:ui        # UI 모드 (권장)
npm run test:e2e:headed    # Headed 모드
npm run test:e2e:debug     # 디버그 모드
```

### 모바일 E2E 테스트 (Maestro)

Maestro 설치가 필요합니다:
```bash
# macOS/Linux
curl -Ls "https://get.maestro.mobile.dev" | bash

# Windows (WSL2 필요)
# WSL2에서 위 명령어 실행
```

테스트 실행:
```bash
cd apps/mobile
npm run test:e2e         # 모든 E2E 테스트
npm run test:e2e:smoke   # Smoke 테스트
npm run test:e2e:login   # 로그인 플로우
npm run test:e2e:studio  # Maestro Studio (인터랙티브)
```

### Friendly 서버 테스트 (Vitest)
```bash
cd servers/friendly
npm test                  # Watch 모드
npm run test:run          # 1회 실행
npm run test:ui           # Vitest UI
npm run test:coverage     # 커버리지 리포트
npm run test:unit         # 유닛 테스트만
npm run test:integration  # 통합 테스트만

# 특정 테스트 파일 실행
npm test -- src/__tests__/integration/auth.routes.test.ts
```

### Smart 서버 테스트 (pytest)
```bash
cd servers/smart
pytest                    # 모든 테스트
pytest tests/unit         # 유닛 테스트만
pytest tests/integration  # 통합 테스트만
pytest --cov=src          # 커버리지 리포트
pytest -m unit            # unit 마크 테스트만
pytest -m integration     # integration 마크 테스트만
```

## API 테스트 예제

### 인증 (Authentication)

테스트 계정:
- Email: `niney@ks.com`
- Password: `tester`

```bash
# 회원가입
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"password123"}'

# 로그인
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"niney@ks.com","password":"tester"}'

# 사용자 목록
curl http://localhost:4000/api/auth/users
```

### Naver Map 크롤러

```bash
# 레스토랑 정보 크롤링
curl -X POST http://localhost:4000/api/crawler/restaurant \
  -H "Content-Type: application/json" \
  -d '{"url":"https://map.naver.com/p/entry/place/1234567890","crawlMenus":true}'

# 리뷰 크롤링
curl -X POST http://localhost:4000/api/crawler/reviews \
  -H "Content-Type: application/json" \
  -d '{"url":"https://m.place.naver.com/restaurant/1234567890/review/visitor?reviewSort=recent"}'
```

### 레스토랑 데이터 조회

```bash
# 카테고리별 레스토랑 수
curl http://localhost:4000/api/restaurants/categories

# 레스토랑 목록 (페이지네이션)
curl "http://localhost:4000/api/restaurants?limit=10&offset=0"

# 레스토랑 상세 (메뉴 포함)
curl http://localhost:4000/api/restaurants/1
```

## 데이터베이스 관리

### 데이터베이스 리셋
```bash
cd servers/friendly
npm run db:reset
```

### SQLite CLI로 데이터 확인
```bash
# 테이블 목록
sqlite3 servers/friendly/data/niney.db ".tables"

# 사용자 조회
sqlite3 servers/friendly/data/niney.db "SELECT * FROM users;"

# 레스토랑 조회
sqlite3 servers/friendly/data/niney.db "SELECT * FROM restaurants;"

# 레스토랑 수 확인
sqlite3 servers/friendly/data/niney.db "SELECT COUNT(*) FROM restaurants;"

# 레스토랑과 메뉴 조인 조회
sqlite3 servers/friendly/data/niney.db "
SELECT r.name, r.category, r.phone, m.name as menu_name, m.price
FROM restaurants r
LEFT JOIN menus m ON r.id = m.restaurant_id
WHERE r.place_id = 'test20848484';"
```

## 빌드

### 웹 애플리케이션
```bash
cd apps/web
npm run build      # 프로덕션 빌드
npm run preview    # 빌드 미리보기
```

### Friendly 서버
```bash
cd servers/friendly
npm run build      # TypeScript → JavaScript
npm run start      # 프로덕션 서버 시작
npm run start:prod # NODE_ENV=production으로 시작
```

## 코드 품질

### ESLint
```bash
# 웹
cd apps/web && npm run lint

# 모바일
cd apps/mobile && npm run lint

# Friendly 서버
cd servers/friendly && npm run lint
cd servers/friendly && npm run lint:fix
```

### Python 코드 품질 (Smart 서버)
```bash
cd servers/smart
black src tests           # 코드 포맷팅
isort src tests           # import 정렬
ruff check src tests      # 린트 검사
mypy src                  # 타입 체킹
```

## 유틸리티 명령어

### Friendly 서버

```bash
cd servers/friendly
npm run kill       # 서버 프로세스 종료 (포트 4000)
npm run clean      # 빌드 디렉토리 정리
npm run type-check # TypeScript 타입 체킹
```

## 기술 스택

### Frontend
- React 19.1.1
- React Native Web 0.21.1 (Web)
- React Native 0.81.4 (Mobile)
- TypeScript 5.8.3
- Vite 7.1.7 (Web)
- Metro (Mobile)
- Playwright (Web E2E)
- Maestro (Mobile E2E)

### Backend
- Fastify 5.6.0 (Node.js)
- FastAPI 0.115+ (Python)
- SQLite3 5.1.7
- Puppeteer 24.23.0 (크롤링)
- Socket.io (실시간 통신)
- Vitest (Node.js 테스트)
- pytest (Python 테스트)

## 프로젝트 문서

- [CLAUDE.md](./CLAUDE.md) - 전체 프로젝트 아키텍처 및 개발 가이드
- [API 문서](http://localhost:4000/docs) - Friendly 서버 API 문서 (서버 실행 필요)
- [CHECKLIST_NEW_FIELD_ADDITION.md](./CHECKLIST_NEW_FIELD_ADDITION.md) - 새 필드 추가 시 체크리스트 & 메뉴별 감정 분석 계획

## 커밋 메시지 규칙

**중요**: 커밋 메시지는 반드시 한글로 작성

스코프 접두사 사용:
- `[web]` - 웹 애플리케이션 변경
- `[mobile]` - 모바일 애플리케이션 변경
- `[shared]` - 공유 컴포넌트/유틸리티 변경
- `[friendly]` - Node.js 백엔드 변경
- `[smart]` - Python 백엔드 변경
- `[config]` - 설정 파일 변경

예시:
```
[web] 데스크탑/모바일 레이아웃 분리 및 리뷰 기능 추가
[friendly] Place ID 기반 리뷰 조회 API 추가
[shared] 크로스 플랫폼 Button 컴포넌트 생성
```

## 라이선스

MIT
