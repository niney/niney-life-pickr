// 크롤링 관련 타입 정의

/**
 * 메뉴 아이템 정보
 */
export interface MenuItem {
  /** 메뉴 이름 */
  name: string;
  /** 메뉴 설명 (선택) */
  description?: string;
  /** 메뉴 가격 */
  price: string;
  /** 메뉴 이미지 URL (선택) */
  image?: string;
  /** AI가 정규화한 메뉴 이름 (음식명|메뉴명, 선택) */
  normalizedName?: string;
}

/**
 * 좌표 정보
 */
export interface Coordinates {
  /** 위도 */
  lat: number;
  /** 경도 */
  lng: number;
}

/**
 * 장소 기본 정보
 */
export interface PlaceInfo {
  /** 장소 이름 */
  name: string;
  /** 주소 */
  address: string | null;
  /** 카테고리 (예: 한식, 중식, 일식) */
  category: string | null;
  /** 전화번호 */
  phone: string | null;
  /** 설명 */
  description: string | null;
  /** 영업시간 */
  businessHours: string | null;
  /** 좌표 */
  coordinates: Coordinates | null;
  /** 원본 URL */
  url: string;
  /** 네이버 Place ID */
  placeId: string | null;
  /** 장소 이름 (name과 동일, 호환성) */
  placeName: string | null;
  /** 크롤링 시간 */
  crawledAt: string;
}

/**
 * 음식점 정보 (메뉴 포함)
 */
export interface RestaurantInfo extends PlaceInfo {
  /** 메뉴 목록 */
  menuItems?: MenuItem[];
}

/**
 * 방문 정보
 */
export interface VisitInfo {
  /** 방문 날짜 */
  visitDate: string | null;
  /** 방문 횟수 (예: "3번째 방문") */
  visitCount: string | null;
  /** 인증 방법 (예: "영수증 인증", "카드결제 인증") */
  verificationMethod: string | null;
}

/**
 * 리뷰 정보
 */
export interface ReviewInfo {
  /** 작성자 이름 */
  userName: string | null;
  /** 방문 키워드 (예: ["혼밥", "재방문"]) */
  visitKeywords: string[];
  /** 대기시간 (예: "바로 입장", "30분 대기") */
  waitTime: string | null;
  /** 리뷰 텍스트 */
  reviewText: string | null;
  /** 감정 키워드 (예: ["맛있어요", "친절해요"]) */
  emotionKeywords: string[];
  /** 방문 정보 */
  visitInfo: VisitInfo;
  /** 리뷰 이미지 파일 경로 (예: ["/images/reviews/1234/abc123/0.jpg"]) */
  images?: string[];
}

/**
 * 크롤링 결과 (성공/실패)
 */
export interface CrawlResult<T> {
  /** 성공 여부 */
  success: boolean;
  /** 크롤링 데이터 (성공 시) */
  data?: T;
  /** 원본 URL (실패 시) */
  url?: string;
  /** 에러 메시지 (실패 시) */
  error?: string;
}

/**
 * 일괄 크롤링 응답
 */
export interface BulkCrawlResponse {
  /** 전체 URL 개수 */
  total: number;
  /** 성공한 개수 */
  successful: number;
  /** 실패한 개수 */
  failed: number;
  /** 개별 크롤링 결과 */
  results: CrawlResult<RestaurantInfo>[];
}

/**
 * 크롤링 옵션
 */
export interface CrawlOptions {
  /** 메뉴 크롤링 여부 (기본: true) */
  crawlMenus?: boolean;
  /** 리뷰 크롤링 여부 (기본: false) */
  crawlReviews?: boolean;
}
