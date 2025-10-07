/**
 * API Service for backend communication
 */

import { Platform } from 'react-native';

// API 기본 설정
const API_PORT = 4000;

const getDefaultApiUrl = (): string => {
  // 안드로이드 에뮬레이터는 10.0.2.2를 사용해야 호스트의 localhost에 접근 가능
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${API_PORT}`;
  }

  // 웹 환경: 현재 브라우저의 호스트 사용 (localhost, IP, 도메인 자동 감지)
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:${API_PORT}`;
  }

  // iOS 및 기타: localhost 사용
  return `http://localhost:${API_PORT}`;
}

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

export interface ReviewData {
  id: number;
  userName: string | null;
  visitKeywords: string[];
  waitTime: string | null;
  reviewText: string | null;
  emotionKeywords: string[];
  visitInfo: VisitInfo;
  crawledAt: string;
  createdAt: string;
}

export interface ReviewListResponse {
  total: number;
  limit: number;
  offset: number;
  reviews: ReviewData[];
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
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
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
   * 네이버 맵 음식점 크롤링
   */
  async crawlRestaurant(request: CrawlRestaurantRequest): Promise<ApiResponse<RestaurantInfo>> {
    return this.request<RestaurantInfo>('/api/crawler/restaurant', {
      method: 'POST',
      body: JSON.stringify(request),
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
  async getRestaurants(limit: number = 20, offset: number = 0): Promise<ApiResponse<RestaurantListResponse>> {
    return this.request<RestaurantListResponse>(`/api/restaurants?limit=${limit}&offset=${offset}`, {
      method: 'GET',
    });
  }

  /**
   * Restaurant ID로 리뷰 조회
   */
  async getReviewsByRestaurantId(restaurantId: number, limit: number = 20, offset: number = 0): Promise<ApiResponse<ReviewListResponse>> {
    return this.request<ReviewListResponse>(`/api/restaurants/${restaurantId}/reviews?limit=${limit}&offset=${offset}`, {
      method: 'GET',
    });
  }
}

// 싱글톤 인스턴스 export
export const apiService = new ApiService();
