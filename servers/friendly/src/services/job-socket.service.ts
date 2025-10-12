/**
 * Job Socket Service (통합 Job + Socket 관리)
 * - Memory Job (jobManager)와 DB Job (jobRepository)를 함께 관리
 * - Socket 이벤트 자동 발행으로 실시간 상태 업데이트
 * - 단순화된 인터페이스: start, progress, complete, error, cancel
 * - Job ID만으로 모든 정보 자동 조회
 */

import jobManager from './job-manager.service';
import jobRepository from '../db/repositories/job.repository';
import { getSocketIO } from '../socket/socket';
import { getSocketEvent, JobEventType, JobEventData } from '../socket/events';
import { v4 as uuidv4 } from 'uuid';
import { JobProgress, JobType } from '../types/db.types';

export class JobService {
  /**
   * Socket 이벤트 발행 (통일된 방식)
   */
  private emitSocketEvent(
    type: JobType,
    restaurantId: number,
    status: JobEventType,
    data: JobEventData
  ): void {
    const eventName = getSocketEvent(type, status);
    if (!eventName) return; // 이벤트가 없으면 발행하지 않음

    const io = getSocketIO();
    io.to(`restaurant:${restaurantId}`).emit(eventName, data);
  }

  /**
   * START: Job 생성 + Socket 시작 알림
   * - ID 자동 생성 (옵션)
   * - Memory + DB Job 생성 (모든 타입 동일)
   * - Socket 이벤트 자동 발행
   */
  async start(params: {
    jobId?: string;
    type: JobType;
    restaurantId: number;
    metadata?: Record<string, any>;
  }): Promise<string> {
    // 1. Job ID 생성 (미제공 시 UUID 자동 생성)
    const jobId = params.jobId || uuidv4();

    // 2. 메모리 Job 생성 (모든 타입 동일하게 처리)
    jobManager.createJob(jobId, {
      type: params.type,
      restaurantId: params.restaurantId,
      ...(params.metadata || {})
    });

    // 3. DB Job 생성
    await jobRepository.create({
      id: jobId,
      type: params.type,
      restaurantId: params.restaurantId,
      metadata: params.metadata
    });

    console.log(`[JobService] Job 시작 - ID: ${jobId}, Type: ${params.type}`);

    // 4. Socket 이벤트 발행 (통일된 데이터 구조)
    const eventData: JobEventData = {
      jobId,
      type: params.type,
      restaurantId: params.restaurantId,
      status: 'started',
      timestamp: Date.now(),
      ...params.metadata
    };

    this.emitSocketEvent(params.type, params.restaurantId, 'started', eventData);

    return jobId;
  }

  /**
   * PROGRESS: 진행률 업데이트 + Socket 진행 알림
   * - DB에서 Job 조회하여 type, restaurantId 자동 획득
   * - Memory + DB 업데이트 (메모리 Job은 항상 존재)
   * - Socket 이벤트 자동 발행
   */
  async progress(
    jobId: string,
    current: number,
    total: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    // 1. DB에서 Job 조회 (type, restaurantId 획득)
    const dbJob = await jobRepository.findById(jobId);
    if (!dbJob) {
      console.error(`[JobService] Job not found: ${jobId}`);
      return;
    }

    const percentage = Math.floor((current / total) * 100);
    const progress: JobProgress = { current, total, percentage };

    // 2. 메모리 업데이트 (모든 Job이 메모리 Job 보유)
    jobManager.updateProgress(jobId, current, total);

    // 3. DB 업데이트
    await jobRepository.updateProgress(jobId, progress);

    console.log(
      `[JobService] 진행률 업데이트 - ${current}/${total} (${percentage}%)`
    );

    // 4. Socket 이벤트 발행 (통일된 데이터 구조)
    const eventData: JobEventData = {
      jobId,
      type: dbJob.type,
      restaurantId: dbJob.restaurant_id,
      status: 'progress',
      current,
      total,
      percentage,
      sequence: current,
      timestamp: Date.now(),
      ...metadata
    };

    this.emitSocketEvent(dbJob.type, dbJob.restaurant_id, 'progress', eventData);
  }

  /**
   * COMPLETE: Job 완료 + Socket 완료 알림
   * - DB에서 Job 조회하여 type, restaurantId 자동 획득
   * - Memory + DB 완료 처리 (메모리 Job은 항상 존재)
   * - Socket 이벤트 자동 발행
   */
  async complete(
    jobId: string,
    result?: Record<string, any>
  ): Promise<void> {
    // 1. DB에서 Job 조회 (type, restaurantId 획득)
    const dbJob = await jobRepository.findById(jobId);
    if (!dbJob) {
      console.error(`[JobService] Job not found: ${jobId}`);
      return;
    }

    // 2. 메모리 완료 (모든 Job이 메모리 Job 보유)
    jobManager.completeJob(jobId, result as any);

    // 3. DB 완료
    await jobRepository.complete(jobId, result);

    console.log(`[JobService] Job 완료 - ID: ${jobId}`);

    // 4. Socket 이벤트 발행 (통일된 데이터 구조)
    const eventData: JobEventData = {
      jobId,
      type: dbJob.type,
      restaurantId: dbJob.restaurant_id,
      status: 'completed',
      timestamp: Date.now(),
      ...result
    };

    this.emitSocketEvent(dbJob.type, dbJob.restaurant_id, 'completed', eventData);
  }

  /**
   * ERROR: Job 실패 + Socket 에러 알림
   * - DB에서 Job 조회하여 type, restaurantId 자동 획득
   * - Memory + DB 실패 처리 (메모리 Job은 항상 존재)
   * - Socket 이벤트 자동 발행
   */
  async error(
    jobId: string,
    errorMessage: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    // 1. DB에서 Job 조회 (type, restaurantId 획득)
    const dbJob = await jobRepository.findById(jobId);
    if (!dbJob) {
      console.error(`[JobService] Job not found: ${jobId}`);
      return;
    }

    // 2. 메모리 실패 (모든 Job이 메모리 Job 보유)
    jobManager.failJob(jobId, errorMessage);

    // 3. DB 실패
    await jobRepository.fail(jobId, errorMessage);

    console.error(`[JobService] Job 실패 - ID: ${jobId}, Error: ${errorMessage}`);

    // 4. Socket 이벤트 발행 (통일된 데이터 구조)
    const eventData: JobEventData = {
      jobId,
      type: dbJob.type,
      restaurantId: dbJob.restaurant_id,
      status: 'error',
      error: errorMessage,
      timestamp: Date.now(),
      ...metadata
    };

    this.emitSocketEvent(dbJob.type, dbJob.restaurant_id, 'error', eventData);
  }

  /**
   * CANCEL: Job 취소 + Socket 취소 알림
   * - DB에서 Job 조회하여 type, restaurantId 자동 획득
   * - Memory + DB 취소 처리 (메모리 Job은 항상 존재)
   * - Socket 이벤트 자동 발행
   */
  async cancel(
    jobId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    // 1. DB에서 Job 조회 (type, restaurantId 획득)
    const dbJob = await jobRepository.findById(jobId);
    if (!dbJob) {
      console.error(`[JobService] Job not found: ${jobId}`);
      return;
    }

    // 2. 메모리 취소 (모든 Job이 메모리 Job 보유, AbortController 신호 전송)
    jobManager.cancelJob(jobId);

    // 3. DB 취소
    await jobRepository.cancel(jobId);

    console.log(`[JobService] Job 취소 - ID: ${jobId}`);

    // 4. Socket 이벤트 발행 (통일된 데이터 구조)
    const eventData: JobEventData = {
      jobId,
      type: dbJob.type,
      restaurantId: dbJob.restaurant_id,
      status: 'cancelled',
      timestamp: Date.now(),
      ...metadata
    };

    this.emitSocketEvent(dbJob.type, dbJob.restaurant_id, 'cancelled', eventData);
  }

  // ==================== 유틸리티 메서드 ====================

  /**
   * Job 조회 (메모리 우선, 없으면 DB 조회)
   */
  async getJob(jobId: string) {
    // 1. 메모리에서 먼저 조회 (빠름)
    const memoryJob = jobManager.getJob(jobId);
    if (memoryJob) {
      return { source: 'memory', job: memoryJob };
    }

    // 2. DB에서 조회 (서버 재시작 시)
    const dbJob = await jobRepository.findById(jobId);
    if (dbJob) {
      return { source: 'database', job: dbJob };
    }

    return null;
  }

  /**
   * 취소 여부 확인
   */
  isCancelled(jobId: string): boolean {
    return jobManager.isCancelled(jobId);
  }

  /**
   * 레스토랑의 활성 Job 조회 (DB 기준)
   */
  async findActiveJobsByRestaurant(restaurantId: number) {
    return jobRepository.findActiveByRestaurant(restaurantId);
  }

  /**
   * Socket 진행률 이벤트만 발행 (DB 저장 없음)
   * - 크롤링 진행률처럼 실시간 업데이트만 필요한 경우 사용
   * - DB 업데이트 없이 Socket 이벤트만 전송
   */
  emitProgressSocketEvent(
    jobId: string,
    restaurantId: number,
    eventName: string,
    progress: {
      current: number;
      total: number;
      metadata?: Record<string, any>;
    }
  ): void {
    const io = getSocketIO();
    const percentage = Math.floor((progress.current / progress.total) * 100);

    const eventData: JobEventData = {
      jobId,
      type: 'review_crawl', // 타입은 필요에 따라 조정 가능
      restaurantId,
      status: 'progress',
      current: progress.current,
      total: progress.total,
      percentage,
      sequence: progress.current,
      timestamp: Date.now(),
      ...progress.metadata
    };

    io.to(`restaurant:${restaurantId}`).emit(eventName, eventData);
  }
}

export const jobService = new JobService();
export default jobService;
