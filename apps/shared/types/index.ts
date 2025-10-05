// 공통 타입 정의들을 여기에 추가하세요

/**
 * Restaurant Category
 */
export interface RestaurantCategory {
  category: string;
  count: number;
}

/**
 * API Response Types
 */
export interface ApiResponse<T = any> {
  result: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  result: false;
  message: string;
  statusCode: number;
  timestamp: string;
}
