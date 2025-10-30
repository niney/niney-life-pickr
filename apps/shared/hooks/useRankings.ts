/**
 * useRankings Hook
 * 레스토랑 감정률 순위 데이터 관리
 */

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services';
import type { RestaurantRankingsResponse } from '../services';

export interface UseRankingsReturn {
  positiveRankings: RestaurantRankingsResponse | null;
  negativeRankings: RestaurantRankingsResponse | null;
  neutralRankings: RestaurantRankingsResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  refreshWithCacheInvalidation: () => Promise<void>;
}

/**
 * 레스토랑 순위 데이터를 가져오는 훅
 * @param limit 조회할 순위 개수 (기본: 5)
 * @param minReviews 최소 리뷰 개수 (기본: 10)
 * @param category 카테고리 필터 (선택)
 * @param excludeNeutral 중립 제외 여부 (기본: false)
 * @param autoFetch 자동 로딩 여부 (기본: true)
 */
export function useRankings(
  limit: number = 5,
  minReviews: number = 10,
  category?: string,
  excludeNeutral: boolean = false,
  autoFetch: boolean = true
): UseRankingsReturn {
  const [positiveRankings, setPositiveRankings] = useState<RestaurantRankingsResponse | null>(null);
  const [negativeRankings, setNegativeRankings] = useState<RestaurantRankingsResponse | null>(null);
  const [neutralRankings, setNeutralRankings] = useState<RestaurantRankingsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRankings = useCallback(async (invalidateCache: boolean = false) => {
    let isMounted = true;

    setLoading(true);
    setError(null);

    try {
      // 3가지 순위를 병렬로 가져오기
      const [positive, negative, neutral] = await Promise.all([
        apiService.getRestaurantRankings('positive', limit, minReviews, category, excludeNeutral, invalidateCache),
        apiService.getRestaurantRankings('negative', limit, minReviews, category, excludeNeutral, invalidateCache),
        apiService.getRestaurantRankings('neutral', limit, minReviews, category, excludeNeutral, invalidateCache),
      ]);

      if (!isMounted) return;

      if (positive.result && positive.data) {
        setPositiveRankings(positive.data);
      }
      if (negative.result && negative.data) {
        setNegativeRankings(negative.data);
      }
      if (neutral.result && neutral.data) {
        setNeutralRankings(neutral.data);
      }
    } catch (err) {
      if (!isMounted) return;

      const errorMessage = err instanceof Error ? err.message : '순위 데이터를 불러오는데 실패했습니다';
      setError(errorMessage);
      console.error('[useRankings] Error fetching rankings:', err);
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [limit, minReviews, category, excludeNeutral]);

  const refresh = useCallback(async () => {
    await fetchRankings(false);
  }, [fetchRankings]);

  const refreshWithCacheInvalidation = useCallback(async () => {
    await fetchRankings(true);
  }, [fetchRankings]);

  useEffect(() => {
    if (autoFetch) {
      fetchRankings(false);
    }
  }, [autoFetch, fetchRankings]);

  return {
    positiveRankings,
    negativeRankings,
    neutralRankings,
    loading,
    error,
    refresh,
    refreshWithCacheInvalidation,
  };
}
