import { useState, useEffect, useRef } from 'react';

type TabType = 'menu' | 'review' | 'statistics' | 'map' | 'vworld';

interface UseScrollToTopReturn {
  headerHeight: number;
  setHeaderHeight: (height: number) => void;
  currentScrollY: React.MutableRefObject<number>;
  pendingScrollY: number | null;
  handleTabChange: (tab: TabType, activeTab: TabType, setActiveTab: (tab: TabType) => void) => void;
}

/**
 * Hook for managing scroll position when switching tabs
 *
 * Maintains scroll position across tab changes:
 * - If scrolled past header: keeps header skipped (scroll to headerHeight)
 * - If scrolled before header: resets to top (scroll to 0)
 *
 * @param scrollViewRef - Reference to the ScrollView component
 * @returns State and functions for scroll management
 *
 * @example
 * ```tsx
 * const scrollViewRef = useRef<ScrollView>(null);
 * const [activeTab, setActiveTab] = useState<TabType>('menu');
 *
 * const {
 *   headerHeight,
 *   setHeaderHeight,
 *   currentScrollY,
 *   handleTabChange
 * } = useScrollToTop(scrollViewRef);
 *
 * // Measure header height
 * <View onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
 *   <RestaurantInfo />
 * </View>
 *
 * // Handle tab change
 * <TouchableOpacity onPress={() => handleTabChange('review', activeTab, setActiveTab)}>
 *   <Text>리뷰</Text>
 * </TouchableOpacity>
 * ```
 */
export const useScrollToTop = (
  scrollViewRef: React.RefObject<any>
): UseScrollToTopReturn => {
  const [headerHeight, setHeaderHeight] = useState(0);
  const currentScrollY = useRef(0);
  const [pendingScrollY, setPendingScrollY] = useState<number | null>(null);

  /**
   * Handles tab change with smart scroll positioning
   *
   * @param tab - Target tab to switch to
   * @param activeTab - Current active tab
   * @param setActiveTab - Function to update active tab state
   */
  const handleTabChange = (
    tab: TabType,
    activeTab: TabType,
    setActiveTab: (tab: TabType) => void
  ) => {
    console.log('🔄 [RestaurantDetailScreen] 탭 변경:', {
      from: activeTab,
      to: tab,
      currentScrollY: currentScrollY.current,
      headerHeight,
      isCurrentlySkipped: currentScrollY.current >= headerHeight
    });

    // Determine target scroll position
    // If scrolled past header: maintain skipped state (scroll to headerHeight)
    // Otherwise: reset to top (scroll to 0)
    const targetScrollY = currentScrollY.current >= headerHeight && headerHeight > 0
      ? headerHeight
      : 0;

    console.log('🎯 [RestaurantDetailScreen] 탭 변경 후 스크롤 목표:', {
      targetScrollY,
      willMaintainSkip: targetScrollY === headerHeight
    });

    // Store target scroll position for useEffect to apply
    setPendingScrollY(targetScrollY);
    setActiveTab(tab);
  };

  /**
   * Apply pending scroll position after tab change
   * Uses requestAnimationFrame to ensure DOM is ready
   */
  useEffect(() => {
    if (pendingScrollY !== null) {
      console.log('⚡ [RestaurantDetailScreen] useEffect로 스크롤 적용:', {
        targetScrollY: pendingScrollY,
        currentScrollY: currentScrollY.current
      });

      // Apply scroll on next frame
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({ y: pendingScrollY, animated: false });
        setPendingScrollY(null);
      });
    }
  }, [pendingScrollY, scrollViewRef]);

  return {
    headerHeight,
    setHeaderHeight,
    currentScrollY,
    pendingScrollY,
    handleTabChange,
  };
};
