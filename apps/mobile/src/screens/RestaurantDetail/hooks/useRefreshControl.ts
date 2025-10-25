import { useState, useCallback } from 'react';

/**
 * useRefreshControl Hook
 *
 * Pull-to-Refresh 기능을 위한 상태 및 핸들러 관리
 * ScrollView의 RefreshControl 컴포넌트와 함께 사용
 *
 * @returns {Object} Pull-to-Refresh 상태 및 핸들러
 * @returns {boolean} refreshing - 새로고침 진행 중 여부
 * @returns {Function} onRefresh - 새로고침 핸들러 함수
 *
 * @example
 * ```tsx
 * const { refreshing, onRefresh } = useRefreshControl(async () => {
 *   await fetchReviews(restaurantId);
 *   await fetchMenus(restaurantId);
 * });
 *
 * <ScrollView
 *   refreshControl={
 *     <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
 *   }
 * >
 *   {content}
 * </ScrollView>
 * ```
 */
export const useRefreshControl = (
  refreshCallback: () => Promise<void>
) => {
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Pull-to-Refresh 핸들러
   * - refreshing 상태를 true로 설정
   * - 전달받은 콜백 함수 실행
   * - 완료 또는 에러 발생 시 refreshing 상태를 false로 복원
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshCallback();
    } catch (error) {
      console.error('새로고침 실패:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshCallback]);

  return {
    refreshing,
    onRefresh,
  };
};
