/**
 * Job 관련 헬퍼 함수
 * Web/Mobile JobMonitor에서 공통으로 사용
 */

import type { Job, JobType, ProgressEventData, MenuProgressEventData } from '../types';

/**
 * Progress 이벤트 데이터로부터 Job 객체 생성
 * - job:new를 놓쳤거나 네트워크 이슈로 Job이 없을 때 방어 로직
 * - 새로운 Job을 active 상태로 생성
 *
 * @param data - Progress 이벤트 데이터
 * @param type - Job 타입
 * @param additionalMetadata - 추가 메타데이터 (phase, step 등)
 * @returns 생성된 Job 객체
 */
export function createJobFromProgress(
  data: ProgressEventData | MenuProgressEventData,
  type: JobType,
  additionalMetadata?: Record<string, string | number>
): Job {
  console.log(`[JobHelpers] 새 Job 추가 (${type}):`, data.jobId);

  return {
    jobId: data.jobId,
    restaurantId: data.restaurantId,
    type,
    status: 'active',
    isInterrupted: false,
    progress: {
      current: data.current || 0,
      total: data.total || 0,
      percentage: data.percentage || 0,
    },
    metadata: additionalMetadata || {},
    createdAt: new Date(data.timestamp || Date.now()).toISOString(),
    startedAt: new Date(data.timestamp || Date.now()).toISOString(),
  };
}
