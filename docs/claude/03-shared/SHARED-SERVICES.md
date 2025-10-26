# SHARED-SERVICES.md

> **Last Updated**: 2025-10-26
> **Purpose**: API service layer for backend communication (authentication, crawling, restaurants, reviews)

---

## Table of Contents

1. [Overview](#1-overview)
2. [API Configuration](#2-api-configuration)
3. [Type Definitions](#3-type-definitions)
4. [ApiService Class](#4-apiservice-class)
5. [Authentication Endpoints](#5-authentication-endpoints)
6. [Crawler Endpoints](#6-crawler-endpoints)
7. [Restaurant Endpoints](#7-restaurant-endpoints)
8. [Review Endpoints](#8-review-endpoints)
9. [Error Handling](#9-error-handling)
10. [Usage Examples](#10-usage-examples)
11. [Related Documentation](#11-related-documentation)

---

## 1. Overview

The services module provides a unified API client for communicating with the backend. It handles platform-specific URL configuration, type-safe requests, and standardized error handling.

### File Structure

**Location**: `apps/shared/services/`

```
apps/shared/services/
├── api.service.ts   # API client implementation (500 lines)
└── index.ts         # Barrel exports (23 lines)
```

### Key Features

- **Cross-Platform URLs**: Automatic URL configuration for web/Android/iOS
- **Type Safety**: Full TypeScript definitions for requests and responses
- **Singleton Pattern**: Single shared instance (`apiService`)
- **Standardized Responses**: Unified `ApiResponse<T>` format
- **Error Handling**: Automatic error parsing and throwing

### Import Pattern

**Web**:
```typescript
import { apiService } from '@shared/services';
```

**Mobile**:
```typescript
import { apiService } from 'shared/services';
```

---

## 2. API Configuration

### 2.1 Platform-Specific File Structure

The API configuration uses **platform-specific file extensions** to handle different environments:

**File Structure**: `apps/shared/services/`
```
apps/shared/services/
├── api.service.ts         # Main API service class
├── api.config.web.ts      # Web configuration (import.meta support)
├── api.config.ts          # Mobile configuration (YAML-based)
└── index.ts               # Barrel exports
```

**Auto-Selection Mechanism**:
- **Web (Vite)**: Selects `api.config.web.ts` (via `resolve.extensions: ['.web.ts', '.ts']`)
- **Mobile (Metro)**: Selects `api.config.ts` (ignores `.web.ts`)

### 2.2 Web Configuration (api.config.web.ts)

**File**: `apps/shared/services/api.config.web.ts`

```typescript
const API_PORT = 4000;

export const getDefaultApiUrl = (): string => {
  // Vite 빌드 시 YAML에서 주입된 값 사용 (Production)
  if (import.meta.env?.MODE === 'production' && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Development: 현재 브라우저의 호스트 사용 (localhost, IP, 도메인 자동 감지)
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:${API_PORT}`;
  }

  // Fallback
  return `http://localhost:${API_PORT}`;
};
```

**Features**:
- Uses `import.meta.env` (Vite-specific)
- Auto-detects hostname from `window.location`
- Production URL injected from `config/production.yml`

**Vite Config** (`apps/web/vite.config.ts`):
```typescript
define: {
  'import.meta.env.VITE_API_URL': JSON.stringify(apiConfig.url),
}
```

### 2.3 Mobile Configuration (api.config.ts)

**File**: `apps/shared/services/api.config.ts`

```typescript
import { Platform } from 'react-native';

export const getDefaultApiUrl = (): string => {
  // Babel이 컴파일 타임에 YAML에서 로드한 환경변수를 문자열로 치환
  if (Platform.OS === 'android' && process.env.API_MOBILE_ANDROID) {
    return process.env.API_MOBILE_ANDROID;
  }

  if (Platform.OS === 'ios' && process.env.API_MOBILE_IOS) {
    return process.env.API_MOBILE_IOS;
  }

  // Fallback
  return 'https://nlpfriendly.easypcb.co.kr';
};
```

**Features**:
- Uses `process.env.API_MOBILE_*` (injected by Babel)
- Platform-specific URLs (Android/iOS)
- No `import.meta` (Metro-compatible)

**Babel Config** (`apps/mobile/babel.config.js`):
```javascript
// YAML config 로드 (Web의 vite.config.ts와 동일한 방식)
const loadedConfig = loadConfig();
const apiConfig = loadedConfig.api || {};

// 환경변수로 주입 (babel-plugin-transform-inline-environment-variables가 치환)
process.env.API_MOBILE_ANDROID = apiConfig.mobile?.android || 'http://10.0.2.2:4000';
process.env.API_MOBILE_IOS = apiConfig.mobile?.ios || 'http://localhost:4000';

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: ['babel-plugin-transform-inline-environment-variables'],
};
```

**YAML Config** (`config/base.yml`):
```yaml
api:
  url: "http://192.168.0.10:4000"  # Web용
  mobile:
    android: "http://10.0.2.2:4000"       # Android 에뮬레이터
    ios: "http://192.168.0.10:4000"       # iOS 시뮬레이터/실기기
```

**YAML Config** (`config/production.yml`):
```yaml
api:
  url: "https://nlpfriendly.easypcb.co.kr"
  mobile:
    android: "https://nlpfriendly.easypcb.co.kr"
    ios: "https://nlpfriendly.easypcb.co.kr"
```

### 2.4 Platform-Specific URLs

| Platform | Development (base.yml) | Production (production.yml) |
|----------|------------------------|----------------------------|
| **Web** | `http://{hostname}:4000` (auto-detect) | `https://nlpfriendly.easypcb.co.kr` |
| **Android** | `http://10.0.2.2:4000` | `https://nlpfriendly.easypcb.co.kr` |
| **iOS** | `http://192.168.0.10:4000` | `https://nlpfriendly.easypcb.co.kr` |

**Android Emulator**:
- `10.0.2.2` is special IP that maps to host machine's `localhost`
- Allows emulator to access backend running on host

**iOS Simulator/Device**:
- Development: Use LAN IP address of development machine
- **Important**: Update `192.168.0.10` in `config/base.yml` to match your machine's IP
- Find your IP: `ipconfig getifaddr en0` (Mac) or `ipconfig` (Windows)

### 2.5 Build Scripts (Mobile)

**Development Build** (uses `config/base.yml`):
```bash
cd apps/mobile
npm run android:dev  # NODE_ENV=development
npm run ios:dev      # NODE_ENV=development
```

**Production Build** (uses `config/production.yml`):
```bash
npm run android:prod  # NODE_ENV=production
npm run ios:prod      # NODE_ENV=production
```

**How it Works**:
1. `babel.config.js` reads `NODE_ENV`
2. Loads `base.yml` (always) + `production.yml` (if NODE_ENV=production)
3. Injects `process.env.API_MOBILE_ANDROID` and `process.env.API_MOBILE_IOS`
4. `babel-plugin-transform-inline-environment-variables` replaces at compile-time
5. `api.config.ts` uses the replaced strings

---

## 3. Type Definitions

### 3.1 API Response Format

```typescript
export interface ApiResponse<T = any> {
  result: boolean;
  message: string;
  data?: T;
  timestamp: string;
  statusCode?: number;
}
```

**Properties**:
- `result`: `true` for success, `false` for error
- `message`: Human-readable message
- `data`: Response payload (generic type `T`)
- `timestamp`: ISO 8601 timestamp
- `statusCode`: HTTP status code (optional, present on errors)

**Example Success**:
```json
{
  "result": true,
  "message": "Login successful",
  "data": {
    "user": { "id": 1, "email": "niney@ks.com" }
  },
  "timestamp": "2025-10-23T13:45:00.000Z"
}
```

**Example Error**:
```json
{
  "result": false,
  "message": "Invalid credentials",
  "statusCode": 401,
  "timestamp": "2025-10-23T13:45:00.000Z"
}
```

### 3.2 Authentication Types

```typescript
export interface User {
  id: number;
  email: string;
  username: string;
  provider?: string;
  created_at?: string;
  last_login?: string;
  is_active?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token?: string; // 향후 JWT 토큰 추가 예정
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}
```

### 3.3 Restaurant Types

```typescript
export interface RestaurantData {
  id: number;
  place_id: string;
  name: string;
  place_name: string | null;
  category: string | null;
  phone: string | null;
  address: string | null;
  description: string | null;
  business_hours: string | null;
  lat: number | null;
  lng: number | null;
  url: string;
  crawled_at: string;
  created_at: string;
  updated_at: string;
}

export interface RestaurantListResponse {
  total: number;
  limit: number;
  offset: number;
  restaurants: RestaurantData[];
}

export interface RestaurantDetailResponse {
  restaurant: RestaurantData;
  menus: MenuItem[];
}
```

### 3.4 Review Types

```typescript
export interface ReviewData {
  id: number;
  userName: string | null;
  visitKeywords: string[];
  waitTime: string | null;
  reviewText: string | null;
  emotionKeywords: string[];
  visitInfo: VisitInfo;
  images: string[];
  crawledAt: string;
  createdAt: string;
  summary?: ReviewSummary | null;
}

export interface ReviewListResponse {
  total: number;
  limit: number;
  offset: number;
  reviews: ReviewData[];
}

export interface ReviewSummary {
  summary: string;
  keyKeywords: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentReason: string;
  satisfactionScore: number | null;
  tips: string[];
  menuItems?: MenuItemWithSentiment[];
}
```

**See Also**: Full type definitions in `apps/shared/services/api.service.ts:46-267`

---

## 4. ApiService Class

### 4.1 Class Structure

```typescript
class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    // HTTP request logic
  }

  // Public methods for API endpoints...
}

// Singleton instance
export const apiService = new ApiService();
```

**Design Pattern**: Singleton (single shared instance)

### 4.2 Private request() Method

```typescript
private async request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const url = `${this.baseUrl}${endpoint}`;

  // Content-Type 헤더는 body가 있을 때만 설정
  const headers: Record<string, string> = {
    ...options?.headers as Record<string, string>,
  };

  if (options?.body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    // 서버에서 에러 응답이 왔을 때
    throw new Error(data.message || `HTTP error! status: ${response.status}`);
  }

  return data as ApiResponse<T>;
}
```

**Key Logic**:
1. Build full URL from baseUrl + endpoint
2. Add `Content-Type: application/json` only if body exists
3. Send fetch request
4. Parse JSON response
5. Throw error if `!response.ok` (4xx, 5xx)
6. Return typed `ApiResponse<T>`

---

## 5. Authentication Endpoints

### 5.1 login()

**Endpoint**: `POST /api/auth/login`

```typescript
async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
  return this.request<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}
```

**Request**:
```typescript
await apiService.login({
  email: 'niney@ks.com',
  password: 'tester'
});
```

**Response**:
```json
{
  "result": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "niney@ks.com",
      "username": "niney"
    }
  }
}
```

### 5.2 register()

**Endpoint**: `POST /api/auth/register`

```typescript
async register(userData: RegisterRequest): Promise<ApiResponse<{ user: User }>> {
  return this.request<{ user: User }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}
```

**Request**:
```typescript
await apiService.register({
  email: 'new@example.com',
  username: 'newuser',
  password: 'password123'
});
```

### 5.3 getUsers()

**Endpoint**: `GET /api/auth/users`

```typescript
async getUsers(): Promise<ApiResponse<{ users: User[]; count: number }>> {
  return this.request<{ users: User[]; count: number }>('/api/auth/users', {
    method: 'GET',
  });
}
```

**Purpose**: Test endpoint to list all users

---

## 6. Crawler Endpoints

### 6.1 crawl() (Unified API)

**Endpoint**: `POST /api/crawler/crawl`

**Purpose**: Unified API for both new crawling and re-crawling

```typescript
async crawl(options: {
  url?: string;
  restaurantId?: number;
  crawlMenus?: boolean;
  crawlReviews?: boolean;
  createSummary?: boolean;
  resetSummary?: boolean;
}): Promise<ApiResponse<{
  restaurantId: number;
  isNewCrawl: boolean;
  crawlMenus: boolean;
  crawlReviews: boolean;
  createSummary: boolean;
  resetSummary?: boolean;
  reviewJobId?: string;
  restaurantInfo?: RestaurantInfo;
}>>
```

**New Crawl** (provide `url`):
```typescript
await apiService.crawl({
  url: 'https://m.place.naver.com/restaurant/123456',
  crawlMenus: true,
  crawlReviews: true,
  createSummary: true
});
```

**Re-Crawl** (provide `restaurantId`):
```typescript
await apiService.crawl({
  restaurantId: 1,
  crawlMenus: false,
  crawlReviews: true,
  createSummary: true,
  resetSummary: true  // Delete existing summaries
});
```

**Response**:
```json
{
  "result": true,
  "message": "Crawling started",
  "data": {
    "restaurantId": 1,
    "isNewCrawl": false,
    "crawlMenus": false,
    "crawlReviews": true,
    "createSummary": true,
    "resetSummary": true,
    "reviewJobId": "uuid-here"
  }
}
```

### 6.2 crawlRestaurant() (Deprecated)

**Status**: Deprecated, use `crawl()` instead

```typescript
/**
 * @deprecated Use crawl() instead
 */
async crawlRestaurant(request: CrawlRestaurantRequest): Promise<ApiResponse<RestaurantInfo>>
```

**Migration**:
```typescript
// Old
await apiService.crawlRestaurant({ url, crawlMenus, crawlReviews });

// New
await apiService.crawl({ url, crawlMenus, crawlReviews, createSummary: true });
```

### 6.3 recrawlRestaurant() (Deprecated)

**Status**: Deprecated, use `crawl()` instead

```typescript
/**
 * @deprecated Use crawl() instead
 */
async recrawlRestaurant(
  restaurantId: number,
  options: { crawlMenus, crawlReviews, createSummary, resetSummary? }
): Promise<ApiResponse<...>>
```

**Migration**:
```typescript
// Old
await apiService.recrawlRestaurant(restaurantId, { crawlMenus, crawlReviews, createSummary });

// New
await apiService.crawl({ restaurantId, crawlMenus, crawlReviews, createSummary });
```

---

## 7. Restaurant Endpoints

### 7.1 getRestaurantCategories()

**Endpoint**: `GET /api/restaurants/categories`

```typescript
async getRestaurantCategories(): Promise<ApiResponse<RestaurantCategory[]>> {
  return this.request<RestaurantCategory[]>('/api/restaurants/categories', {
    method: 'GET',
  });
}
```

**Response**:
```json
{
  "result": true,
  "message": "Categories retrieved successfully",
  "data": [
    { "category": "한식", "count": 5 },
    { "category": "일식", "count": 3 }
  ]
}
```

### 7.2 getRestaurants()

**Endpoint**: `GET /api/restaurants?limit={limit}&offset={offset}&category={category}`

```typescript
async getRestaurants(
  limit: number = 20,
  offset: number = 0,
  category?: string
): Promise<ApiResponse<RestaurantListResponse>> {
  let url = `/api/restaurants?limit=${limit}&offset=${offset}`;

  if (category) {
    url += `&category=${encodeURIComponent(category)}`;
  }

  return this.request<RestaurantListResponse>(url, {
    method: 'GET',
  });
}
```

**Usage**:
```typescript
// All restaurants, first page
await apiService.getRestaurants(20, 0);

// Filtered by category
await apiService.getRestaurants(20, 0, '한식');

// Pagination (page 2)
await apiService.getRestaurants(20, 20);
```

**Response**:
```json
{
  "result": true,
  "message": "Restaurants retrieved successfully",
  "data": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "restaurants": [...]
  }
}
```

### 7.3 getRestaurantById()

**Endpoint**: `GET /api/restaurants/{id}`

```typescript
async getRestaurantById(id: number): Promise<ApiResponse<RestaurantDetailResponse>> {
  return this.request<RestaurantDetailResponse>(`/api/restaurants/${id}`, {
    method: 'GET',
  });
}
```

**Response**:
```json
{
  "result": true,
  "message": "Restaurant retrieved successfully",
  "data": {
    "restaurant": {
      "id": 1,
      "name": "레스토랑명",
      ...
    },
    "menus": [
      { "name": "김치찌개", "price": "8000원" }
    ]
  }
}
```

### 7.4 deleteRestaurant()

**Endpoint**: `DELETE /api/restaurants/{id}`

```typescript
async deleteRestaurant(id: number): Promise<ApiResponse<{
  restaurantId: number;
  placeId: string;
  deletedMenus: number;
  deletedReviews: number;
  deletedJobs: number;
  deletedImages: {
    menus: number;
    reviews: number;
  };
}>>
```

**Response**:
```json
{
  "result": true,
  "message": "Restaurant deleted successfully",
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

## 8. Review Endpoints

### 8.1 getReviewsByRestaurantId()

**Endpoint**: `GET /api/restaurants/{restaurantId}/reviews?limit={limit}&offset={offset}&sentiment={sentiment}&searchText={searchText}`

```typescript
async getReviewsByRestaurantId(
  restaurantId: number,
  limit: number = 20,
  offset: number = 0,
  sentiments?: ('positive' | 'negative' | 'neutral')[],
  searchText?: string
): Promise<ApiResponse<ReviewListResponse>>
```

**Usage**:
```typescript
// All reviews
await apiService.getReviewsByRestaurantId(1, 20, 0);

// Filter by sentiment
await apiService.getReviewsByRestaurantId(1, 20, 0, ['positive']);

// Search reviews
await apiService.getReviewsByRestaurantId(1, 20, 0, undefined, '김치찌개');

// Combined filters
await apiService.getReviewsByRestaurantId(1, 20, 0, ['positive', 'neutral'], '맛있');
```

**Response**:
```json
{
  "result": true,
  "message": "Reviews retrieved successfully",
  "data": {
    "total": 50,
    "limit": 20,
    "offset": 0,
    "reviews": [
      {
        "id": 1,
        "userName": "홍길동",
        "reviewText": "맛있어요!",
        "summary": {
          "sentiment": "positive",
          "satisfactionScore": 85
        }
      }
    ]
  }
}
```

---

## 9. Error Handling

### 9.1 Error Throwing

```typescript
if (!response.ok) {
  throw new Error(data.message || `HTTP error! status: ${response.status}`);
}
```

**Behavior**: Throws Error with server's error message or generic HTTP error

### 9.2 Handling Errors in Hooks

**Example** (`useLogin` hook):
```typescript
try {
  const response = await apiService.login({ email, password });

  if (response.result) {
    // Success
    await login(response.data.user);
  } else {
    // Server returned result: false
    Alert.error('로그인 실패', response.message);
  }
} catch (error: any) {
  // Network error or thrown error
  Alert.error('로그인 실패', error.message || '알 수 없는 오류');
}
```

### 9.3 Error Types

| Error Type | Cause | Handling |
|------------|-------|----------|
| **Network Error** | No internet, server down | Catch fetch exception |
| **HTTP Error (4xx/5xx)** | Bad request, unauthorized | Thrown by `request()` |
| **Result: false** | Business logic error | Check `response.result` |

---

## 10. Usage Examples

### 10.1 Authentication Flow

```typescript
import { apiService } from '@shared/services';
import { Alert } from '@shared/utils';

const handleLogin = async (email: string, password: string) => {
  try {
    const response = await apiService.login({ email, password });

    if (response.result && response.data) {
      await storage.setUserInfo(response.data.user);
      Alert.success('로그인 성공', `${response.data.user.username}님 환영합니다`);
    } else {
      Alert.error('로그인 실패', response.message);
    }
  } catch (error: any) {
    Alert.error('로그인 실패', error.message);
  }
};
```

### 10.2 Restaurant Crawling

```typescript
const handleCrawl = async (url: string) => {
  try {
    const response = await apiService.crawl({
      url,
      crawlMenus: true,
      crawlReviews: true,
      createSummary: true
    });

    if (response.result && response.data) {
      Alert.success('크롤링 시작', `Restaurant ID: ${response.data.restaurantId}`);
      console.log('Review Job ID:', response.data.reviewJobId);
    }
  } catch (error: any) {
    Alert.error('크롤링 실패', error.message);
  }
};
```

### 10.3 Fetching Restaurant List

```typescript
import { useState, useEffect } from 'react';
import { apiService, type RestaurantData } from '@shared/services';

const RestaurantList: React.FC = () => {
  const [restaurants, setRestaurants] = useState<RestaurantData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const response = await apiService.getRestaurants(20, 0);

        if (response.result && response.data) {
          setRestaurants(response.data.restaurants);
        }
      } catch (error) {
        console.error('Failed to fetch restaurants:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  // Render restaurants...
};
```

---

## 11. Related Documentation

### Shared Documentation
- **[SHARED-OVERVIEW.md](./SHARED-OVERVIEW.md)**: Shared module architecture
- **[SHARED-HOOKS.md](./SHARED-HOOKS.md)**: useLogin hook (uses apiService)
- **[SHARED-UTILS.md](./SHARED-UTILS.md)**: Alert utilities for error handling

### Backend Documentation (Friendly)
- **[FRIENDLY-ROUTES.md](../04-friendly/FRIENDLY-ROUTES.md)**: Backend route implementations
- **[FRIENDLY-AUTH.md](../04-friendly/FRIENDLY-AUTH.md)**: Authentication endpoints
- **[FRIENDLY-CRAWLER.md](../04-friendly/FRIENDLY-CRAWLER.md)**: Crawler service

### Core Documentation
- **[ARCHITECTURE.md](../00-core/ARCHITECTURE.md)**: Overall architecture
- **[DATABASE.md](../00-core/DATABASE.md)**: Database schema

---

## Appendix: Migration Guide

### Deprecated Methods

#### crawlRestaurant() → crawl()

**Before**:
```typescript
await apiService.crawlRestaurant({
  url: 'https://m.place.naver.com/restaurant/123456',
  crawlMenus: true,
  crawlReviews: true
});
```

**After**:
```typescript
await apiService.crawl({
  url: 'https://m.place.naver.com/restaurant/123456',
  crawlMenus: true,
  crawlReviews: true,
  createSummary: true
});
```

#### recrawlRestaurant() → crawl()

**Before**:
```typescript
await apiService.recrawlRestaurant(1, {
  crawlMenus: false,
  crawlReviews: true,
  createSummary: true,
  resetSummary: true
});
```

**After**:
```typescript
await apiService.crawl({
  restaurantId: 1,
  crawlMenus: false,
  crawlReviews: true,
  createSummary: true,
  resetSummary: true
});
```

---

**Document Version**: 1.0.0
**Covers Files**: `api.service.ts`, platform-specific API URLs, unified crawl API, type definitions
