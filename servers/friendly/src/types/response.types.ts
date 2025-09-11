/**
 * Common API Response Types
 */

/**
 * Standard API response structure
 */
export interface ApiResponse<T = any> {
  result: boolean;
  message: string;
  data?: T;
  timestamp?: string;
}

/**
 * Success response
 */
export interface SuccessResponse<T = any> extends ApiResponse<T> {
  result: true;
  data: T;
}

/**
 * Error response
 */
export interface ErrorResponse extends ApiResponse<never> {
  result: false;
  statusCode?: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Auth response data types
 */
export interface AuthResponseData {
  user: {
    id: number;
    email: string;
    username: string;
    provider?: string;
    created_at?: string;
    last_login?: string;
    is_active?: boolean;
  };
  token?: string; // For future JWT implementation
}

/**
 * User list response data
 */
export interface UserListResponseData {
  users: Array<{
    id: number;
    email: string;
    username: string;
    provider?: string;
    created_at?: string;
    last_login?: string;
    is_active?: boolean;
  }>;
  count: number;
}