/**
 * 맛집 검색 관련 타입 정의
 */

/**
 * 검색 쿼리 파라미터
 */
export interface RestaurantSearchQuery {
  /** 검색 키워드 (맛집 이름, 주소 등) */
  keyword?: string
  /** 카테고리 필터 */
  category?: string
  /** 주소/지역 필터 */
  address?: string
  /** 최소 평점 */
  minRating?: number
  /** 최대 평점 */
  maxRating?: number
  /** 정렬 기준 (name, rating, distance 등) */
  sortBy?: 'name' | 'rating' | 'distance' | 'reviews'
  /** 정렬 방향 */
  sortOrder?: 'asc' | 'desc'
  /** 페이지 번호 */
  page?: number
  /** 페이지당 결과 수 */
  limit?: number
}

/**
 * 검색 결과 아이템
 */
export interface RestaurantSearchResult {
  /** 맛집 ID */
  id: number
  /** 맛집 이름 */
  name: string
  /** 주소 */
  address: string
  /** 카테고리 */
  category?: string
  /** 평점 */
  rating?: number
  /** 리뷰 수 */
  reviewCount?: number
  /** 거리 (미터 단위, 위치 기반 검색 시) */
  distance?: number
  /** 썸네일 이미지 URL */
  thumbnailUrl?: string
  /** 영업 상태 */
  isOpen?: boolean
}

/**
 * 검색 응답 데이터
 */
export interface RestaurantSearchResponse {
  /** 검색 결과 목록 */
  results: RestaurantSearchResult[]
  /** 전체 결과 수 */
  totalCount: number
  /** 현재 페이지 */
  currentPage: number
  /** 페이지당 결과 수 */
  pageSize: number
  /** 전체 페이지 수 */
  totalPages: number
  /** 검색에 사용된 쿼리 */
  query: RestaurantSearchQuery
}

/**
 * 검색 필터 옵션
 */
export interface SearchFilters {
  /** 선택된 카테고리 목록 */
  categories: string[]
  /** 평점 범위 */
  ratingRange: {
    min: number
    max: number
  }
  /** 거리 범위 (미터) */
  distanceRange?: {
    min: number
    max: number
  }
  /** 영업 중인 맛집만 표시 */
  openOnly: boolean
}

/**
 * 검색 상태
 */
export interface SearchState {
  /** 검색 쿼리 */
  query: RestaurantSearchQuery
  /** 검색 결과 */
  results: RestaurantSearchResult[]
  /** 로딩 상태 */
  isLoading: boolean
  /** 에러 메시지 */
  error: string | null
  /** 필터 설정 */
  filters: SearchFilters
}
