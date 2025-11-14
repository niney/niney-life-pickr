/**
 * Job Queue 관련 타입 정의
 */

import { JobType } from '../socket/events';

/**
 * Queue 상태
 */
export type QueueStatus = 'waiting' | 'processing' | 'completed' | 'failed' | 'cancelled';

/**
 * Queue에 저장되는 Job 정보
 */
export interface QueuedJob {
  // ✅ Queue 고유 ID
  queueId: string;
  
  // ✅ Job 정보 (실제 Job이 시작되면 채워짐)
  jobId: string | null;
  
  // ✅ 크롤링 파라미터
  type: JobType;
  restaurantId: number;
  restaurant?: {
    id: number;
    name: string;
    category: string | null;
    address: string | null;
  };
  metadata: {
    placeId: string;
    url: string;
    [key: string]: any; // 추가 메타데이터
  };
  
  // ✅ Queue 상태
  queueStatus: QueueStatus;
  
  // ✅ 타임스탬프
  queuedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  
  // ✅ 에러 정보
  error?: string;
  
  // ✅ Queue 위치 (동적 계산, UI 표시용)
  position?: number;
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

/**
 * Queue Job 추가 파라미터
 */
export interface EnqueueJobParams {
  type: JobType;
  restaurantId: number;
  placeId: string;
  url: string;
  metadata?: Record<string, any>;
}
