import { useState, useCallback } from 'react';
import { getDefaultApiUrl } from 'shared';

/**
 * Menu statistics state and fetcher
 */
interface MenuStatistics {
  totalReviews: number;
  analyzedReviews: number;
  menuStatistics: any[];
  topPositiveMenus: any[];
  topNegativeMenus: any[];
}

interface UseMenuStatisticsReturn {
  menuStatistics: MenuStatistics | null;
  statisticsLoading: boolean;
  fetchMenuStatistics: () => Promise<void>;
}

/**
 * Hook for managing menu statistics data
 *
 * @param restaurantId - Restaurant ID to fetch statistics for
 * @returns Menu statistics state and fetch function
 *
 * @example
 * ```tsx
 * const { menuStatistics, statisticsLoading, fetchMenuStatistics } = useMenuStatistics(restaurantId);
 *
 * useEffect(() => {
 *   if (activeTab === 'statistics') {
 *     fetchMenuStatistics();
 *   }
 * }, [activeTab]);
 * ```
 */
export const useMenuStatistics = (restaurantId: number): UseMenuStatisticsReturn => {
  const [menuStatistics, setMenuStatistics] = useState<MenuStatistics | null>(null);
  const [statisticsLoading, setStatisticsLoading] = useState(false);

  /**
   * Fetches menu statistics from API
   *
   * Calls /api/restaurants/{restaurantId}/menu-statistics?minMentions=1
   * Updates menuStatistics state on success
   */
  const fetchMenuStatistics = useCallback(async () => {
    setStatisticsLoading(true);
    try {
      const apiBaseUrl = getDefaultApiUrl();
      const response = await fetch(`${apiBaseUrl}/api/restaurants/${restaurantId}/menu-statistics?minMentions=1`);
      if (!response.ok) {
        console.error('❌ 메뉴 통계 조회 실패: HTTP', response.status);
        return;
      }
      const result = await response.json();
      if (result.result && result.data) {
        setMenuStatistics(result.data);
      }
    } catch (error) {
      console.error('❌ 메뉴 통계 조회 실패:', error);
      setMenuStatistics(null);
    } finally {
      setStatisticsLoading(false);
    }
  }, [restaurantId]);

  return {
    menuStatistics,
    statisticsLoading,
    fetchMenuStatistics,
  };
};
