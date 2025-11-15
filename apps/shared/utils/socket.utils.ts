/**
 * Socket 유틸리티 (클라이언트 전용)
 * - 클라이언트에서 사용하는 타입 정의
 */

/**
 * 진행률 데이터 인터페이스
 */
export interface ProgressData {
  current: number;
  total: number;
  percentage: number;
}

/**
 * 리뷰 크롤링 상태 (클라이언트 전용)
 * 서버 API의 ReviewCrawlStatus와 구분하기 위해 Client prefix 추가
 */
export interface ClientReviewCrawlStatus {
  status: 'idle' | 'active' | 'completed' | 'failed';
  error?: string;
}

/**
 * 리뷰 요약 진행률
 */
export interface SummaryProgress extends ProgressData {
  completed: number;
  failed: number;
}

/**
 * 리뷰 요약 상태
 */
export interface ReviewSummaryStatus {
  status: 'idle' | 'active' | 'completed' | 'failed' | 'interrupted';
  error?: string;
}

/**
 * Job 배열에서 유니크한 레스토랑 ID 목록 추출
 * - Set을 사용하여 중복 제거
 * - Restaurant Room 구독 등에 사용
 */
export const extractUniqueRestaurantIds = <T extends { restaurantId: number }>(
  jobs: T[]
): number[] => {
  return [...new Set(jobs.map((job) => job.restaurantId))];
};
