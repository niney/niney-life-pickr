import { useState, useCallback } from 'react';
import { apiService, type RestaurantReviewStatistics, type RestaurantMenuStatistics, Alert } from '../';

export type StatisticsSource = 'naver' | 'catchtable' | 'all';

/**
 * 레스토랑 통계 관리 훅
 * - 리뷰 감정 통계 (긍정/부정/중립 비율)
 * - 메뉴별 감정 통계
 */
export const useRestaurantStatistics = () => {
  // 리뷰 감정 통계
  const [reviewStatistics, setReviewStatistics] = useState<RestaurantReviewStatistics | null>(null);
  const [reviewStatisticsLoading, setReviewStatisticsLoading] = useState(false);

  // 메뉴 통계
  const [menuStatistics, setMenuStatistics] = useState<RestaurantMenuStatistics | null>(null);
  const [menuStatisticsLoading, setMenuStatisticsLoading] = useState(false);
  const [minMentions, setMinMentions] = useState(1);

  /**
   * 리뷰 감정 통계 조회
   * @param source 리뷰 소스 (naver | catchtable | all)
   */
  const fetchReviewStatistics = useCallback(
    async (restaurantId: number, source: StatisticsSource = 'naver') => {
      setReviewStatisticsLoading(true);
      try {
        const response = await apiService.getRestaurantStatistics(restaurantId, source);
        if (response.result && response.data) {
          setReviewStatistics(response.data);
        }
      } catch (err) {
        console.error('리뷰 통계 조회 실패:', err);
        Alert.error('조회 실패', '리뷰 통계를 불러오는데 실패했습니다');
      } finally {
        setReviewStatisticsLoading(false);
      }
    },
    []
  );

  /**
   * 메뉴별 감정 통계 조회
   * @param source 리뷰 소스 (naver | catchtable | all)
   */
  const fetchMenuStatistics = useCallback(
    async (
      restaurantId: number,
      minMentionsParam?: number,
      source: StatisticsSource = 'naver'
    ) => {
      const mentions = minMentionsParam ?? minMentions;
      setMenuStatisticsLoading(true);
      try {
        const response = await apiService.getRestaurantMenuStatistics(
          restaurantId,
          mentions,
          source
        );
        if (response.result && response.data) {
          setMenuStatistics(response.data);
        }
      } catch (err) {
        console.error('메뉴 통계 조회 실패:', err);
        Alert.error('조회 실패', '메뉴 통계를 불러오는데 실패했습니다');
      } finally {
        setMenuStatisticsLoading(false);
      }
    },
    [minMentions]
  );

  /**
   * 최소 언급 횟수 변경
   */
  const changeMinMentions = useCallback(
    async (restaurantId: number, newMinMentions: number, source: StatisticsSource = 'naver') => {
      setMinMentions(newMinMentions);
      await fetchMenuStatistics(restaurantId, newMinMentions, source);
    },
    [fetchMenuStatistics]
  );

  /**
   * 모든 통계 초기화
   */
  const clearStatistics = useCallback(() => {
    setReviewStatistics(null);
    setMenuStatistics(null);
    setMinMentions(1);
  }, []);

  /**
   * 모든 통계 조회 (리뷰 + 메뉴)
   * @param source 리뷰 소스 (naver | catchtable | all)
   */
  const fetchAllStatistics = useCallback(
    async (restaurantId: number, source: StatisticsSource = 'naver') => {
      await Promise.all([
        fetchReviewStatistics(restaurantId, source),
        fetchMenuStatistics(restaurantId, undefined, source),
      ]);
    },
    [fetchReviewStatistics, fetchMenuStatistics]
  );

  return {
    // 리뷰 감정 통계
    reviewStatistics,
    reviewStatisticsLoading,
    fetchReviewStatistics,

    // 메뉴 통계
    menuStatistics,
    menuStatisticsLoading,
    minMentions,
    fetchMenuStatistics,
    changeMinMentions,

    // 공통
    clearStatistics,
    fetchAllStatistics,
  };
};

export type RestaurantStatisticsHookReturn = ReturnType<typeof useRestaurantStatistics>;
