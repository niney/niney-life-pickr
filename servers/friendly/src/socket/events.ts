/**
 * Socket.io 이벤트 상수 및 유틸리티
 */
export const SOCKET_EVENTS = {
  // 레스토랑 크롤링 Job 이벤트
  RESTAURANT_CRAWL_STARTED: 'restaurant_crawl:started',
  RESTAURANT_CRAWL_PROGRESS: 'restaurant_crawl:progress',
  RESTAURANT_CRAWL_COMPLETED: 'restaurant_crawl:completed',
  RESTAURANT_CRAWL_ERROR: 'restaurant_crawl:error',
  RESTAURANT_CRAWL_CANCELLED: 'restaurant_crawl:cancelled',
  RESTAURANT_CRAWL_INTERRUPTED: 'restaurant_crawl:interrupted',

  // 레스토랑 메뉴 크롤링 이벤트 (커스텀 진행률)
  RESTAURANT_MENU_PROGRESS: 'restaurant:menu_progress',

  // 리뷰 크롤링 이벤트 (커스텀 진행률)
  REVIEW_CRAWL_PROGRESS: 'review:crawl_progress',
  REVIEW_IMAGE_PROGRESS: 'review:image_progress',
  REVIEW_DB_PROGRESS: 'review:db_progress',
  REVIEW_ERROR: 'review:error',
  REVIEW_CANCELLED: 'review:cancelled',
  REVIEW_INTERRUPTED: 'review:interrupted',

  // 리뷰 요약 이벤트 (커스텀 진행률)
  REVIEW_SUMMARY_PROGRESS: 'review_summary:progress',
  REVIEW_SUMMARY_ERROR: 'review_summary:error',
  REVIEW_SUMMARY_INTERRUPTED: 'review_summary:interrupted',

  // 캐치테이블 리뷰 크롤링 이벤트
  CATCHTABLE_REVIEW_PROGRESS: 'catchtable:review_progress',

  // 캐치테이블 리뷰 요약 이벤트
  CATCHTABLE_REVIEW_SUMMARY_PROGRESS: 'catchtable:review_summary_progress',
  CATCHTABLE_REVIEW_SUMMARY_ERROR: 'catchtable:review_summary_error',
} as const;

export type SocketEventType = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];

// Job 타입 (db.types.ts와 동일)
export type JobType = 'restaurant_crawl';

// Job 이벤트 타입
export type JobEventType = 'started' | 'progress' | 'completed' | 'error' | 'cancelled' | 'interrupted';

/**
 * Socket 이벤트 이름 자동 매핑
 * - type과 status에 따라 적절한 Socket 이벤트 이름 반환
 */
export function getSocketEvent(type: JobType, status: JobEventType): string {
  // restaurant_crawl 이벤트
  if (type === 'restaurant_crawl') {
    switch (status) {
      case 'started':
        return SOCKET_EVENTS.RESTAURANT_CRAWL_STARTED;
      case 'progress':
        return SOCKET_EVENTS.RESTAURANT_CRAWL_PROGRESS;
      case 'completed':
        return SOCKET_EVENTS.RESTAURANT_CRAWL_COMPLETED;
      case 'error':
        return SOCKET_EVENTS.RESTAURANT_CRAWL_ERROR;
      case 'cancelled':
        return SOCKET_EVENTS.RESTAURANT_CRAWL_CANCELLED;
      case 'interrupted':
        return SOCKET_EVENTS.RESTAURANT_CRAWL_INTERRUPTED;
    }
  }

  return '';
}

/**
 * Job 중단 이벤트 이름 가져오기
 * - 서버 재시작/에러로 Job이 중단되었을 때 사용
 */
export function getInterruptEventName(_type: JobType): string {
  return SOCKET_EVENTS.RESTAURANT_CRAWL_INTERRUPTED;
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

  // 중단 (interrupted일 때만)
  reason?: string;

  // 추가 데이터 (선택적)
  [key: string]: any;
}

