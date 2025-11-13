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
