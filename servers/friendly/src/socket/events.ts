/**
 * Socket.io 이벤트 상수
 */
export const SOCKET_EVENTS = {
  // 리뷰 크롤링 이벤트
  REVIEW_STARTED: 'review:started',
  REVIEW_CRAWL_PROGRESS: 'review:crawl_progress',  // 크롤링 진행 상황
  REVIEW_DB_PROGRESS: 'review:db_progress',        // DB 저장 진행 상황
  REVIEW_COMPLETED: 'review:completed',
  REVIEW_ERROR: 'review:error',
  REVIEW_CANCELLED: 'review:cancelled',
  
  // 리뷰 요약 이벤트
  REVIEW_SUMMARY_STARTED: 'review_summary:started',
  REVIEW_SUMMARY_PROGRESS: 'review_summary:progress',
  REVIEW_SUMMARY_COMPLETED: 'review_summary:completed',
  REVIEW_SUMMARY_ERROR: 'review_summary:error',
} as const;

export type SocketEventType = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];
