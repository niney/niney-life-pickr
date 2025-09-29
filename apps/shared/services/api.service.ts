/**
 * API Service for backend communication
 */

// API 기본 설정
const API_BASE_URL = 'http://localhost:4000';

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
    try {
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
    } catch (error) {
      // 네트워크 에러 또는 기타 에러
      console.error('API request failed:', error);
      throw error;
    }
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
}

// 싱글톤 인스턴스 export
export const apiService = new ApiService();