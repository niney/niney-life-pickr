# CLAUDE.md

> Claude Code 가이드 - Niney Life Pickr 프로젝트

**프로젝트**: Cross-platform life decision-making application
**구조**: Web (React Native Web) + Mobile (React Native) + Shared + Backend (Fastify + FastAPI)

---

## 🚀 Quick Start

### 서버 실행
```bash
# Web (port 3000)
cd apps/web && npm run dev

# Backend (port 4000)
cd servers/friendly && npm run dev

# Smart Server (port 5000)
cd servers/smart && python scripts/dev.py

# Mobile (Metro bundler)
cd apps/mobile && npm start
```

### Quick Reference
- **테스트 계정**: `niney@ks.com` / `tester`
- **API Docs (Swagger)**: http://localhost:4000/docs
- **API Reference (Scalar)**: http://localhost:4000/reference
- **Database Reset**: `cd servers/friendly && npm run db:reset`

---

## 📚 문서 목차

### 🌐 00. Core (공통)
- **[ARCHITECTURE](./docs/claude/00-core/ARCHITECTURE.md)** - 전체 아키텍처, 기술 스택, 프로젝트 구조
- **[DATABASE](./docs/claude/00-core/DATABASE.md)** - DB 스키마, 마이그레이션, Repository 패턴
- **[DEVELOPMENT](./docs/claude/00-core/DEVELOPMENT.md)** - 개발 워크플로우, 테스트, 커밋 컨벤션
- **[PERFORMANCE](./docs/claude/00-core/PERFORMANCE.md)** - 성능 최적화 가이드 (Frontend, Backend, DB, Network)
- **[TROUBLESHOOTING](./docs/claude/00-core/TROUBLESHOOTING.md)** - 문제 해결 가이드 (API, DB, Socket.io, Build)

### 🖥️ 01. Web (apps/web)
- **[WEB-SETUP](./docs/claude/01-web/WEB-SETUP.md)** - Vite, React Native Web 설정
- **[WEB-ROUTING](./docs/claude/01-web/WEB-ROUTING.md)** - React Router, 라우팅
- **[WEB-THEME](./docs/claude/01-web/WEB-THEME.md)** - ThemeContext, Light/Dark Mode
- **[WEB-LAYOUT](./docs/claude/01-web/WEB-LAYOUT.md)** - 반응형 레이아웃
- **[WEB-HEADER-DRAWER](./docs/claude/01-web/WEB-HEADER-DRAWER.md)** - Header, Drawer
- **[WEB-HOME](./docs/claude/01-web/WEB-HOME.md)** - Home 화면
- **[WEB-LOGIN](./docs/claude/01-web/WEB-LOGIN.md)** - Login 화면
- **[WEB-RESTAURANT](./docs/claude/01-web/WEB-RESTAURANT.md)** - Restaurant 화면
- **[WEB-PATTERNS](./docs/claude/01-web/WEB-PATTERNS.md)** - RN Web 제약사항
- **[WEB-TESTING](./docs/claude/01-web/WEB-TESTING.md)** - Playwright E2E

### 📱 02. Mobile (apps/mobile)
- **[MOBILE-SETUP](./docs/claude/02-mobile/MOBILE-SETUP.md)** - Metro, React Native 설정
- **[MOBILE-NAVIGATION](./docs/claude/02-mobile/MOBILE-NAVIGATION.md)** - BottomTab, Stack
- **[MOBILE-HOME](./docs/claude/02-mobile/MOBILE-HOME.md)** - Home 화면
- **[MOBILE-LOGIN](./docs/claude/02-mobile/MOBILE-LOGIN.md)** - Login 화면
- **[MOBILE-RESTAURANT-LIST](./docs/claude/02-mobile/MOBILE-RESTAURANT-LIST.md)** - 레스토랑 목록
- **[MOBILE-RESTAURANT-DETAIL](./docs/claude/02-mobile/MOBILE-RESTAURANT-DETAIL.md)** - 레스토랑 상세
- **[MOBILE-SETTINGS](./docs/claude/02-mobile/MOBILE-SETTINGS.md)** - 설정 화면
- **[MOBILE-COMPONENTS](./docs/claude/02-mobile/MOBILE-COMPONENTS.md)** - RecrawlModal, TabBarIcons
- **[MOBILE-TESTING](./docs/claude/02-mobile/MOBILE-TESTING.md)** - Maestro E2E

### 🔗 03. Shared (apps/shared)
- **[SHARED-OVERVIEW](./docs/claude/03-shared/SHARED-OVERVIEW.md)** - Barrel Export 패턴
- **[SHARED-COMPONENTS](./docs/claude/03-shared/SHARED-COMPONENTS.md)** - Button, InputField
- **[SHARED-HOOKS](./docs/claude/03-shared/SHARED-HOOKS.md)** - useAuth, useLogin
- **[SHARED-CONTEXTS](./docs/claude/03-shared/SHARED-CONTEXTS.md)** - ThemeContext, SocketContext
- **[SHARED-SERVICES](./docs/claude/03-shared/SHARED-SERVICES.md)** - API Service
- **[SHARED-UTILS](./docs/claude/03-shared/SHARED-UTILS.md)** - Alert, Storage, Socket Utils
- **[SHARED-CONSTANTS](./docs/claude/03-shared/SHARED-CONSTANTS.md)** - 상수 관리

### ⚙️ 04. Friendly (servers/friendly)
- **[FRIENDLY-OVERVIEW](./docs/claude/04-friendly/FRIENDLY-OVERVIEW.md)** - Fastify 구조
- **[FRIENDLY-ROUTES](./docs/claude/04-friendly/FRIENDLY-ROUTES.md)** - 전체 Routes
- **[FRIENDLY-AUTH](./docs/claude/04-friendly/FRIENDLY-AUTH.md)** - 인증 시스템
- **[FRIENDLY-CRAWLER](./docs/claude/04-friendly/FRIENDLY-CRAWLER.md)** - Naver Map 크롤러
- **[FRIENDLY-RESTAURANT](./docs/claude/04-friendly/FRIENDLY-RESTAURANT.md)** - 레스토랑 관리
- **[FRIENDLY-REVIEW](./docs/claude/04-friendly/FRIENDLY-REVIEW.md)** - 리뷰 크롤링
- **[FRIENDLY-REVIEW-SUMMARY](./docs/claude/04-friendly/FRIENDLY-REVIEW-SUMMARY.md)** - AI 리뷰 요약
- **[FRIENDLY-JOB-SOCKET](./docs/claude/04-friendly/FRIENDLY-JOB-SOCKET.md)** - ⭐ Unified Job + Socket.io
- **[FRIENDLY-DATABASE](./docs/claude/04-friendly/FRIENDLY-DATABASE.md)** - Database 모듈
- **[FRIENDLY-REPOSITORIES](./docs/claude/04-friendly/FRIENDLY-REPOSITORIES.md)** - Repository 패턴
- **[FRIENDLY-API-DOCS](./docs/claude/04-friendly/FRIENDLY-API-DOCS.md)** - OpenAPI, Swagger
- **[FRIENDLY-TESTING](./docs/claude/04-friendly/FRIENDLY-TESTING.md)** - Vitest 테스트

### 🤖 05. Smart (servers/smart)
- **[SMART-OVERVIEW](./docs/claude/05-smart/SMART-OVERVIEW.md)** - FastAPI 기본 구조

---

## 📖 가이드

### 처음 시작
1. [ARCHITECTURE](./docs/claude/00-core/ARCHITECTURE.md) - 프로젝트 구조
2. [DATABASE](./docs/claude/00-core/DATABASE.md) - DB 스키마
3. [DEVELOPMENT](./docs/claude/00-core/DEVELOPMENT.md) - 개발 환경

### 주요 기능별
- **실시간 통신**: [FRIENDLY-JOB-SOCKET](./docs/claude/04-friendly/FRIENDLY-JOB-SOCKET.md) + [SHARED-CONTEXTS](./docs/claude/03-shared/SHARED-CONTEXTS.md)
- **인증**: [FRIENDLY-AUTH](./docs/claude/04-friendly/FRIENDLY-AUTH.md) + [SHARED-HOOKS](./docs/claude/03-shared/SHARED-HOOKS.md)
- **크롤링**: [FRIENDLY-CRAWLER](./docs/claude/04-friendly/FRIENDLY-CRAWLER.md)
- **테마**: [WEB-THEME](./docs/claude/01-web/WEB-THEME.md)

---

## 🔧 Troubleshooting

**전체 가이드**: [TROUBLESHOOTING](./docs/claude/00-core/TROUBLESHOOTING.md) - 31개 이슈 해결 방법

### 빠른 참조
```bash
# 포트 충돌
cd servers/friendly && npm run kill && npm run dev

# Database 초기화
cd servers/friendly && npm run db:reset

# Mobile API 연결
# Android Emulator: 10.0.2.2:4000
# iOS Simulator: localhost:4000
# Physical Device: <local-ip>:4000
```

---

## 📝 문서 업데이트

### 기능 추가 시
1. 해당 모듈 문서 찾기
2. 새 섹션 추가 (예제 코드 포함)
3. 크로스 레퍼런스 추가

### 새 모듈 추가 시
1. `{PROJECT}-{MODULE}.md` 생성
2. 이 파일에 링크 추가
3. 관련 문서에 크로스 레퍼런스 추가

---

**문서 버전**: 2.0 (Refactored)
**최종 업데이트**: 2025-10-24
**이전 버전**: CLAUDE.md.backup (841줄, 단일 파일)
**새 버전**: 43개 모듈별 문서
