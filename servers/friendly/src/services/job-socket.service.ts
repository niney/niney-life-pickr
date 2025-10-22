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
import { JobType } from '../types/db.types';

export class JobService {
  // ==================== Socket 이벤트 발행 ====================

  /**
   * Socket 이벤트 발행 (기본)
   * - 모든 Socket 이벤트는 이 메서드를 통해 발행
   * - JobType에 매핑된 표준 이벤트명 사용
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
   * Socket 진행률 이벤트 발행 (커스텀 이벤트명)
   * - 실시간 진행률 전송용 (DB 저장 없음)
   * - 크롤링/이미지 다운로드 등 커스텀 이벤트명이 필요한 경우 사용
   * - 내부적으로 Socket.IO 직접 호출 (표준 JobType 이벤트가 아니므로)
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
    const percentage = Math.floor((progress.current / progress.total) * 100);

    const eventData: JobEventData = {
      jobId,
      type: 'review_crawl', // 커스텀 이벤트이므로 type은 참고용
      restaurantId,
      status: 'progress',
      current: progress.current,
      total: progress.total,
      percentage,
      sequence: progress.current,
      timestamp: Date.now(),
      ...progress.metadata
    };

    // 커스텀 이벤트명으로 Socket 발행
    const io = getSocketIO();
    io.to(`restaurant:${restaurantId}`).emit(eventName, eventData);
  }

  // ==================== Job 생명주기 관리 ====================

  /**
   * START: Job 생성 + Socket 시작 알림
   * - 기존 Job 확인 및 종료 (중복 방지)
   * - ID 자동 생성 (옵션)
   * - Memory + DB Job 생성
   * - Socket 이벤트 자동 발행
   */
  async start(params: {
    jobId?: string;
    type?: JobType;  // 선택적, 기본값 'restaurant_crawl'
    restaurantId: number;
    metadata?: Record<string, any>;
  }): Promise<string> {
    const type = params.type || 'restaurant_crawl';  // 기본값 설정

    // 0. 기존 Job 확인 및 종료
    console.log(`[JobService] Restaurant ${params.restaurantId} - 기존 Job 확인 중...`);

    // 0-1. 메모리에서 기존 Job 확인
    const existingMemoryJob = jobManager.findJobByRestaurantAndType(params.restaurantId, type);
    if (existingMemoryJob) {
      console.log(`[JobService] 메모리에서 기존 Job 발견: ${existingMemoryJob.jobId} - 종료 처리`);
      jobManager.terminateJob(existingMemoryJob.jobId);
    }

    // 0-2. DB에서 기존 Job 확인
    const existingDbJob = await jobRepository.findByRestaurantAndType(params.restaurantId, type);
    if (existingDbJob) {
      console.log(`[JobService] DB에서 기존 Job 발견: ${existingDbJob.id} - 삭제 예정 (UPSERT)`);
      // DB는 create() 메서드에서 자동 삭제됨 (UNIQUE 제약 조건 우회)
    }

    // 1. Job ID 생성 (미제공 시 UUID 자동 생성)
    const jobId = params.jobId || uuidv4();

    // 2. 메모리 Job 생성
    jobManager.createJob(jobId, {
      type,
      restaurantId: params.restaurantId,
      ...(params.metadata || {})
    });

    // 3. DB Job 생성 (기존 Job 자동 삭제 후 생성)
    await jobRepository.create({
      id: jobId,
      restaurantId: params.restaurantId,
      metadata: {
        type,
        ...params.metadata
      }
    });

    console.log(`[JobService] Job 시작 - ID: ${jobId}, Type: ${type}, Restaurant: ${params.restaurantId}`);

    // 4. Socket 이벤트 발행
    const eventData: JobEventData = {
      jobId,
      type,
      restaurantId: params.restaurantId,
      status: 'started',
      timestamp: Date.now(),
      ...params.metadata
    };

    this.emitSocketEvent(type, params.restaurantId, 'started', eventData);

    return jobId;
  }

  /**
   * UPDATE: 메타데이터 업데이트 + Socket 이벤트 (진행률 포함)
   * - Job의 metadata를 업데이트하고 Socket 이벤트 발행
   * - DB 저장 없이 Socket 통신만 수행
   * - 진행률 업데이트에도 사용 가능
   * 
   * @deprecated 현재는 start/complete만 사용. 향후 필요 시 사용
   */
  async update(
    jobId: string,
    metadata: Record<string, any>,
    eventType?: 'progress' | 'custom'
  ): Promise<void> {
    // 1. DB에서 Job 조회 (type, restaurantId 획득)
    const dbJob = await jobRepository.findById(jobId);
    if (!dbJob) {
      console.error(`[JobService] Job not found: ${jobId}`);
      return;
    }

    console.log(`[JobService] Job 업데이트 (Socket만) - ID: ${jobId}`);

    // 2. Socket 이벤트 발행
    const status: JobEventType = eventType === 'progress' ? 'progress' : 'started';
    const eventData: JobEventData = {
      jobId,
      type: dbJob.type,
      restaurantId: dbJob.restaurant_id,
      status,
      timestamp: Date.now(),
      ...metadata
    };

    this.emitSocketEvent(dbJob.type, dbJob.restaurant_id, status, eventData);
  }

  /**
   * PROGRESS: 진행률 업데이트 + Socket 진행 알림
   * - update() 메서드를 활용하여 진행률 업데이트
   * - DB 저장 없이 Socket 통신만 수행
   * 
   * @deprecated 현재는 start/complete만 사용. 향후 필요 시 사용
   */
  async progress(
    jobId: string,
    current: number,
    total: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    const percentage = Math.floor((current / total) * 100);

    console.log(
      `[JobService] 진행률 업데이트 (Socket만) - ${current}/${total} (${percentage}%)`
    );

    // update() 메서드를 사용하여 진행률 Socket 이벤트 발행
    await this.update(
      jobId,
      {
        current,
        total,
        percentage,
        sequence: current,
        ...metadata
      },
      'progress'
    );
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

  // ==================== Job Chain ====================

  /**
   * Job Chain 실행 (순차적 백그라운드 실행)
   * - 모든 Job을 순차적으로 실행
   * - 중간 실패 시 체인 중단
   * - 각 Job별 Socket 이벤트 자동 발행
   */
  async executeChain(config: {
    jobs: Array<{
      type: JobType;
      execute: () => Promise<void>;
      metadata?: Record<string, any>;
    }>;
    restaurantId: number;
    onComplete?: (results: any[]) => void;
    onError?: (error: Error, failedJobIndex: number) => void;
  }): Promise<void> {
    const { jobs, restaurantId, onComplete, onError } = config;
    const results: any[] = [];

    console.log(`[Job Chain] 시작 - 레스토랑 ${restaurantId}, ${jobs.length}개 Job`);

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];

      try {
        // Job 시작
        const jobId = await this.start({
          type: job.type,
          restaurantId,
          metadata: job.metadata
        });

        console.log(`[Job Chain ${i + 1}/${jobs.length}] Job ${jobId} (${job.type}) 시작`);

        // Job 실행 (완료까지 대기)
        await job.execute();
        results.push({ jobId, type: job.type, success: true });

        // Job 완료
        await this.complete(jobId, { chainIndex: i, chainTotal: jobs.length });

        console.log(`[Job Chain ${i + 1}/${jobs.length}] Job ${jobId} 완료`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Job Chain ${i + 1}/${jobs.length}] Job 실패:`, errorMessage);

        results.push({ type: job.type, success: false, error: errorMessage });

        // 에러 콜백 실행
        if (onError) {
          onError(error as Error, i);
        }

        // 체인 중단
        throw error;
      }
    }

    // 모든 Job 완료
    console.log(`[Job Chain] 완료 - 레스토랑 ${restaurantId}`);

    if (onComplete) {
      onComplete(results);
    }
  }
}

export const jobService = new JobService();
export default jobService;
