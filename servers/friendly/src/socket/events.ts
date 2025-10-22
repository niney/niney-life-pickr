/**
 * Socket.io 이벤트 상수 및 유틸리티
 */
export const SOCKET_EVENTS = {
  // 레스토랑 크롤링 이벤트
  RESTAURANT_MENU_PROGRESS: 'restaurant:menu_progress',  // 메뉴 크롤링 진행 상황
  
  // 리뷰 크롤링 이벤트
  REVIEW_CRAWL_PROGRESS: 'review:crawl_progress',  // 크롤링 진행 상황
  REVIEW_IMAGE_PROGRESS: 'review:image_progress',  // 이미지 처리 진행 상황
  REVIEW_DB_PROGRESS: 'review:db_progress',        // DB 저장 진행 상황
  REVIEW_ERROR: 'review:error',
  REVIEW_CANCELLED: 'review:cancelled',
  
  // 리뷰 요약 이벤트
  REVIEW_SUMMARY_PROGRESS: 'review_summary:progress',
  REVIEW_SUMMARY_ERROR: 'review_summary:error',
} as const;

export type SocketEventType = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];

// Job 타입 (db.types.ts와 동일)
export type JobType = 'review_crawl' | 'review_summary' | 'restaurant_crawl';

// Job 이벤트 타입
export type JobEventType = 'started' | 'progress' | 'completed' | 'error' | 'cancelled';

/**
 * Socket 이벤트 이름 자동 매핑
 * - type과 status에 따라 적절한 Socket 이벤트 이름 반환
 */
export function getSocketEvent(type: JobType, status: JobEventType): string {
  const eventMap: Partial<Record<JobType, Partial<Record<JobEventType, string>>>> = {
    review_crawl: {
      progress: SOCKET_EVENTS.REVIEW_CRAWL_PROGRESS,
      error: SOCKET_EVENTS.REVIEW_ERROR,
      cancelled: SOCKET_EVENTS.REVIEW_CANCELLED
    },
    review_summary: {
      progress: SOCKET_EVENTS.REVIEW_SUMMARY_PROGRESS,
      error: SOCKET_EVENTS.REVIEW_SUMMARY_ERROR,
      cancelled: ''
    }
    // restaurant_crawl은 Socket 이벤트 없음 (메뉴 진행률은 커스텀 이벤트 사용)
  };
  
  return eventMap[type]?.[status] || '';
}

/**
 * 통일된 Job 이벤트 데이터
 */
export interface JobEventData {
  jobId: string;
  type: JobType;
  restaurantId: number;
  status: JobEventType;
  timestamp: number;
  
  // 진행률 (progress일 때만)
  current?: number;
  total?: number;
  percentage?: number;
  sequence?: number;
  
  // 에러 (error일 때만)
  error?: string;
  
  // 추가 데이터 (선택적)
  [key: string]: any;
}

