/**
 * Job 포맷팅 유틸리티
 * Web/Mobile JobMonitor에서 공통으로 사용하는 UI 헬퍼 함수
 */

import type { Job, QueuedJob, JobType, QueueStatus } from '../types';
import type { ThemeColors } from '../constants';

/**
 * Job 타입 → 한글 라벨
 */
export function getTypeLabel(type: JobType): string {
  if (type === 'restaurant_crawl') {
    return '레스토랑 크롤링';
  }
  return type;
}

/**
 * Job 진행 단계 → 한글 라벨
 * metadata의 step, substep 정보를 기반으로 상세 라벨 반환
 */
export function getPhaseLabel(job: Job): string {
  if (job.type === 'restaurant_crawl') {
    const step = job.metadata?.step;
    const substep = job.metadata?.substep;

    if (step === 'crawling') return '웹 크롤링 중';
    if (step === 'menu') {
      if (substep === 'normalizing') return '메뉴 정규화 중';
      if (substep === 'saving') return 'DB 저장 중';
      return '메뉴 처리 중';
    }
    return '레스토랑 정보 수집 중';
  }

  return '';
}

/**
 * Job 상태 → 색상
 */
export function getStatusColor(job: Job, colors: ThemeColors): string {
  if (job.isInterrupted) return '#f59e0b'; // warning color

  switch (job.status) {
    case 'active':
      return colors.primary;
    case 'completed':
      return colors.success;
    case 'failed':
      return colors.error;
    case 'cancelled':
      return colors.textSecondary;
    default:
      return colors.text;
  }
}

/**
 * Job 상태 → 텍스트
 */
export function getStatusText(job: Job): string {
  if (job.isInterrupted) return '⚠️ 중단됨';

  switch (job.status) {
    case 'active':
      return '▶ 실행 중';
    case 'completed':
      return '✅ 완료';
    case 'failed':
      return '❌ 실패';
    case 'cancelled':
      return '🚫 취소됨';
    default:
      return job.status;
  }
}

/**
 * Queue 상태 → 색상
 */
export function getQueueStatusColor(status: QueueStatus, colors: ThemeColors): string {
  switch (status) {
    case 'waiting':
      return colors.textSecondary;
    case 'processing':
      return colors.primary;
    case 'completed':
      return '#22c55e';
    case 'failed':
      return '#ef4444';
    case 'cancelled':
      return '#94a3b8';
    default:
      return colors.textSecondary;
  }
}

/**
 * Queue 상태 → 텍스트
 */
export function getQueueStatusText(item: QueuedJob): string {
  switch (item.queueStatus) {
    case 'waiting':
      return `대기 중 (${item.position}번째)`;
    case 'processing':
      return '처리 중';
    case 'completed':
      return '완료';
    case 'failed':
      return '실패';
    case 'cancelled':
      return '취소됨';
    default:
      return item.queueStatus;
  }
}

/**
 * Queue Job 타입 → 한글 라벨
 * (getTypeLabel과 동일하지만 QueuedJob 전용)
 */
export function getQueueTypeLabel(type: QueuedJob['type']): string {
  return getTypeLabel(type);
}
