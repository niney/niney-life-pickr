import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useTheme,
  useSocket,
  THEME_COLORS,
  useReviews,
  useMenus,
  useRestaurantStatistics,
  apiService,
} from 'shared';
import type { RestaurantStackParamList } from '../navigation/types';

// Extracted components
import RestaurantDetailHeader from './RestaurantDetail/header/RestaurantDetailHeader';
import CrawlProgressCard from './RestaurantDetail/progress/CrawlProgressCard';
import SummaryProgressCard from './RestaurantDetail/progress/SummaryProgressCard';
import TabMenu from './RestaurantDetail/navigation/TabMenu';
import ReviewFilterBar from './RestaurantDetail/filters/ReviewFilterBar';
import { MenuTab } from './RestaurantDetail/tabs/MenuTab';
import { ReviewTab } from './RestaurantDetail/tabs/ReviewTab';
import { StatisticsTab } from './RestaurantDetail/tabs/StatisticsTab';
import MapTab from './RestaurantDetail/tabs/MapTab';
import ImageViewer from './RestaurantDetail/modals/ImageViewer';
import { ResummaryModal } from './RestaurantDetail/modals/ResummaryModal';

// Hooks
import {
  useKeywordToggle,
  useImageViewer,
  useRefreshControl,
  useMenuStatistics,
  useResummary,
  useScrollToTop,
} from './RestaurantDetail/hooks';

// Utils
import { renderStars } from './RestaurantDetail/utils/starRating';
import { openNaverMap } from './RestaurantDetail/utils/openNaverMap';

// Types
import type { TabType } from './RestaurantDetail/tabs/types';
import type { RestaurantData, ReviewData } from 'shared';

type RestaurantDetailRouteProp = RouteProp<RestaurantStackParamList, 'RestaurantDetail'>;

// Type conversion helpers
const convertRestaurant = (data: RestaurantData) => ({
  name: data.name,
  category: data.category ?? undefined,
  address: data.address ?? undefined,
});

const convertReview = (data: ReviewData) => ({
  id: data.id,
  userName: data.userName ?? undefined,
  visitInfo: {
    visitDate: data.visitInfo.visitDate ?? undefined,
    visitCount: data.visitInfo.visitCount ?? undefined,
    verificationMethod: data.visitInfo.verificationMethod ?? undefined,
  },
  visitKeywords: data.visitKeywords,
  reviewText: data.reviewText ?? undefined,
  images: data.images,
  summary: data.summary ? {
    sentiment: data.summary.sentiment,
    summary: data.summary.summary,
    keyKeywords: data.summary.keyKeywords,
    satisfactionScore: data.summary.satisfactionScore,
    menuItems: data.summary.menuItems,
    tips: data.summary.tips,
    sentimentReason: data.summary.sentimentReason,
  } : undefined,
  emotionKeywords: data.emotionKeywords,
  waitTime: data.waitTime ?? undefined,
});

const RestaurantDetailScreen: React.FC = () => {
  const route = useRoute<RestaurantDetailRouteProp>();
  const { restaurantId, restaurant: routeRestaurant } = route.params;

  const { theme } = useTheme();
  const colors = THEME_COLORS[theme];
  const insets = useSafeAreaInsets();

  // restaurant 상태 관리 (route에서 전달되거나 API에서 가져옴)
  const [restaurant, setRestaurant] = useState<RestaurantData | null>(routeRestaurant || null);
  const [_restaurantLoading, setRestaurantLoading] = useState(!routeRestaurant);

  const {
    menuProgress,
    crawlProgress,
    dbProgress,
    imageProgress,
    isCrawlInterrupted,
    reviewSummaryStatus,
    summaryProgress,
    joinRestaurantRoom,
    leaveRestaurantRoom,
    setRestaurantCallbacks,
    resetCrawlStatus,
    resetSummaryStatus
  } = useSocket();

  // 크롤링 중인지 체크 (진행률이 하나라도 있거나 중단 상태이면 표시)
  const isCrawling = menuProgress !== null || crawlProgress !== null || dbProgress !== null || imageProgress !== null || isCrawlInterrupted;

  // 크롤링 완료 추적 (wasCrawling)
  const wasCrawling = useRef(false);

  // 탭 상태 관리
  const [activeTab, _setActiveTab] = useState<TabType>('menu');

  // ScrollView ref 추가
  const scrollViewRef = useRef<ScrollView>(null);

  // shared 훅 사용 (플랫폼 독립적)
  const {
    reviews,
    reviewsLoading,
    reviewsLoadingMore,
    reviewsTotal,
    hasMoreReviews,
    sentimentFilter,
    searchText,
    fetchReviews,
    loadMoreReviews,
    changeSentimentFilter,
    setSearchText,
    changeSearchText,
  } = useReviews();

  const {
    menus,
    menusLoading,
    fetchMenus,
  } = useMenus();

  // Custom hooks
  const { expandedKeywords, toggleKeywords } = useKeywordToggle();
  const { imageViewerVisible, imageViewerIndex, imageViewerUrls, handleImagePress, closeImageViewer } = useImageViewer();
  const { refreshing, onRefresh } = useRefreshControl(async () => {
    await fetchReviews(restaurantId);
    await fetchMenus(restaurantId);
  });
  const { menuStatistics, statisticsLoading, fetchMenuStatistics } = useMenuStatistics(restaurantId);
  const {
    reviewStatistics,
    reviewStatisticsLoading,
    fetchReviewStatistics,
  } = useRestaurantStatistics();
  const {
    resummaryModalVisible,
    selectedModel,
    setSelectedModel,
    resummaryLoading,
    availableModels,
    openResummaryModal,
    closeResummaryModal,
    handleResummarize,
    styleGetters,
  } = useResummary(colors, theme);
  const { headerHeight, setHeaderHeight, currentScrollY, handleTabChange } = useScrollToTop(scrollViewRef);

  // 동적 스타일 객체 (테마와 상태에 따라 변경)
  const dynamicStyles = useMemo(() => ({
    cardBackground: {
      backgroundColor: theme === 'light' ? '#fff' : colors.surface,
    },
    surfaceBackground: {
      backgroundColor: theme === 'light' ? '#f5f5f5' : colors.surface,
    },
    summaryBorder: {
      backgroundColor: theme === 'light' ? '#f5f5ff' : '#1a1a2e',
      borderColor: theme === 'light' ? '#e0e0ff' : '#2d2d44',
    },
  }), [theme, colors]);

  // 최신 값을 참조하기 위한 ref
  const activeTabRef = useRef(activeTab);
  const fetchReviewsRef = useRef(fetchReviews);
  const fetchMenusRef = useRef(fetchMenus);
  const fetchMenuStatisticsRef = useRef(fetchMenuStatistics);
  const fetchReviewStatisticsRef = useRef(fetchReviewStatistics);

  // ref 업데이트
  useEffect(() => {
    activeTabRef.current = activeTab;
    fetchReviewsRef.current = fetchReviews;
    fetchMenusRef.current = fetchMenus;
    fetchMenuStatisticsRef.current = fetchMenuStatistics;
    fetchReviewStatisticsRef.current = fetchReviewStatistics;
  });

  // Room 입장/퇴장 및 크롤링 완료 콜백 설정
  useEffect(() => {
    const restaurantIdStr = String(restaurantId);

    // 레스토랑 변경 시 스크롤 위치 처리
    // 현재 스크롤이 헤더 높이보다 크면 (건너뛴 상태) 헤더 높이로, 아니면 0으로
    const targetScrollY = currentScrollY.current >= headerHeight && headerHeight > 0
      ? headerHeight
      : 0;

    console.log('🔍 [RestaurantDetailScreen] 레스토랑 변경 감지:', {
      restaurantId: restaurantIdStr,
      currentScrollY: currentScrollY.current,
      headerHeight,
      targetScrollY,
      isSkipped: currentScrollY.current >= headerHeight
    });

    scrollViewRef.current?.scrollTo({ y: targetScrollY, animated: false });

    joinRestaurantRoom(restaurantIdStr);

    // 크롤링 완료 시 리뷰/메뉴 갱신 콜백 설정
    setRestaurantCallbacks({
      onMenuCrawlCompleted: async () => {
        // 메뉴만 크롤링한 경우 메뉴만 갱신
        await fetchMenusRef.current(restaurantId);

        // 통계 탭이면 통계도 새로고침
        if (activeTabRef.current === 'statistics') {
          await fetchMenuStatisticsRef.current();
        }
      },
      onReviewCrawlCompleted: async () => {
        // 리뷰 다시 로드 (shared 훅 사용)
        await fetchReviewsRef.current(restaurantId, 0, false); // offset 0으로 초기화

        // 통계 탭이면 통계도 새로고침
        if (activeTabRef.current === 'statistics') {
          await fetchMenuStatisticsRef.current();
          await fetchReviewStatisticsRef.current(restaurantId);
        }
      },
      onReviewSummaryCompleted: async () => {
        // 리뷰 요약 완료 시에도 갱신
        await fetchReviewsRef.current(restaurantId, 0, false);

        // 통계 탭이면 통계도 새로고침
        if (activeTabRef.current === 'statistics') {
          await fetchMenuStatisticsRef.current();
          await fetchReviewStatisticsRef.current(restaurantId);
        }
      },
      onReviewCrawlError: async () => {
        await fetchReviewsRef.current(restaurantId, 0, false);
      }
    });

    return () => {
      leaveRestaurantRoom(restaurantIdStr);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- headerHeight는 의도적으로 제외 (레스토랑 변경 시에만 실행)
  }, [restaurantId, joinRestaurantRoom, leaveRestaurantRoom, setRestaurantCallbacks]);

  // 크롤링 완료 후 3초 뒤 상태 초기화 (진행률이 모두 null이 되면 완료로 간주)
  useEffect(() => {
    if (isCrawling) {
      wasCrawling.current = true;
    } else if (wasCrawling.current) {
      // 크롤링이 완료됨
      const timer = setTimeout(() => {
        resetCrawlStatus();
        wasCrawling.current = false;
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isCrawling, resetCrawlStatus]);

  // 요약 완료 후 3초 뒤 상태 초기화
  useEffect(() => {
    if (reviewSummaryStatus.status === 'completed') {
      const timer = setTimeout(() => {
        resetSummaryStatus();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [reviewSummaryStatus.status, resetSummaryStatus]);

  // restaurant 데이터 가져오기 (route에서 전달되지 않은 경우)
  useEffect(() => {
    const fetchRestaurantData = async () => {
      if (!routeRestaurant) {
        try {
          setRestaurantLoading(true);
          const response = await apiService.getRestaurantById(restaurantId);
          if (response.result && response.data) {
            setRestaurant(response.data.restaurant);
          }
        } catch (error) {
          console.error('[RestaurantDetail] Failed to fetch restaurant:', error);
        } finally {
          setRestaurantLoading(false);
        }
      }
    };
    fetchRestaurantData();
  }, [restaurantId, routeRestaurant]);

  useEffect(() => {
    fetchReviews(restaurantId);
    fetchMenus(restaurantId);
  }, [restaurantId, fetchReviews, fetchMenus]);

  // 통계 탭 활성화 시 데이터 로드
  useEffect(() => {
    if (activeTab === 'statistics') {
      fetchMenuStatistics();
      fetchReviewStatistics(restaurantId);
    }
  }, [activeTab, restaurantId, fetchMenuStatistics, fetchReviewStatistics]);


  // 스크롤 이벤트 처리 (무한 스크롤)
  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;

    // 현재 스크롤 위치 저장
    const previousScrollY = currentScrollY.current;
    currentScrollY.current = contentOffset.y;

    // 스크롤 위치가 크게 변경될 때만 로그 (매 스크롤마다 로그 방지)
    if (Math.abs(previousScrollY - contentOffset.y) > 50) {
      console.log('📜 [RestaurantDetailScreen] 스크롤 위치 업데이트:', {
        scrollY: contentOffset.y,
        headerHeight,
        isSkipped: contentOffset.y >= headerHeight
      });
    }

    const paddingToBottom = 100; // 하단에서 100px 전에 트리거
    const isNearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - paddingToBottom;

    if (isNearBottom && activeTab === 'review' && !reviewsLoadingMore && !reviewsLoading && hasMoreReviews) {
      loadMoreReviews(restaurantId);
    }
  }, [activeTab, restaurantId, reviewsLoadingMore, reviewsLoading, hasMoreReviews, headerHeight, loadMoreReviews, currentScrollY]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]} // 항상 두 번째 요소 (탭 메뉴)를 sticky로 고정
        snapToOffsets={headerHeight > 0 ? [0, headerHeight] : undefined}
        snapToEnd={false}
        decelerationRate="normal"
        onScroll={handleScroll}
        scrollEventThrottle={400}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* 레스토랑 정보 + 크롤링 상태 헤더 (높이 측정용) */}
        <View onLayout={(e) => {
          const newHeight = e.nativeEvent.layout.height;
          if (newHeight !== headerHeight) {
            console.log('📏 [RestaurantDetailScreen] 헤더 높이 변경:', {
              oldHeight: headerHeight,
              newHeight,
              restaurantId
            });
            setHeaderHeight(newHeight);
          }
        }}>
          {/* 레스토랑 정보 헤더 */}
          {restaurant && (
            <RestaurantDetailHeader
              restaurant={convertRestaurant(restaurant)}
              menuCount={menus.length}
              reviewCount={reviewsTotal}
            />
          )}

          {/* 크롤링 진행 상태 */}
          {isCrawling && (
            <CrawlProgressCard
              menuProgress={menuProgress}
              crawlProgress={crawlProgress}
              imageProgress={imageProgress}
              dbProgress={dbProgress}
              isInterrupted={isCrawlInterrupted}
            />
          )}

          {/* 리뷰 요약 진행 상태 */}
          {reviewSummaryStatus.status !== 'idle' && reviewSummaryStatus.status !== 'completed' && (
            <SummaryProgressCard
              summaryProgress={summaryProgress}
            />
          )}
        </View>

        {/* 탭 메뉴 - Sticky 고정 */}
        <View style={{ backgroundColor: colors.background }}>
          <TabMenu
            activeTab={activeTab}
            onTabChange={(tab) => handleTabChange(tab, activeTab, _setActiveTab)}
            menuCount={menus.length}
            reviewCount={reviewsTotal}
          />

          {/* 감정 필터 (리뷰 탭에서만 표시) */}
          {activeTab === 'review' && (
            <ReviewFilterBar
              sentimentFilter={sentimentFilter}
              onSentimentChange={(filter) => changeSentimentFilter(restaurantId, filter)}
              searchText={searchText}
              onSearchTextChange={setSearchText}
              onSearch={() => changeSearchText(restaurantId, searchText)}
              onClear={() => {
                setSearchText('');
                changeSearchText(restaurantId, '');
              }}
            />
          )}
        </View>

        {/* 메뉴 탭 */}
        {activeTab === 'menu' && (
          <MenuTab
            menus={menus}
            menusLoading={menusLoading}
            theme={theme}
            colors={colors}
          />
        )}

        {/* 리뷰 탭 */}
        {activeTab === 'review' && (
          <ReviewTab
            reviews={reviews.map(convertReview)}
            reviewsLoading={reviewsLoading}
            reviewsLoadingMore={reviewsLoadingMore}
            theme={theme}
            colors={colors}
            dynamicStyles={dynamicStyles}
            expandedKeywords={expandedKeywords}
            toggleKeywords={toggleKeywords}
            renderStars={renderStars}
            handleImagePress={handleImagePress}
            openResummaryModal={openResummaryModal}
          />
        )}

        {/* 통계 탭 */}
        {activeTab === 'statistics' && (
          <StatisticsTab
            menuStatistics={menuStatistics}
            reviewStatistics={reviewStatistics}
            statisticsLoading={statisticsLoading}
            reviewStatisticsLoading={reviewStatisticsLoading}
            colors={colors}
          />
        )}

        {/* 네이버맵 탭 */}
        {activeTab === 'map' && (
          <MapTab
            placeId={restaurant?.place_id}
            onOpenMap={openNaverMap}
          />
        )}
      </ScrollView>

      {/* 이미지 뷰어 모달 */}
      <ImageViewer
        visible={imageViewerVisible}
        imageUrls={imageViewerUrls}
        imageIndex={imageViewerIndex}
        onClose={closeImageViewer}
      />

      {/* 재요약 모달 */}
      <ResummaryModal
        visible={resummaryModalVisible}
        onClose={closeResummaryModal}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        availableModels={availableModels}
        onConfirm={() => handleResummarize(restaurantId, fetchReviews)}
        loading={resummaryLoading}
        colors={colors}
        getModelOptionStyle={styleGetters.getModelOptionStyle}
        getModelTextStyle={styleGetters.getModelTextStyle}
        getRadioBorderStyle={styleGetters.getRadioBorderStyle}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
});

export default RestaurantDetailScreen;
