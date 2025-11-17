/**
 * Job Queue Manager
 * 메모리 기반 Queue 시스템으로 Job을 순차적으로 처리
 */

import { v4 as uuidv4 } from 'uuid';
import { getSocketIO } from '../socket/socket';
import { QueuedJob, QueueStats, EnqueueJobParams } from '../types/queue.types';
import { restaurantRepository } from '../db/repositories/restaurant.repository';

class JobQueueManager {
  private queue: QueuedJob[] = [];
  private isProcessing: boolean = false;

  constructor() {
    console.log('[JobQueueManager] Initialized');
  }

  /**
   * Queue에 Job 추가
   */
  async enqueue(params: EnqueueJobParams): Promise<string> {
    const { type, restaurantId, placeId, url, metadata = {} } = params;

    // 1. 중복 체크 (같은 restaurantId + waiting/processing 상태)
    const duplicate = this.queue.find(
      job =>
        job.restaurantId === restaurantId &&
        job.type === type &&
        (job.queueStatus === 'waiting' || job.queueStatus === 'processing')
    );

    if (duplicate) {
      throw new Error(
        `Job already queued for restaurant ${restaurantId} with type ${type} (queueId: ${duplicate.queueId})`
      );
    }

    // 2. Queue Item 생성
    const queuedJob: QueuedJob = {
      queueId: uuidv4(),
      jobId: null, // Job 시작 시 채워짐
      type,
      restaurantId,
      metadata: {
        placeId,
        url,
        ...metadata,
      },
      queueStatus: 'waiting',
      queuedAt: new Date(),
    };

    // 3. Queue에 추가
    this.queue.push(queuedJob);

    // 4. 레스토랑 정보 조회
    const restaurant = await restaurantRepository.findById(restaurantId);

    // 5. Socket 이벤트 발행 (queue:job_added) - 레스토랑 정보 포함
    const io = getSocketIO();
    io.emit('queue:job_added', {
      queueId: queuedJob.queueId,
      type: queuedJob.type,
      restaurantId: queuedJob.restaurantId,
      restaurant: restaurant ? {
        id: restaurant.id,
        name: restaurant.name,
        category: restaurant.category,
        address: restaurant.address,
      } : undefined,
      position: this.getWaitingCount() + this.getProcessingCount(),
      timestamp: Date.now(),
    });

    console.log(
      `[JobQueueManager] Job added to queue: ${queuedJob.queueId} (type: ${type}, restaurant: ${restaurantId}, position: ${this.queue.length})`
    );

    // 6. Worker 시작 (idle 상태면)
    this.startWorker();

    return queuedJob.queueId;
  }

  /**
   * Queue 조회 (Socket 통신용)
   * - 위치 정보 포함
   * - 레스토랑 정보 포함
   */
  async getQueueWithRestaurants(): Promise<QueuedJob[]> {
    return await Promise.all(
      this.queue.map(async (job, index) => {
        const restaurant = await restaurantRepository.findById(job.restaurantId);
        return {
          ...job,
          restaurant: restaurant ? {
            id: restaurant.id,
            name: restaurant.name,
            category: restaurant.category,
            address: restaurant.address,
          } : undefined,
          position: index + 1, // ✅ 동적 위치 계산
        };
      })
    );
  }

  /**
   * Queue 조회 (레거시, 레스토랑 정보 없음)
   * - 위치 정보 포함
   */
  getQueue(): QueuedJob[] {
    return this.queue.map((job, index) => ({
      ...job,
      position: index + 1, // ✅ 동적 위치 계산
    }));
  }

  /**
   * Queue Item 조회
   */
  getQueueItem(queueId: string): QueuedJob | null {
    const job = this.queue.find(job => job.queueId === queueId);
    if (!job) return null;

    // 위치 계산
    const index = this.queue.indexOf(job);
    return {
      ...job,
      position: index + 1,
    };
  }

  /**
   * Queue Item 취소
   * - waiting 상태만 취소 가능
   */
  cancelQueueItem(queueId: string): void {
    const job = this.queue.find(job => job.queueId === queueId);
    if (!job) {
      throw new Error(`Queue item not found: ${queueId}`);
    }

    if (job.queueStatus !== 'waiting') {
      throw new Error(
        `Cannot cancel job in ${job.queueStatus} state. Only waiting jobs can be cancelled.`
      );
    }

    // 상태 변경
    job.queueStatus = 'cancelled';
    job.completedAt = new Date();

    // Socket 이벤트
    const io = getSocketIO();
    io.emit('queue:job_cancelled', {
      queueId: job.queueId,
      restaurantId: job.restaurantId,
      timestamp: Date.now(),
    });

    console.log(`[JobQueueManager] Queue item cancelled: ${queueId}`);

    // Queue에서 제거
    this.removeFromQueue(queueId);
  }

  /**
   * Worker 시작 (순차 처리)
   * - 이미 실행 중이면 무시
   */
  private async startWorker(): Promise<void> {
    if (this.isProcessing) {
      console.log('[JobQueueManager] Worker already running');
      return;
    }

    this.isProcessing = true;
    console.log('[JobQueueManager] Worker started');

    while (true) {
      // 1. 대기 중인 첫 번째 Job 가져오기
      const job = this.queue.find(j => j.queueStatus === 'waiting');
      if (!job) {
        console.log('[JobQueueManager] No waiting jobs, worker stopping');
        break; // 대기 중인 Job 없음
      }

      // 2. 상태 변경: waiting → processing
      job.queueStatus = 'processing';
      job.startedAt = new Date();

      // Socket 이벤트
      const io = getSocketIO();
      io.emit('queue:job_started', {
        queueId: job.queueId,
        type: job.type,
        restaurantId: job.restaurantId,
        timestamp: Date.now(),
      });

      console.log(
        `[JobQueueManager] Processing queue item: ${job.queueId} (type: ${job.type}, restaurant: ${job.restaurantId})`
      );

      try {
        // 3. ✅ 실제 Job 처리 (기존 로직 호출)
        const jobId = await this.processJob(job);
        job.jobId = jobId; // Job ID 저장

        // 4. 완료 처리
        job.queueStatus = 'completed';
        job.completedAt = new Date();

        io.emit('queue:job_completed', {
          queueId: job.queueId,
          jobId: job.jobId,
          type: job.type,
          restaurantId: job.restaurantId,
          timestamp: Date.now(),
        });

        console.log(
          `[JobQueueManager] Queue item completed: ${job.queueId} (jobId: ${jobId})`
        );
      } catch (error: any) {
        // 5. 실패 처리
        job.queueStatus = 'failed';
        job.completedAt = new Date();
        job.error = error.message;

        io.emit('queue:job_failed', {
          queueId: job.queueId,
          jobId: job.jobId,
          type: job.type,
          restaurantId: job.restaurantId,
          error: error.message,
          timestamp: Date.now(),
        });

        console.error(
          `[JobQueueManager] Queue item failed: ${job.queueId}`,
          error.message
        );
      }

      // 6. ✅ Queue에서 제거 (완료/실패된 항목)
      this.removeFromQueue(job.queueId);
    }

    this.isProcessing = false;
    console.log('[JobQueueManager] Worker stopped (queue empty)');
  }

  /**
   * ✅ 실제 Job 처리 (기존 로직 재사용)
   */
  private async processJob(queuedJob: QueuedJob): Promise<string> {
    const { type, restaurantId, metadata } = queuedJob;

    switch (type) {
      case 'restaurant_crawl':
        return await this.processRestaurantCrawl(restaurantId, metadata);

      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  }

  /**
   * 통합 레스토랑 크롤링 처리 (메뉴 + 리뷰 + 요약)
   */
  private async processRestaurantCrawl(
    restaurantId: number,
    metadata: Record<string, any>
  ): Promise<string> {
    const jobService = await import('./job-socket.service');
    const crawlerExecutor = await import('./crawler-executor.service');

    const {
      placeId,
      url,
      crawlMenus = true,
      crawlReviews = true,
      createSummary = false,
      resetSummary = false
    } = metadata;

    // Job 시작
    const jobId = await jobService.default.start({
      restaurantId,
      metadata: {
        step: 'queue_processing',
        placeId,
        url,
        crawlMenus,
        crawlReviews,
        createSummary,
      },
    });

    console.log(`[JobQueueManager] Restaurant crawl job started: ${jobId}`);

    // 공통 크롤링 워크플로우 실행
    await crawlerExecutor.default.executeCrawlWorkflow({
      restaurantId,
      placeId,
      standardUrl: url,
      crawlMenus,
      crawlReviews,
      createSummary,
      resetSummary,
      jobId
    });

    // Job 완료
    await jobService.default.complete(jobId, {
      step: 'completed',
      crawlMenus,
      crawlReviews,
      createSummary,
      completedAt: Date.now(),
    });

    console.log(`[JobQueueManager] Restaurant crawl job completed: ${jobId}`);

    return jobId;
  }

  /**
   * Queue에서 아이템 제거
   */
  private removeFromQueue(queueId: string): void {
    const index = this.queue.findIndex(job => job.queueId === queueId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      console.log(`[JobQueueManager] Removed from queue: ${queueId}`);
    }
  }

  /**
   * ✅ Queue 통계
   */
  getStats(): QueueStats {
    return {
      total: this.queue.length,
      waiting: this.getWaitingCount(),
      processing: this.getProcessingCount(),
      completed: 0, // 완료된 항목은 Queue에서 제거되므로 0
      failed: 0, // 실패한 항목도 Queue에서 제거되므로 0
      cancelled: 0, // 취소된 항목도 Queue에서 제거되므로 0
    };
  }

  /**
   * 대기 중인 Job 수
   */
  private getWaitingCount(): number {
    return this.queue.filter(j => j.queueStatus === 'waiting').length;
  }

  /**
   * 처리 중인 Job 수
   */
  private getProcessingCount(): number {
    return this.queue.filter(j => j.queueStatus === 'processing').length;
  }

  /**
   * Queue 비우기 (테스트/디버그용)
   */
  clear(): void {
    this.queue = [];
    console.log('[JobQueueManager] Queue cleared');
  }
}

// Singleton instance
export const jobQueueManager = new JobQueueManager();
export default jobQueueManager;
