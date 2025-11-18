/**
 * Promise 기반 뮤텍스 (Mutex) 구현
 * Java의 synchronized 키워드와 유사한 동작을 제공합니다.
 * 
 * 사용 예시:
 * ```typescript
 * const mutex = new PromiseMutex();
 * 
 * async function criticalSection() {
 *   await mutex.acquire();
 *   try {
 *     // 순차 실행이 보장되어야 하는 코드
 *   } finally {
 *     mutex.release();
 *   }
 * }
 * ```
 */
export class PromiseMutex {
  private queue: Array<() => void> = [];
  private locked: boolean = false;

  /**
   * 뮤텍스 락 획득
   * - 이미 락이 걸려있으면 큐에서 대기
   * - 락이 없으면 즉시 획득
   */
  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return;
    }
    
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  /**
   * 뮤텍스 락 해제
   * - 큐에 대기 중인 다음 작업이 있으면 실행
   * - 없으면 락 해제
   */
  release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.locked = false;
    }
  }

  /**
   * 현재 락 상태 확인
   */
  isLocked(): boolean {
    return this.locked;
  }

  /**
   * 대기 중인 작업 수 확인
   */
  getQueueLength(): number {
    return this.queue.length;
  }
}

/**
 * 전역 뮤텍스 인스턴스
 * 모든 BaseCloudOllamaService 인스턴스가 공유하는 뮤텍스
 * 
 * 이를 통해 서로 다른 서비스 인스턴스가 생성되더라도
 * generateBatch() 호출은 애플리케이션 전체에서 순차적으로 실행됩니다.
 */
export const globalCloudOllamaMutex = new PromiseMutex();

