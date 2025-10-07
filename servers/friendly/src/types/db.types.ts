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
  crawled_at: string;
}

/**
 * Crawl Job DB entity
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
 */
export interface CrawlJobInput {
  job_id: string;
  restaurant_id: number;
  place_id: string;
  url: string;
  status: string;
}
