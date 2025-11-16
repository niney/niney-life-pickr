/**
 * Job Socket 이벤트 등록 유틸리티
 * Web/Mobile JobMonitor에서 중복되는 Socket 이벤트 리스너 등록 로직 통합
 */

import type { Socket } from 'socket.io-client';
import type {
  Job,
  JobNewEventData,
  ProgressEventData,
  MenuProgressEventData,
  CompletionEventData,
  ErrorEventData,
  CancellationEventData,
  QueuedJob,
} from '../types';
import type { UseJobEventHandlersReturn } from '../hooks/useJobEventHandlers';
import { extractUniqueRestaurantIds } from './socket.utils';

/**
 * Queue 통계 타입
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
 * registerJobSocketEvents 파라미터 타입
 */
export interface RegisterJobSocketEventsParams {
  socket: Socket;
  handlers: UseJobEventHandlersReturn;
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  setSubscribedRooms: React.Dispatch<React.SetStateAction<Set<number>>>;
  setQueueItems: React.Dispatch<React.SetStateAction<QueuedJob[]>>;
  setQueueStats: React.Dispatch<React.SetStateAction<QueueStats>>;
  setIsLoading?: React.Dispatch<React.SetStateAction<boolean>>; // Web에서만 사용
}

/**
 * Job 및 Queue Socket 이벤트 리스너 일괄 등록
 *
 * @param params - 이벤트 등록에 필요한 socket 및 핸들러
 *
 * @example
 * ```typescript
 * const { handleProgressEvent, handleCompletionEvent, handleErrorEvent, handleCancellationEvent } = useJobEventHandlers({...});
 *
 * registerJobSocketEvents({
 *   socket: newSocket,
 *   handlers: { handleProgressEvent, handleCompletionEvent, handleErrorEvent, handleCancellationEvent },
 *   setSubscribedRooms,
 *   setQueueItems,
 *   setQueueStats
 * });
 * ```
 */
export function registerJobSocketEvents({
  socket,
  handlers,
  setJobs,
  setSubscribedRooms,
  setQueueItems,
  setQueueStats,
  setIsLoading,
}: RegisterJobSocketEventsParams): void {
  const { handleProgressEvent, handleCompletionEvent, handleErrorEvent, handleCancellationEvent } =
    handlers;

  // ==================== Job 초기 데이터 ====================

  /**
   * jobs:current_state - 초기 Job 리스트 수신
   */
  socket.on('jobs:current_state', (data: {
    total: number;
    jobs: Job[];
    timestamp: number;
  }) => {
    console.log('[JobMonitor] 초기 Job 리스트 수신:', data);
    setJobs(data.jobs);
    if (setIsLoading) {
      setIsLoading(false);
    }

    // 레스토랑 ID 목록 추출 (중복 제거)
    const restaurantIds = extractUniqueRestaurantIds(data.jobs);

    // 모든 레스토랑 Room 구독
    restaurantIds.forEach((restaurantId) => {
      setSubscribedRooms(prev => {
        if (prev.has(restaurantId)) return prev;
        socket.emit('subscribe:restaurant', restaurantId);
        console.log(`[JobMonitor] Restaurant Room 구독: ${restaurantId}`);
        const newSet = new Set(prev);
        newSet.add(restaurantId);
        return newSet;
      });
    });

    console.log(`[JobMonitor] ${data.jobs.length}개 Job 로딩 완료, ${restaurantIds.length}개 Room 구독`);
  });

  /**
   * jobs:error - Job 로딩 실패
   */
  socket.on('jobs:error', (error: { message: string; error: string }) => {
    console.error('[JobMonitor] Job 로딩 실패:', error);
    if (setIsLoading) {
      setIsLoading(false);
    }
  });

  // ==================== Job 이벤트 ====================

  /**
   * job:new - 새 Job 시작 알림
   * 새 레스토랑이면 Room 자동 구독
   */
  socket.on('job:new', (data: JobNewEventData) => {
    console.log('[JobMonitor] 새 Job 시작 알림:', data);

    setSubscribedRooms((prev) => {
      if (prev.has(data.restaurantId)) {
        console.log(`[JobMonitor] 이미 구독 중: restaurant:${data.restaurantId}`);
        return prev;
      }

      socket.emit('subscribe:restaurant', data.restaurantId);
      console.log(`[JobMonitor] 새 Restaurant Room 구독: ${data.restaurantId}`);

      const newSet = new Set(prev);
      newSet.add(data.restaurantId);
      return newSet;
    });
  });

  // ==================== Review 크롤링 이벤트 ====================

  socket.on('review:crawl_progress', (data: ProgressEventData) => {
    console.log('[JobMonitor] 크롤링 진행률:', data);
    handleProgressEvent(data, 'review:crawl_progress', 'review_crawl', { phase: 'crawl' });
  });

  socket.on('review:db_progress', (data: ProgressEventData) => {
    console.log('[JobMonitor] DB 저장 진행률:', data);
    handleProgressEvent(data, 'review:db_progress', 'review_crawl', { phase: 'db' });
  });

  socket.on('review:image_progress', (data: ProgressEventData) => {
    console.log('[JobMonitor] 이미지 다운로드 진행률:', data);
    handleProgressEvent(data, 'review:image_progress', 'review_crawl', { phase: 'image' });
  });

  socket.on('review:completed', (data: CompletionEventData) => {
    console.log('[JobMonitor] 리뷰 크롤링 완료:', data);
    handleCompletionEvent(data);
  });

  socket.on('review:error', (data: ErrorEventData) => {
    console.log('[JobMonitor] 리뷰 크롤링 실패:', data);
    handleErrorEvent(data);
  });

  socket.on('review:cancelled', (data: CancellationEventData) => {
    console.log('[JobMonitor] 리뷰 크롤링 취소:', data);
    handleCancellationEvent(data);
  });

  // ==================== Review 요약 이벤트 ====================

  socket.on('review_summary:progress', (data: ProgressEventData) => {
    console.log('[JobMonitor] 리뷰 요약 진행률:', data);
    handleProgressEvent(data, 'review_summary:progress', 'review_summary');
  });

  socket.on('review_summary:completed', (data: CompletionEventData) => {
    console.log('[JobMonitor] 리뷰 요약 완료:', data);
    handleCompletionEvent(data);
  });

  socket.on('review_summary:error', (data: ErrorEventData) => {
    console.log('[JobMonitor] 리뷰 요약 실패:', data);
    handleErrorEvent(data);
  });

  // ==================== Restaurant 크롤링 이벤트 ====================

  socket.on('restaurant:menu_progress', (data: MenuProgressEventData) => {
    console.log('[JobMonitor] 메뉴 크롤링 진행률:', data);
    handleProgressEvent(data, 'restaurant:menu_progress', 'restaurant_crawl', data.metadata);
  });

  // ==================== Queue 이벤트 ====================

  /**
   * queue:current_state - Queue 초기 상태 수신
   */
  socket.on(
    'queue:current_state',
    (data: { total: number; queue: QueuedJob[]; stats: QueueStats; timestamp: number }) => {
      console.log('[JobMonitor] Queue 초기 상태 수신:', data);
      setQueueItems(data.queue);
      setQueueStats(data.stats);
    }
  );

  /**
   * queue:job_added - Queue에 새 Job 추가됨
   */
  socket.on(
    'queue:job_added',
    (data: {
      queueId: string;
      type: string;
      restaurantId: number;
      restaurant?: {
        id: number;
        name: string;
        category: string | null;
        address: string | null;
      };
      position: number;
      timestamp: number;
    }) => {
      console.log('[JobMonitor] Queue에 Job 추가:', data);
      socket.emit('subscribe:queue');
    }
  );

  /**
   * queue:job_started - Queue Item 처리 시작
   */
  socket.on(
    'queue:job_started',
    (data: { queueId: string; type: string; restaurantId: number; timestamp: number }) => {
      console.log('[JobMonitor] Queue Item 처리 시작:', data);

      setQueueItems((prev) =>
        prev.map((item) =>
          item.queueId === data.queueId
            ? { ...item, queueStatus: 'processing', startedAt: new Date().toISOString() }
            : item
        )
      );
    }
  );

  /**
   * queue:job_completed - Queue Item 완료
   */
  socket.on(
    'queue:job_completed',
    (data: {
      queueId: string;
      jobId: string;
      type: string;
      restaurantId: number;
      timestamp: number;
    }) => {
      console.log('[JobMonitor] Queue Item 완료:', data);

      setQueueItems((prev) => prev.filter((item) => item.queueId !== data.queueId));
      setQueueStats((prev) => ({
        ...prev,
        processing: Math.max(0, prev.processing - 1),
      }));
    }
  );

  /**
   * queue:job_failed - Queue Item 실패
   */
  socket.on(
    'queue:job_failed',
    (data: {
      queueId: string;
      jobId?: string;
      type: string;
      restaurantId: number;
      error: string;
      timestamp: number;
    }) => {
      console.error('[JobMonitor] Queue Item 실패:', data);

      setQueueItems((prev) =>
        prev.map((item) =>
          item.queueId === data.queueId
            ? {
                ...item,
                queueStatus: 'failed',
                completedAt: new Date().toISOString(),
                error: data.error,
              }
            : item
        )
      );

      // 3초 후 Queue에서 제거
      setTimeout(() => {
        setQueueItems((prev) => prev.filter((item) => item.queueId !== data.queueId));
        setQueueStats((prev) => ({
          ...prev,
          processing: Math.max(0, prev.processing - 1),
        }));
      }, 3000);
    }
  );

  /**
   * queue:job_cancelled - Queue Item 취소됨
   */
  socket.on(
    'queue:job_cancelled',
    (data: { queueId: string; restaurantId: number; timestamp: number }) => {
      console.log('[JobMonitor] Queue Item 취소:', data);

      setQueueItems((prev) => prev.filter((item) => item.queueId !== data.queueId));
      setQueueStats((prev) => ({
        ...prev,
        waiting: Math.max(0, prev.waiting - 1),
      }));
    }
  );
}
