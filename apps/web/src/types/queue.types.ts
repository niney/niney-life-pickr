/**
 * Job Queue 관련 타입 정의
 */

export type QueueStatus = 'waiting' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type JobType = 'review_crawl' | 'review_summary' | 'restaurant_crawl';

/**
 * Queue에 저장되는 Job 정보
 */
export interface QueuedJob {
  queueId: string;
  jobId: string | null;
  type: JobType;
  restaurantId: number;
  metadata: {
    placeId: string;
    url: string;
    [key: string]: string | number | boolean;
  };
  queueStatus: QueueStatus;
  queuedAt: string; // ISO date string
  startedAt?: string;
  completedAt?: string;
  error?: string;
  position?: number; // UI 표시용 위치
}

/**
 * Queue 통계
 */
export interface QueueStats {
  total: number;
  waiting: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
}
