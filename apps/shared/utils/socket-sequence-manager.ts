/**
 * Socket 이벤트 Sequence 관리 클래스
 * 
 * Socket 이벤트의 순서를 보장하기 위해 sequence 번호를 추적합니다.
 * 이전에 받은 sequence보다 작은 이벤트는 무시하여 오래된 데이터가 최신 데이터를 덮어쓰는 것을 방지합니다.
 * 
 * @example
 * const sequenceManager = new SocketSequenceManager();
 * 
 * // 이벤트 수신 시
 * const sequence = data.sequence || data.current || 0;
 * if (!sequenceManager.check(data.jobId, sequence)) {
 *   return; // 오래된 이벤트 무시
 * }
 * 
 * // Job 완료 시
 * sequenceManager.reset(data.jobId);
 */
export class SocketSequenceManager {
  private sequences = new Map<string, number>();
  
  /**
   * Sequence 체크 - 순서가 맞는지 확인
   * 
   * @param jobId - Job ID
   * @param newSequence - 새로운 sequence 번호
   * @returns true: 처리해야 함, false: 무시해야 함 (오래된 이벤트)
   */
  check(jobId: string, newSequence: number): boolean {
    const lastSequence = this.sequences.get(jobId) || 0;
    
    if (newSequence < lastSequence) {
      console.warn(
        `[SocketSequence] Outdated event ignored - Job: ${jobId}, Last: ${lastSequence}, New: ${newSequence}`
      );
      return false;
    }
    
    this.sequences.set(jobId, newSequence);
    return true;
  }
  
  /**
   * Sequence 초기화 - Job 완료 시 호출
   * 
   * @param jobId - Job ID
   */
  reset(jobId: string): void {
    this.sequences.delete(jobId);
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
   * @returns 마지막 sequence 번호 (없으면 undefined)
   */
  get(jobId: string): number | undefined {
    return this.sequences.get(jobId);
  }
  
  /**
   * 현재 추적 중인 Job 수
   */
  get size(): number {
    return this.sequences.size;
  }
}
