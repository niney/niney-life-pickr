/**
 * Database entity types
 */

export interface RestaurantDB {
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
export type JobType = 
  | 'review_crawl'      // 리뷰 크롤링
  | 'review_summary'    // 리뷰 요약
  | 'restaurant_crawl'; // 레스토랑 정보 크롤링

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
 * 타입별 메타데이터
 */
export interface ReviewCrawlMetadata {
  placeId: string;
  url: string;
  batchSize?: number;
}

export interface ReviewSummaryMetadata {
  useCloud: boolean;
  aiService: 'local' | 'cloud';
  batchSize?: number;
}

export interface RestaurantCrawlMetadata {
  placeId: string;
  url: string;
  includeMenus: boolean;
}

/**
 * 타입별 결과 데이터
 */
export interface ReviewCrawlResult {
  totalReviews: number;
  savedToDb: number;
  duplicates: number;
  crawlDuration: number;
}

export interface ReviewSummaryResult {
  total: number;
  completed: number;
  failed: number;
  duration: number;
  aiService: string;
}

export interface RestaurantCrawlResult {
  restaurantId: number;
  menusCount: number;
  imagesCount: number;
}

/**
 * Job 생성 파라미터
 */
export interface JobCreateParams<T extends JobType = JobType> {
  type: T;
  restaurantId: number;
  metadata?: T extends 'review_crawl' ? ReviewCrawlMetadata :
             T extends 'review_summary' ? ReviewSummaryMetadata :
             T extends 'restaurant_crawl' ? RestaurantCrawlMetadata :
             Record<string, any>;
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
