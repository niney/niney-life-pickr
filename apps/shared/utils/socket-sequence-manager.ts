/**
 * Socket 이벤트 Sequence 관리 클래스
 *
 * Socket 이벤트의 순서를 보장하기 위해 sequence 번호를 추적합니다.
 * 이전에 받은 sequence보다 작은 이벤트는 무시하여 오래된 데이터가 최신 데이터를 덮어쓰는 것을 방지합니다.
 *
 * 각 이벤트 타입별로 독립적인 시퀀스를 관리합니다 (예: review:crawl_progress, review:db_progress).
 *
 * @example
 * const sequenceManager = new SocketSequenceManager();
 *
 * // 이벤트 수신 시
 * const sequence = data.sequence || data.current || 0;
 * if (!sequenceManager.check(data.jobId, 'review:crawl_progress', sequence)) {
 *   return; // 오래된 이벤트 무시
 * }
 *
 * // Job 완료 시
 * sequenceManager.reset(data.jobId);
 */
export class SocketSequenceManager {
  private sequences = new Map<string, number>();

  /**
   * Composite Key 생성 (jobId:eventName)
   *
   * @param jobId - Job ID
   * @param eventName - 이벤트 이름
   * @returns Composite key
   */
  private getKey(jobId: string, eventName: string): string {
    return `${jobId}:${eventName}`;
  }

  /**
   * Sequence 체크 - 순서가 맞는지 확인
   *
   * @param jobId - Job ID
   * @param eventName - 이벤트 이름 (예: 'review:crawl_progress')
   * @param newSequence - 새로운 sequence 번호
   * @returns true: 처리해야 함, false: 무시해야 함 (오래된 이벤트)
   */
  check(jobId: string, eventName: string, newSequence: number): boolean {
    const key = this.getKey(jobId, eventName);
    const lastSequence = this.sequences.get(key) || 0;

    if (newSequence < lastSequence) {
      console.warn(
        `[SocketSequence] Outdated event ignored - Job: ${jobId}, Event: ${eventName}, Last: ${lastSequence}, New: ${newSequence}`
      );
      return false;
    }

    this.sequences.set(key, newSequence);
    return true;
  }

  /**
   * Sequence 초기화
   *
   * @param jobId - Job ID
   * @param eventName - (Optional) 특정 이벤트만 초기화. 미제공 시 해당 Job의 모든 이벤트 초기화
   */
  reset(jobId: string, eventName?: string): void {
    if (eventName) {
      // 특정 이벤트만 삭제
      const key = this.getKey(jobId, eventName);
      this.sequences.delete(key);
    } else {
      // 해당 Job의 모든 이벤트 삭제
      const prefix = `${jobId}:`;
      for (const key of this.sequences.keys()) {
        if (key.startsWith(prefix)) {
          this.sequences.delete(key);
        }
      }
    }
  }

  /**
   * 전체 Sequence 초기화
   */
  clear(): void {
    this.sequences.clear();
  }

  /**
   * 특정 Job의 마지막 Sequence 조회
   *
   * @param jobId - Job ID
   * @param eventName - 이벤트 이름
   * @returns 마지막 sequence 번호 (없으면 undefined)
   */
  get(jobId: string, eventName: string): number | undefined {
    const key = this.getKey(jobId, eventName);
    return this.sequences.get(key);
  }
  
  /**
   * 현재 추적 중인 Job 수
   */
  get size(): number {
    return this.sequences.size;
  }
}
