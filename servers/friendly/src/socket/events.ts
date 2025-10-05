/**
 * Socket.io 이벤트 상수
 */
export const SOCKET_EVENTS = {
  // 리뷰 크롤링 이벤트
  REVIEW_STARTED: 'review:started',
  REVIEW_PROGRESS: 'review:progress',
  REVIEW_ITEM: 'review:item',
  REVIEW_COMPLETED: 'review:completed',
  REVIEW_ERROR: 'review:error',
  REVIEW_CANCELLED: 'review:cancelled',
} as const;

export type SocketEventType = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];
