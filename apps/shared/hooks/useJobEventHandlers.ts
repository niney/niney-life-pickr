/**
 * Job 이벤트 핸들러 Hook
 * Web/Mobile JobMonitor에서 공통으로 사용하는 Socket 이벤트 핸들러 제공
 */

import { useCallback } from 'react';
import type {
  Job,
  JobType,
  ProgressEventData,
  MenuProgressEventData,
  CompletionEventData,
  ErrorEventData,
  CancellationEventData,
} from '../types';
import { SocketSequenceManager, JobCompletionTracker, createJobFromProgress } from '../utils';

export interface UseJobEventHandlersParams {
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  sequenceManager: SocketSequenceManager;
  completionTracker: JobCompletionTracker;
}

export interface UseJobEventHandlersReturn {
  handleProgressEvent: (
    data: ProgressEventData | MenuProgressEventData,
    eventName: string,
    jobType: JobType,
    metadata?: Record<string, string | number>
  ) => void;
  handleCompletionEvent: (data: CompletionEventData) => void;
  handleErrorEvent: (data: ErrorEventData) => void;
  handleCancellationEvent: (data: CancellationEventData) => void;
}

/**
 * Job Socket 이벤트 핸들러 Hook
 *
 * @param params - setJobs, sequenceManager, completionTracker
 * @returns 4가지 이벤트 핸들러 (progress, completion, error, cancellation)
 *
 * @example
 * ```typescript
 * const sequenceManagerRef = useRef(new SocketSequenceManager());
 * const completionTrackerRef = useRef(new JobCompletionTracker());
 *
 * const {
 *   handleProgressEvent,
 *   handleCompletionEvent,
 *   handleErrorEvent,
 *   handleCancellationEvent
 * } = useJobEventHandlers({
 *   setJobs,
 *   sequenceManager: sequenceManagerRef.current,
 *   completionTracker: completionTrackerRef.current
 * });
 *
 * // Socket 이벤트 등록
 * socket.on('review:crawl_progress', (data) =>
 *   handleProgressEvent(data, 'review:crawl_progress', 'review_crawl', { phase: 'crawl' })
 * );
 * ```
 */
export function useJobEventHandlers({
  setJobs,
  sequenceManager,
  completionTracker,
}: UseJobEventHandlersParams): UseJobEventHandlersReturn {
  /**
   * Progress 이벤트 공통 핸들러
   * - Sequence 체크: 구 버전 이벤트 무시
   * - Completion 체크: 이미 완료된 Job 무시
   * - Job 없으면 새로 생성, 있으면 업데이트
   */
  const handleProgressEvent = useCallback(
    (
      data: ProgressEventData | MenuProgressEventData,
      eventName: string,
      jobType: JobType,
      metadata?: Record<string, string | number>
    ) => {
      const sequence = data.sequence || data.current || 0;

      // ✅ Sequence 체크: 구 버전 이벤트 무시
      if (!sequenceManager.check(data.jobId, eventName, sequence)) {
        return;
      }

      // ✅ 이미 완료된 Job 무시
      if (completionTracker.isCompleted(data.jobId)) {
        console.warn(`[JobEventHandlers] Ignoring completed job: ${data.jobId}`);
        return;
      }

      setJobs((prev) => {
        const existingJob = prev.find((job) => job.jobId === data.jobId);

        // Job이 없으면 새로 추가
        if (!existingJob) {
          return [createJobFromProgress(data, jobType, metadata), ...prev];
        }

        // 기존 Job 업데이트
        return prev.map((job) =>
          job.jobId === data.jobId
            ? {
                ...job,
                progress: {
                  current: data.current,
                  total: data.total,
                  percentage: data.percentage,
                },
                metadata: { ...job.metadata, ...metadata },
              }
            : job
        );
      });
    },
    [setJobs, sequenceManager, completionTracker]
  );

  /**
   * 완료 이벤트 공통 핸들러
   * - Job 완료 마킹 (completionTracker)
   * - Sequence 리셋 (sequenceManager)
   * - Job 상태를 'completed'로 변경
   */
  const handleCompletionEvent = useCallback(
    (data: CompletionEventData) => {
      completionTracker.markCompleted(data.jobId);
      sequenceManager.reset(data.jobId);

      setJobs((prev) =>
        prev.map((job) =>
          job.jobId === data.jobId
            ? {
                ...job,
                status: 'completed',
                completedAt: new Date(data.timestamp).toISOString(),
              }
            : job
        )
      );
    },
    [setJobs, sequenceManager, completionTracker]
  );

  /**
   * 에러 이벤트 공통 핸들러
   * - Job 완료 마킹 (completionTracker)
   * - Sequence 리셋 (sequenceManager)
   * - Job 상태를 'failed'로 변경, 에러 메시지 저장
   */
  const handleErrorEvent = useCallback(
    (data: ErrorEventData) => {
      completionTracker.markCompleted(data.jobId);
      sequenceManager.reset(data.jobId);

      setJobs((prev) =>
        prev.map((job) =>
          job.jobId === data.jobId ? { ...job, status: 'failed', error: data.error } : job
        )
      );
    },
    [setJobs, sequenceManager, completionTracker]
  );

  /**
   * 취소 이벤트 공통 핸들러
   * - Job 완료 마킹 (completionTracker)
   * - Sequence 리셋 (sequenceManager)
   * - Job 상태를 'cancelled'로 변경
   */
  const handleCancellationEvent = useCallback(
    (data: CancellationEventData) => {
      completionTracker.markCompleted(data.jobId);
      sequenceManager.reset(data.jobId);

      setJobs((prev) =>
        prev.map((job) => (job.jobId === data.jobId ? { ...job, status: 'cancelled' } : job))
      );
    },
    [setJobs, sequenceManager, completionTracker]
  );

  return {
    handleProgressEvent,
    handleCompletionEvent,
    handleErrorEvent,
    handleCancellationEvent,
  };
}
