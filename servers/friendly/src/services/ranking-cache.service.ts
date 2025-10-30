import type { RestaurantRankingsResponse } from '../types/db.types';

/**
 * 캐시 데이터 구조
 */
interface RankingCache {
  data: RestaurantRankingsResponse;
  timestamp: number;
  expiresAt: number;
}

/**
 * Ranking Cache Service
 * 레스토랑 순위 데이터 메모리 캐싱
 */
export class RankingCacheService {
  private cache = new Map<string, RankingCache>();
  private readonly TTL = 5 * 60 * 1000; // 5분

  /**
   * 캐시 키 생성
   */
  getCacheKey(
    type: string,
    limit: number,
    minReviews: number,
    category?: string
  ): string {
    return `ranking:${type}:${limit}:${minReviews}:${category || 'all'}`;
  }

  /**
   * 캐시 조회
   */
  get(key: string): RestaurantRankingsResponse | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    // 만료된 캐시는 삭제하고 null 반환
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * 캐시 저장
   */
  set(key: string, data: RestaurantRankingsResponse): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.TTL,
    });
  }

  /**
   * 캐시 무효화
   * @param pattern 특정 패턴으로 시작하는 키만 삭제, 없으면 전체 삭제
   */
  invalidate(pattern?: string): void {
    if (pattern) {
      // 패턴에 매칭되는 키만 삭제
      for (const key of this.cache.keys()) {
        if (key.startsWith(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      // 전체 캐시 초기화
      this.cache.clear();
    }
  }

  /**
   * 캐시 통계
   */
  getStats(): {
    size: number;
    keys: string[];
  } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const rankingCacheService = new RankingCacheService();
export default rankingCacheService;
