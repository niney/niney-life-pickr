/**
 * Database entity types
 */

export interface RestaurantDB {
  id: number;
  place_id: string;
  catchtable_id: string | null;
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

export interface MenuDB {
  id: number;
  restaurant_id: number;
  name: string;
  description: string | null;
  price: string;
  image: string | null;
  normalized_name: string | null;  // AI가 정규화한 메뉴 이름
  created_at: string;
}

/**
 * Input types for database operations
 */
export interface RestaurantInput {
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
}

export interface MenuInput {
  name: string;
  description?: string | null;
  price: string;
  image?: string | null;
  normalized_name?: string | null;  // AI가 정규화한 메뉴 이름 (선택)
}

export interface MenuInsert extends MenuInput {
  restaurant_id: number;
}

/**
 * Review DB entity
 */
export interface ReviewDB {
  id: number;
  restaurant_id: number;
  user_name: string | null;
  visit_keywords: string | null;       // 쉼표 구분 문자열
  wait_time: string | null;
  review_text: string | null;
  emotion_keywords: string | null;     // 쉼표 구분 문자열
  visit_date: string | null;
  visit_count: string | null;
  verification_method: string | null;
  review_hash: string;
  images: string | null;                // JSON 배열 문자열 (이미지 경로)
  crawled_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Review Input (for DB insertion)
 */
export interface ReviewInput {
  restaurant_id: number;
  user_name: string | null;
  visit_keywords: string | null;
  wait_time: string | null;
  review_text: string | null;
  emotion_keywords: string | null;
  visit_date: string | null;
  visit_count: string | null;
  verification_method: string | null;
  review_hash: string;
  images: string | null;  // JSON 배열 문자열 (이미지 경로)
  crawled_at: string;
}

/**
 * Job Types (범용 작업 타입)
 */
export type JobType = 'restaurant_crawl'; // 레스토랑 정보 크롤링

/**
 * Job Status (작업 상태)
 */
export type JobStatus = 
  | 'pending'    // 대기 중
  | 'active'     // 진행 중
  | 'completed'  // 완료
  | 'failed'     // 실패
  | 'cancelled'; // 취소됨

/**
 * Job Progress (진행률)
 */
export interface JobProgress {
  current: number;
  total: number;
  percentage: number;
}

/**
 * Job DB entity (범용 작업 추적)
 */
export interface JobDB {
  id: string;
  type: JobType;
  restaurant_id: number;
  status: JobStatus;
  event_name: string | null;  // Socket 이벤트 이름 (예: 'review:crawl_progress')
  progress_current: number;
  progress_total: number;
  progress_percentage: number;
  metadata: string | null;  // JSON string
  result: string | null;    // JSON string
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 레스토랑 크롤링 메타데이터
 */
export interface RestaurantCrawlMetadata {
  placeId: string;
  url: string;
  includeMenus: boolean;
}

/**
 * 레스토랑 크롤링 결과 데이터
 */
export interface RestaurantCrawlResult {
  restaurantId: number;
  menusCount: number;
  imagesCount: number;
}

/**
 * Job 생성 파라미터
 */
export interface JobCreateParams {
  type: JobType;
  restaurantId: number;
  metadata?: RestaurantCrawlMetadata;
}

/**
 * Crawl Job DB entity (Deprecated - 호환성 유지용)
 * @deprecated Use JobDB instead
 */
export interface CrawlJobDB {
  id: number;
  job_id: string;
  restaurant_id: number;
  place_id: string;
  url: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'cancelled';
  progress_current: number;
  progress_total: number;
  progress_percentage: number;
  total_reviews: number | null;
  saved_to_db: number | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

/**
 * Crawl Job Input (for creation)
 * @deprecated Use JobCreateParams instead
 */
export interface CrawlJobInput {
  job_id: string;
  restaurant_id: number;
  place_id: string;
  url: string;
  status: string;
}

/**
 * Review Summary 상태
 */
export type ReviewSummaryStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * 메뉴별 감정 타입
 */
export type MenuItemSentiment = 'positive' | 'negative' | 'neutral';

/**
 * 메뉴 아이템 (감정 포함)
 */
export interface MenuItemWithSentiment {
  name: string;                      // 메뉴명
  sentiment: MenuItemSentiment;      // 해당 메뉴에 대한 감정
  reason?: string;                   // 감정 이유 (10자 이내)
}

/**
 * AI 요약 데이터 (JSON)
 */
export interface ReviewSummaryData {
  summary: string;
  keyKeywords: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentReason: string;
  satisfactionScore?: number;
  tips?: string[];
  menuItems?: MenuItemWithSentiment[];  // 리뷰에서 추출된 메뉴명/음식명 + 감정
}

/**
 * Review Summary DB entity
 */
export interface ReviewSummaryDB {
  id: number;
  review_id: number;
  restaurant_id: number;
  status: ReviewSummaryStatus;
  summary_data: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Review Summary Input
 */
export interface ReviewSummaryInput {
  review_id: number;
  restaurant_id: number;
  status?: ReviewSummaryStatus;
  summary_data?: ReviewSummaryData | null;
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
 * 레스토랑 메뉴 통계
 */
export interface RestaurantMenuStatistics {
  restaurantId: number;
  totalReviews: number;
  analyzedReviews: number;
  menuStatistics: MenuSentimentStats[];
  topPositiveMenus: Array<{
    menuName: string;
    positiveRate: number;
    mentions: number;
  }>;
  topNegativeMenus: Array<{
    menuName: string;
    negativeRate: number;
    mentions: number;
  }>;
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

/**
 * 레스토랑 순위 정보
 */
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

/**
 * 레스토랑 순위 응답
 */
export interface RestaurantRankingsResponse {
  type: 'positive' | 'negative' | 'neutral';
  limit: number;
  minReviews: number;
  category?: string;
  rankings: RestaurantRanking[];
}

/**
 * 레스토랑 순위 요청 옵션
 */
export interface RankingOptions {
  type: 'positive' | 'negative' | 'neutral';
  limit: number;
  minReviews: number;
  category?: string;
  excludeNeutral?: boolean; // true: 긍정+부정 중에서 비율 계산, false: 전체 중에서 비율 계산 (기본값)
}

