export interface JobData {
  jobId: string;
  restaurantId: number;
  type?: string;
  placeId?: string;
  url?: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'cancelled';
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
  result?: {
    totalReviews: number;
    savedToDb: number;
  };
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * In-Memory Job Manager
 * Redis 없이 메모리에서 Job 관리
 */
class JobManager {
  private jobs = new Map<string, JobData>();
  private abortControllers = new Map<string, AbortController>();

  /**
   * Job 생성
   */
  createJob(jobId: string, data: {
    restaurantId: number;
    type?: string;
    placeId?: string;
    url?: string;
    [key: string]: any;
  }): JobData {
    const jobData: JobData = {
      jobId,
      restaurantId: data.restaurantId,
      type: data.type,
      placeId: data.placeId,
      url: data.url,
      status: 'waiting',
      progress: { current: 0, total: 0, percentage: 0 },
      createdAt: new Date()
    };

    this.jobs.set(jobId, jobData);
    this.abortControllers.set(jobId, new AbortController());

    return jobData;
  }

  /**
   * Job 조회
   */
  getJob(jobId: string): JobData | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * 모든 Job 조회
   */
  getAllJobs(status?: string): JobData[] {
    const allJobs = Array.from(this.jobs.values());
    if (status) {
      return allJobs.filter(job => job.status === status);
    }
    return allJobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Job 상태 업데이트
   */
  updateStatus(
    jobId: string,
    status: JobData['status'],
    updates?: Partial<JobData>
  ): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    job.status = status;
    if (updates) {
      Object.assign(job, updates);
    }

    this.jobs.set(jobId, job);
  }

  /**
   * 진행 상황 업데이트
   */
  updateProgress(jobId: string, current: number, total: number): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const percentage = total > 0 ? Math.floor((current / total) * 100) : 0;
    job.progress = { current, total, percentage };
    this.jobs.set(jobId, job);
  }

  /**
   * Job 취소
   */
  cancelJob(jobId: string): void {
    const controller = this.abortControllers.get(jobId);
    if (controller) {
      controller.abort();
    }

    this.updateStatus(jobId, 'cancelled', {
      completedAt: new Date()
    });
  }

  /**
   * Job이 취소되었는지 확인
   */
  isCancelled(jobId: string): boolean {
    const controller = this.abortControllers.get(jobId);
    return controller?.signal.aborted || false;
  }

  /**
   * Job 완료 처리
   */
  completeJob(jobId: string, result: { totalReviews: number; savedToDb: number }): void {
    this.updateStatus(jobId, 'completed', {
      result,
      completedAt: new Date()
    });

    // AbortController 정리
    this.abortControllers.delete(jobId);
  }

  /**
   * Job 실패 처리
   */
  failJob(jobId: string, error: string): void {
    this.updateStatus(jobId, 'failed', {
      error,
      completedAt: new Date()
    });

    // AbortController 정리
    this.abortControllers.delete(jobId);
  }

  /**
   * 오래된 Job 정리 (선택적)
   */
  cleanupOldJobs(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.status !== 'active' && now - job.createdAt.getTime() > maxAge) {
        this.jobs.delete(jobId);
        this.abortControllers.delete(jobId);
      }
    }
  }
}

export const jobManager = new JobManager();
export default jobManager;
