/**
 * Socket.io 이벤트 데이터 타입 정의
 * JobMonitorScreen, SocketContext에서 공통으로 사용
 */

/**
 * 진행률 이벤트 데이터
 */
export interface ProgressEventData {
  jobId: string;
  restaurantId: number;
  sequence?: number;
  current: number;
  total: number;
  percentage: number;
  timestamp?: number;
}

/**
 * 완료 이벤트 데이터
 */
export interface CompletionEventData {
  jobId: string;
  timestamp: number;
}

/**
 * 에러 이벤트 데이터
 */
export interface ErrorEventData {
  jobId: string;
  error: string;
}

/**
 * 취소 이벤트 데이터
 */
export interface CancellationEventData {
  jobId: string;
}

/**
 * 새 Job 시작 이벤트 데이터
 */
export interface JobNewEventData {
  jobId: string;
  type: string;
  restaurantId: number;
  timestamp: number;
}

/**
 * 메뉴 진행률 이벤트 데이터 (메타데이터 포함)
 */
export interface MenuProgressEventData extends ProgressEventData {
  metadata?: Record<string, string | number>;
}

/**
 * Queue 대기열 Job 데이터
 */
export interface QueuedJob {
  queueId: string;
  jobId: string | null;
  type: 'review_crawl' | 'review_summary' | 'restaurant_crawl';
  restaurantId: number;
  restaurant?: {
    id: number;
    name: string;
    category: string | null;
    address: string | null;
  };
  metadata?: Record<string, any>;
  queueStatus: 'waiting' | 'processing' | 'completed' | 'failed' | 'cancelled';
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  position: number;
}

/**
 * 실행 중인 Job 데이터
 */
export interface ActiveJob {
  jobId: string;
  restaurantId: number;
  restaurant?: {
    id: number;
    name: string;
    category: string | null;
    address: string | null;
  };
  type: 'review_crawl' | 'review_summary' | 'restaurant_crawl';
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  isInterrupted: boolean;
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
  metadata?: Record<string, string | number | boolean>;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

/**
 * Queue 통계 데이터
 */
export interface QueueStats {
  total: number;
  waiting: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
}
