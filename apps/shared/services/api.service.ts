/**
 * API Service for backend communication
 */

import { getDefaultApiUrl } from './api.config';

const API_BASE_URL = getDefaultApiUrl();

// API 응답 타입
export interface ApiResponse<T = any> {
  result: boolean;
  message: string;
  data?: T;
  timestamp: string;
  statusCode?: number;
}

// 사용자 타입
export interface User {
  id: number;
  email: string;
  username: string;
  provider?: string;
  created_at?: string;
  last_login?: string;
  is_active?: boolean;
}

// 로그인 요청 타입
export interface LoginRequest {
  email: string;
  password: string;
}

// 로그인 응답 타입
export interface LoginResponse {
  user: User;
  token?: string; // 향후 JWT 토큰 추가 예정
}

// 회원가입 요청 타입
export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

// 크롤링 관련 타입
export interface MenuItem {
  name: string;
  description?: string;
  price: string;
  image?: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RestaurantInfo {
  name: string;
  address: string | null;
  category: string | null;
  phone: string | null;
  description: string | null;
  businessHours: string | null;
  coordinates: Coordinates | null;
  url: string;
  placeId: string | null;
  placeName: string | null;
  crawledAt: string;
  menuItems?: MenuItem[];
  savedToDb?: boolean;
  restaurantId?: number;
  jobId?: string;
  reviewJobId?: string;
}

export interface CrawlRestaurantRequest {
  url: string;
  crawlMenus?: boolean;
  crawlReviews?: boolean;
  createSummary?: boolean;
}

export interface RestaurantCategory {
  category: string;
  count: number;
}

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

// 리뷰 관련 타입
export interface VisitInfo {
  visitDate: string | null;
  visitCount: string | null;
  verificationMethod: string | null;
}

export interface ReviewInfo {
  userName: string | null;
  visitKeywords: string[];
  waitTime: string | null;
  reviewText: string | null;
  emotionKeywords: string[];
  visitInfo: VisitInfo;
}

export type MenuItemSentiment = 'positive' | 'negative' | 'neutral';

export interface MenuItemWithSentiment {
  name: string;
  sentiment: MenuItemSentiment;
  reason?: string;
}

export interface ReviewSummary {
  summary: string;
  keyKeywords: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentReason: string;
  satisfactionScore: number | null;
  tips: string[];
  menuItems?: MenuItemWithSentiment[];  // 리뷰에서 추출된 메뉴명/음식명 + 감정
}

/**
 * 메뉴별 감정 통계
 */
export interface MenuSentimentStats {
  menuName: string;
  totalMentions: number;
  positive: number;
  negative: number;
  neutral: number;
  positiveRate: number;
  sentiment: MenuItemSentiment;
  topReasons: {
    positive: string[];
    negative: string[];
    neutral: string[];
  };
}

/**
 * Top 메뉴 (긍정/부정)
 */
export interface TopMenu {
  menuName: string;
  positiveRate?: number;
  negativeRate?: number;
  mentions: number;
}

/**
 * 레스토랑 메뉴 통계
 */
export interface RestaurantMenuStatistics {
  restaurantId: number;
  totalReviews: number;
  analyzedReviews: number;
  menuStatistics: MenuSentimentStats[];
  topPositiveMenus: TopMenu[];
  topNegativeMenus: TopMenu[];
}

/**
 * 레스토랑 리뷰 감정 통계
 */
export interface RestaurantReviewStatistics {
  restaurantId: number;
  totalReviews: number;
  analyzedReviews: number;
  positive: number;
  negative: number;
  neutral: number;
  positiveRate: number;
  negativeRate: number;
  neutralRate: number;
}

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

export interface RestaurantDetailResponse {
  restaurant: RestaurantData;
  menus: MenuItem[];
}

export interface ReviewCrawlProgress {
  current: number;
  total: number;
  percentage: number;
}

export interface ReviewCrawlStatus {
  jobId?: string;
  status: 'idle' | 'active' | 'completed' | 'failed' | 'cancelled';
  progress?: ReviewCrawlProgress;
  reviews?: ReviewInfo[];
  error?: string;
}

export interface RestaurantRanking {
  rank: number;
  restaurant: {
    id: number;
    name: string;
    category: string | null;
    address: string | null;
  };
  statistics: {
    totalReviews: number;
    analyzedReviews: number;
    positive: number;
    negative: number;
    neutral: number;
    positiveRate: number;
    negativeRate: number;
    neutralRate: number;
  };
}

export interface RestaurantRankingsResponse {
  type: 'positive' | 'negative' | 'neutral';
  limit: number;
  minReviews: number;
  category?: string;
  rankings: RestaurantRanking[];
}

// 네이버 플레이스 검색 관련 타입
export interface NaverPlaceItem {
  name: string;
  category?: string;
  address?: string;
  status?: string;
  reviewCount?: number;
  isAd: boolean;
  tvShow?: string | null;
  hasReservation: boolean;
  hasCoupon: boolean;
  images: string[];
  reviewSnippets: string[];
  placeId?: string;
  url?: string;
}

export interface NaverPlaceSearchResult {
  keyword: string;
  totalCount: number;
  places: NaverPlaceItem[];
  crawledAt: string;
  duration: number;
}

export interface RestaurantSearchRequest {
  keyword: string;
  maxResults?: number;
  enableScroll?: boolean;
  headless?: boolean;
}

// API 클래스
class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * HTTP 요청을 보내는 헬퍼 메서드
   */
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

  /**
   * 로그인
   */
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    return this.request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  /**
   * 회원가입
   */
  async register(userData: RegisterRequest): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  /**
   * 사용자 목록 가져오기 (테스트용)
   */
  async getUsers(): Promise<ApiResponse<{ users: User[]; count: number }>> {
    return this.request<{ users: User[]; count: number }>('/api/auth/users', {
      method: 'GET',
    });
  }

  /**
   * 네이버 맵 음식점 크롤링 (deprecated - crawl 사용 권장)
   * @deprecated Use crawl() instead
   */
  async crawlRestaurant(request: CrawlRestaurantRequest): Promise<ApiResponse<RestaurantInfo>> {
    // 내부적으로 통합 API 사용
    const response = await this.crawl({
      url: request.url,
      crawlMenus: request.crawlMenus,
      crawlReviews: request.crawlReviews,
      createSummary: true // 크롤링 시 자동으로 리뷰 요약 생성
    });

    // 기존 인터페이스 유지를 위해 변환
    if (response.result && response.data?.restaurantInfo) {
      return {
        ...response,
        data: response.data.restaurantInfo
      };
    }

    return response as any;
  }

  /**
   * 통합 크롤링 API (신규 크롤링 + 재크롤링)
   */
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
  }>> {
    return this.request('/api/crawler/crawl', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  /**
   * 레스토랑 재크롤링 (deprecated - crawl 사용 권장)
   */
  async recrawlRestaurant(
    restaurantId: number,
    options: { crawlMenus: boolean; crawlReviews: boolean; createSummary: boolean; resetSummary?: boolean }
  ): Promise<ApiResponse<{
    restaurantId: number;
    crawlMenus: boolean;
    crawlReviews: boolean;
    createSummary: boolean;
    resetSummary?: boolean;
    reviewJobId?: string;
  }>> {
    // 내부적으로 통합 API 사용
    return this.crawl({
      restaurantId,
      ...options
    });
  }

  /**
   * 카테고리별 음식점 개수 조회
   */
  async getRestaurantCategories(): Promise<ApiResponse<RestaurantCategory[]>> {
    return this.request<RestaurantCategory[]>('/api/restaurants/categories', {
      method: 'GET',
    });
  }

  /**
   * 음식점 목록 조회
   */
  async getRestaurants(
    limit: number = 1000,
    offset: number = 0,
    category?: string,
    searchName?: string,
    searchAddress?: string
  ): Promise<ApiResponse<RestaurantListResponse>> {
    let url = `/api/restaurants?limit=${limit}&offset=${offset}`;

    // 카테고리 필터 추가
    if (category) {
      url += `&category=${encodeURIComponent(category)}`;
    }

    // 이름 검색 필터 추가
    if (searchName && searchName.trim()) {
      url += `&searchName=${encodeURIComponent(searchName.trim())}`;
    }

    // 주소 검색 필터 추가
    if (searchAddress && searchAddress.trim()) {
      url += `&searchAddress=${encodeURIComponent(searchAddress.trim())}`;
    }

    return this.request<RestaurantListResponse>(url, {
      method: 'GET',
    });
  }

  /**
   * 음식점 상세 조회 (메뉴 포함)
   */
  async getRestaurantById(id: number): Promise<ApiResponse<RestaurantDetailResponse>> {
    return this.request<RestaurantDetailResponse>(`/api/restaurants/${id}`, {
      method: 'GET',
    });
  }

  /**
   * Restaurant ID로 리뷰 조회
   */
  async getReviewsByRestaurantId(
    restaurantId: number,
    limit: number = 20,
    offset: number = 0,
    sentiments?: ('positive' | 'negative' | 'neutral')[],
    searchText?: string
  ): Promise<ApiResponse<ReviewListResponse>> {
    let url = `/api/restaurants/${restaurantId}/reviews?limit=${limit}&offset=${offset}`;

    // sentiment 필터 추가
    if (sentiments && sentiments.length > 0) {
      sentiments.forEach(sentiment => {
        url += `&sentiment=${sentiment}`;
      });
    }

    // 검색어 추가
    if (searchText) {
      url += `&searchText=${encodeURIComponent(searchText)}`;
    }

    return this.request<ReviewListResponse>(url, {
      method: 'GET',
    });
  }

  /**
   * 음식점 삭제 (하드 삭제)
   * DB 레코드, 관련 데이터(메뉴, 리뷰, Job), 이미지 파일 모두 삭제
   */
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
  }>> {
    return this.request(`/api/restaurants/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * 레스토랑 리뷰 감정 통계 조회
   */
  async getRestaurantStatistics(restaurantId: number): Promise<ApiResponse<RestaurantReviewStatistics>> {
    return this.request<RestaurantReviewStatistics>(`/api/restaurants/${restaurantId}/statistics`, {
      method: 'GET',
    });
  }

  /**
   * 레스토랑 메뉴별 감정 통계 조회
   */
  async getRestaurantMenuStatistics(
    restaurantId: number,
    minMentions: number = 1
  ): Promise<ApiResponse<RestaurantMenuStatistics>> {
    let url = `/api/restaurants/${restaurantId}/menu-statistics`;

    if (minMentions > 1) {
      url += `?minMentions=${minMentions}`;
    }

    return this.request<RestaurantMenuStatistics>(url, {
      method: 'GET',
    });
  }

  /**
   * 레스토랑 순위 TOP N 조회
   */
  async getRestaurantRankings(
    type: 'positive' | 'negative' | 'neutral' = 'positive',
    limit: number = 5,
    minReviews: number = 10,
    category?: string,
    excludeNeutral?: boolean,
    invalidateCache?: boolean
  ): Promise<ApiResponse<RestaurantRankingsResponse>> {
    let url = `/api/restaurants/rankings?type=${type}&limit=${limit}&minReviews=${minReviews}`;

    if (category) {
      url += `&category=${encodeURIComponent(category)}`;
    }

    if (excludeNeutral !== undefined) {
      url += `&excludeNeutral=${excludeNeutral}`;
    }

    if (invalidateCache) {
      url += '&invalidateCache=true';
    }

    return this.request<RestaurantRankingsResponse>(url, {
      method: 'GET',
    });
  }

  /**
   * 네이버 플레이스 레스토랑 검색
   */
  async searchRestaurants(params: RestaurantSearchRequest): Promise<ApiResponse<NaverPlaceSearchResult>> {
    const queryParams = new URLSearchParams();
    queryParams.append('keyword', params.keyword);

    if (params.maxResults !== undefined) {
      queryParams.append('maxResults', params.maxResults.toString());
    }
    if (params.enableScroll !== undefined) {
      queryParams.append('enableScroll', params.enableScroll.toString());
    }
    if (params.headless !== undefined) {
      queryParams.append('headless', params.headless.toString());
    }

    return this.request<NaverPlaceSearchResult>(`/api/crawler/search?${queryParams.toString()}`, {
      method: 'GET',
    });
  }

  /**
   * 선택된 레스토랑들의 Place ID 추출
   */
  async extractPlaceIds(params: {
    keyword: string;
    restaurantNames: string[];
    headless?: boolean;
  }): Promise<ApiResponse<Array<{ name: string; placeId: string | null; url: string | null }>>> {
    return this.request<Array<{ name: string; placeId: string | null; url: string | null }>>(
      '/api/crawler/extract-place-ids',
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    );
  }

  /**
   * Queue에 크롤링 Job 추가 (단일)
   */
  async addToQueue(params: {
    url?: string;
    restaurantId?: number;
  }): Promise<ApiResponse<{
    queueId: string;
    restaurantId: number;
    position: number;
    status: string;
  }>> {
    return this.request<{
      queueId: string;
      restaurantId: number;
      position: number;
      status: string;
    }>('/api/crawler/crawl-queued', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Queue에 크롤링 Job 일괄 추가
   */
  async bulkAddToQueue(params: {
    urls: string[];
    crawlMenus?: boolean;
    crawlReviews?: boolean;
    createSummary?: boolean;
    resetSummary?: boolean;
  }): Promise<ApiResponse<{
    total: number;
    queued: number;
    skipped: number;
    alreadyExists: number;
    results: Array<{
      url: string;
      queueId?: string;
      restaurantId?: number;
      position?: number;
      status: 'queued' | 'duplicate' | 'already_exists' | 'error';
      error?: string;
    }>;
  }>> {
    return this.request<{
      total: number;
      queued: number;
      skipped: number;
      alreadyExists: number;
      results: Array<{
        url: string;
        queueId?: string;
        restaurantId?: number;
        position?: number;
        status: 'queued' | 'duplicate' | 'already_exists' | 'error';
        error?: string;
      }>;
    }>('/api/crawler/bulk-queue', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }
}

// 싱글톤 인스턴스 export
export const apiService = new ApiService();
