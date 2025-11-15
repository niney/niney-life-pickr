// 공통 타입 정의는 services/api.service.ts에 정의되어 있습니다.
// 중복을 피하기 위해 이 파일은 비워두었습니다.

// Socket.io 이벤트 타입
export type {
  ProgressEventData,
  CompletionEventData,
  ErrorEventData,
  CancellationEventData,
  JobNewEventData,
  MenuProgressEventData,
  QueuedJob,
  ActiveJob,
  QueueStats,
} from './socket-events';
