/**
 * 네이버 플레이스 검색 관련 타입 정의
 */

/**
 * 네이버 플레이스 아이템
 */
export interface NaverPlaceItem {
  /** 가게명 */
  name: string;
  /** 카테고리 */
  category?: string;
  /** 주소 */
  address?: string;
  /** 영업 상태 */
  status?: string;
  /** 리뷰 수 */
  reviewCount?: number;
  /** 광고 여부 */
  isAd: boolean;
  /** TV 출연 정보 */
  tvShow?: string | null;
  /** 예약 가능 여부 */
  hasReservation: boolean;
  /** 쿠폰 보유 여부 */
  hasCoupon: boolean;
  /** 이미지 URL 목록 */
  images: string[];
  /** 리뷰 스니펫 */
  reviewSnippets: string[];
  /** 네이버 Place ID */
  placeId?: string;
  /** 상세 페이지 URL */
  url?: string;
}

/**
 * 네이버 플레이스 검색 결과
 */
export interface NaverPlaceSearchResult {
  /** 검색 키워드 */
  keyword: string;
  /** 총 결과 수 */
  totalCount: number;
  /** 검색 결과 목록 */
  places: NaverPlaceItem[];
  /** 크롤링 시간 */
  crawledAt: string;
  /** 소요 시간 (ms) */
  duration: number;
}

/**
 * 검색 옵션
 */
export interface NaverPlaceSearchOptions {
  /** 최대 결과 수 (기본: 50) */
  maxResults?: number;
  /** 스크롤 활성화 여부 (기본: true) */
  enableScroll?: boolean;
  /** Headless 모드 여부 (기본: true) */
  headless?: boolean;
}
