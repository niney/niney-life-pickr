/**
 * Job 완료 추적 클래스
 * 
 * 완료된 Job을 일정 시간 동안 추적하여 중복 이벤트를 방지합니다.
 * Socket 재연결 시 서버에서 완료된 Job의 이벤트를 다시 보낼 수 있는데,
 * 이를 감지하여 무시함으로써 UI가 잘못된 상태로 업데이트되는 것을 방지합니다.
 * 
 * @example
 * const tracker = new JobCompletionTracker(5); // 5분 동안 추적
 * 
 * // 이벤트 수신 시
 * if (tracker.isCompleted(data.jobId)) {
 *   return; // 이미 완료된 Job
 * }
 * 
 * // Job 완료 시
 * tracker.markCompleted(data.jobId);
 */
export class JobCompletionTracker {
  private completed = new Map<string, number>();
  private readonly RETENTION_MS: number;
  private cleanupInterval?: ReturnType<typeof setInterval>;
  
  /**
   * @param retentionMinutes - 완료 상태를 유지할 시간 (분 단위, 기본 5분)
   */
  constructor(retentionMinutes: number = 5) {
    this.RETENTION_MS = retentionMinutes * 60 * 1000;
  }
  
  /**
   * Job 완료 여부 확인
   * 
   * @param jobId - Job ID
   * @returns true: 완료됨, false: 미완료
   */
  isCompleted(jobId: string): boolean {
    const timestamp = this.completed.get(jobId);
    if (!timestamp) return false;
    
    const now = Date.now();
    if (now - timestamp > this.RETENTION_MS) {
      this.completed.delete(jobId);
      return false;
    }
    
    return true;
  }
  
  /**
   * Job을 완료로 마킹
   * 
   * @param jobId - Job ID
   */
  markCompleted(jobId: string): void {
    this.completed.set(jobId, Date.now());
    console.log(`[JobCompletion] Marked as completed: ${jobId}`);
  }
  
  /**
   * 만료된 완료 상태 정리
   */
  cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    for (const [jobId, timestamp] of this.completed.entries()) {
      if (now - timestamp > this.RETENTION_MS) {
        toDelete.push(jobId);
      }
    }
    
    toDelete.forEach(jobId => {
      this.completed.delete(jobId);
      console.log(`[JobCompletion] Cleaned up old job: ${jobId}`);
    });
  }
  
  /**
   * 특정 Job의 완료 상태 해제
   * 
   * @param jobId - Job ID
   */
  unmark(jobId: string): void {
    this.completed.delete(jobId);
  }
  
  /**
   * 전체 완료 상태 초기화
   */
  clear(): void {
    this.completed.clear();
  }
  
  /**
   * 주기적인 자동 정리 시작
   * 
   * @param intervalMinutes - 정리 주기 (분 단위, 기본 5분)
   */
  startAutoCleanup(intervalMinutes: number = 5): void {
    if (this.cleanupInterval) {
      this.stopAutoCleanup();
    }
    
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, intervalMinutes * 60 * 1000);
  }
  
  /**
   * 자동 정리 중지
   */
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }
  
  /**
   * 현재 추적 중인 완료된 Job 수
   */
  get size(): number {
    return this.completed.size;
  }
}
