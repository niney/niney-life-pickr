import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Image,
  Modal,
  Linking,
  TextInput,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { faStar, faStarHalfStroke, faSearch, faTimes } from '@fortawesome/free-solid-svg-icons';
import { faStar as farStar } from '@fortawesome/free-regular-svg-icons';
import ImageViewing from 'react-native-image-viewing';
import {
  useTheme,
  useSocket,
  THEME_COLORS,
  useReviews,
  useMenus,
  getDefaultApiUrl,
  Alert
} from 'shared';
import type { RestaurantStackParamList } from '../navigation/types';


type RestaurantDetailRouteProp = RouteProp<RestaurantStackParamList, 'RestaurantDetail'>;
type TabType = 'menu' | 'review' | 'statistics' | 'map';

const RestaurantDetailScreen: React.FC = () => {
  const route = useRoute<RestaurantDetailRouteProp>();
  const { restaurantId, restaurant } = route.params;

  const { theme } = useTheme();
  const colors = THEME_COLORS[theme];
  const insets = useSafeAreaInsets();

  const {
    reviewCrawlStatus,
    crawlProgress,
    dbProgress,
    imageProgress,
    reviewSummaryStatus,
    summaryProgress,
    joinRestaurantRoom,
    leaveRestaurantRoom,
    setRestaurantCallbacks,
    resetCrawlStatus,
    resetSummaryStatus
  } = useSocket();

  // 레스토랑 정보 섹션 높이 추적
  const [headerHeight, setHeaderHeight] = useState(0);

  // 현재 스크롤 위치 추적
  const currentScrollY = useRef(0);

  // 탭 상태 관리
  const [activeTab, setActiveTab] = useState<TabType>('menu');

  // ScrollView ref 추가
  const scrollViewRef = useRef<ScrollView>(null);

  // 탭 변경 시 스크롤 목표값 저장
  const [pendingScrollY, setPendingScrollY] = useState<number | null>(null);

  // 탭 변경 시 스크롤 초기화 함수
  const handleTabChange = (tab: TabType) => {
    console.log('🔄 [RestaurantDetailScreen] 탭 변경:', {
      from: activeTab,
      to: tab,
      currentScrollY: currentScrollY.current,
      headerHeight,
      isCurrentlySkipped: currentScrollY.current >= headerHeight
    });

    // 현재 스크롤이 헤더를 건너뛴 상태면 건너뛴 상태 유지, 아니면 최상단으로
    const targetScrollY = currentScrollY.current >= headerHeight && headerHeight > 0
      ? headerHeight
      : 0;

    console.log('🎯 [RestaurantDetailScreen] 탭 변경 후 스크롤 목표:', {
      targetScrollY,
      willMaintainSkip: targetScrollY === headerHeight
    });

    // 스크롤 목표값 저장
    setPendingScrollY(targetScrollY);
    setActiveTab(tab);
  };

  // 탭 변경 후 스크롤 적용 (useEffect 사용)
  useEffect(() => {
    if (pendingScrollY !== null) {
      console.log('⚡ [RestaurantDetailScreen] useEffect로 스크롤 적용:', {
        targetScrollY: pendingScrollY,
        currentScrollY: currentScrollY.current
      });

      // requestAnimationFrame으로 다음 프레임에 스크롤 적용
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({ y: pendingScrollY, animated: false });
        setPendingScrollY(null);
      });
    }
  }, [activeTab, pendingScrollY]);

  // 메뉴 통계 상태
  const [menuStatistics, setMenuStatistics] = useState<any>(null);
  const [statisticsLoading, setStatisticsLoading] = useState(false);

  // 핵심 키워드 표시 상태 (리뷰 ID별로 관리)
  const [expandedKeywords, setExpandedKeywords] = useState<Set<number>>(new Set());

  // 재요약 모달 상태
  const [resummaryModalVisible, setResummaryModalVisible] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-oss:20b-cloud');
  const [resummaryLoading, setResummaryLoading] = useState(false);

  // 사용 가능한 AI 모델 목록
  const availableModels = [
    { value: 'gpt-oss:20b-cloud', label: 'GPT OSS 20B (Cloud)' },
    { value: 'gpt-oss:120b-cloud', label: 'GPT OSS 120B (Cloud)' },
    { value: 'deepseek-v3.1:671b-cloud', label: 'DeepSeek v3.1 671B (Cloud)' },
  ];

  // Pull to refresh 상태
  const [refreshing, setRefreshing] = useState(false);

  // 이미지 뷰어 상태
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const [imageViewerUrls, setImageViewerUrls] = useState<string[]>([]);

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

  // 메뉴 통계 조회 함수
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

  // 최신 값을 참조하기 위한 ref
  const activeTabRef = useRef(activeTab);
  const fetchReviewsRef = useRef(fetchReviews);
  const fetchMenusRef = useRef(fetchMenus);
  const fetchMenuStatisticsRef = useRef(fetchMenuStatistics);

  // ref 업데이트
  useEffect(() => {
    activeTabRef.current = activeTab;
    fetchReviewsRef.current = fetchReviews;
    fetchMenusRef.current = fetchMenus;
    fetchMenuStatisticsRef.current = fetchMenuStatistics;
  });

  // Room 입장/퇴장 및 크롤링 완료 콜백 설정
  useEffect(() => {
    const restaurantIdStr = String(restaurantId);

    // 레스토랑 변경 시 통계 데이터 초기화
    setMenuStatistics(null);

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

    // 크롤링 완료 시 리뷰 갱신 콜백 설정
    setRestaurantCallbacks({
      onReviewCrawlCompleted: async () => {
        // 리뷰 다시 로드 (shared 훅 사용)
        await fetchReviewsRef.current(restaurantId, 0, false); // offset 0으로 초기화

        // 메뉴도 함께 갱신
        await fetchMenusRef.current(restaurantId);

        // 통계 탭이면 통계도 새로고침
        if (activeTabRef.current === 'statistics') {
          await fetchMenuStatisticsRef.current();
        }
      },
      onReviewSummaryCompleted: async () => {
        // 리뷰 요약 완료 시에도 갱신
        await fetchReviewsRef.current(restaurantId, 0, false);

        // 통계 탭이면 통계도 새로고침
        if (activeTabRef.current === 'statistics') {
          await fetchMenuStatisticsRef.current();
        }
      },
      onReviewCrawlError: async () => {
        await fetchReviewsRef.current(restaurantId, 0, false);
        await fetchMenusRef.current(restaurantId);
      }
    });

    return () => {
      leaveRestaurantRoom(restaurantIdStr);
    };
  }, [restaurantId]);

  // 크롤링 완료 후 3초 뒤 상태 초기화
  useEffect(() => {
    if (reviewCrawlStatus.status === 'completed') {
      const timer = setTimeout(() => {
        resetCrawlStatus();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [reviewCrawlStatus.status]);

  // 요약 완료 후 3초 뒤 상태 초기화
  useEffect(() => {
    if (reviewSummaryStatus.status === 'completed') {
      const timer = setTimeout(() => {
        resetSummaryStatus();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [reviewSummaryStatus.status]);

  useEffect(() => {
    fetchReviews(restaurantId);
    fetchMenus(restaurantId);
  }, [restaurantId]);

  // 통계 탭 활성화 시 데이터 로드
  useEffect(() => {
    if (activeTab === 'statistics') {
      fetchMenuStatistics();
    }
  }, [activeTab, fetchMenuStatistics]);


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
  }, [activeTab, restaurantId, reviewsLoadingMore, reviewsLoading, hasMoreReviews, headerHeight]);

  // 핵심 키워드 토글 함수
  const toggleKeywords = (reviewId: number) => {
    setExpandedKeywords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId);
      } else {
        newSet.add(reviewId);
      }
      return newSet;
    });
  };

  // 재요약 모달 열기
  const openResummaryModal = (reviewId: number) => {
    setSelectedReviewId(reviewId);
    setResummaryModalVisible(true);
  };

  // 재요약 모달 닫기
  const closeResummaryModal = () => {
    setResummaryModalVisible(false);
    setSelectedReviewId(null);
    setSelectedModel('gpt-oss:20b-cloud');
  };

  // 재요약 실행
  const handleResummarize = async () => {
    if (!selectedReviewId) return;

    setResummaryLoading(true);
    try {
      const apiBaseUrl = getDefaultApiUrl();
      const response = await fetch(`${apiBaseUrl}/api/reviews/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewId: selectedReviewId,
          useCloud: true,
          config: {
            model: selectedModel
          }
        })
      });

      if (!response.ok) {
        console.error('❌ 재요약 요청 실패: HTTP', response.status);
        Alert.error('재요약 실패', '재요약 요청에 실패했습니다.');
        return;
      }

      const result = await response.json();
      console.log('✅ 재요약 완료:', result);

      // 리뷰 목록 갱신
      await fetchReviews(restaurantId);

      closeResummaryModal();
    } catch (error) {
      console.error('❌ 재요약 실패:', error);
      // React Native에서는 Alert 사용
      const { Alert } = require('react-native');
      Alert.alert('오류', '재요약에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setResummaryLoading(false);
    }
  };

  // 네이버 지도 열기 (앱 우선, 웹 fallback)
  const openNaverMap = useCallback(async (placeId: string) => {
    const appScheme = `nmap://place?id=${placeId}`;
    const webFallback = `https://m.place.naver.com/restaurant/${placeId}/location`;

    try {
      const canOpen = await Linking.canOpenURL(appScheme);

      if (canOpen) {
        // 네이버맵 앱 설치됨 -> 앱으로 열기
        await Linking.openURL(appScheme);
      } else {
        // 앱 미설치 -> 모바일 웹으로 열기
        await Linking.openURL(webFallback);
      }
    } catch (error) {
      console.error('❌ 네이버맵 열기 실패:', error);
      // 에러 발생 시 웹으로 fallback
      Linking.openURL(webFallback);
    }
  }, []);

  // 별점 렌더링 함수 (0~100 점수를 1~5 별점으로 변환, 반별 포함)
  const renderStars = (score: number) => {
    const normalizedScore = score / 20; // 0-100 → 0-5

    return [1, 2, 3, 4, 5].map((position) => {
      const diff = normalizedScore - position + 1;
      let icon: any;
      let color = '#ffc107'; // 금색

      if (diff >= 0.75) {
        icon = faStar; // 채운 별
      } else if (diff >= 0.25) {
        icon = faStarHalfStroke; // 반별
      } else {
        icon = farStar; // 빈 별
        color = colors.border; // 회색
      }

      return (
        <FontAwesomeIcon
          key={position}
          icon={icon}
          size={16}
          color={color}
          style={{ marginRight: 2 }}
        />
      );
    });
  };

  // Pull to refresh 핸들러
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // 리뷰와 메뉴 동시에 새로고침
      await Promise.all([
        fetchReviews(restaurantId, 0, false),
        fetchMenus(restaurantId)
      ]);
    } catch (error) {
      console.error('새로고침 실패:', error);
    } finally {
      setRefreshing(false);
    }
  }, [restaurantId]);

  // 이미지 클릭 핸들러
  const handleImagePress = (images: string[], index: number) => {
    const fullUrls = images.map(img => `${getDefaultApiUrl()}${img}`);
    setImageViewerUrls(fullUrls);
    setImageViewerIndex(index);
    setImageViewerVisible(true);
  };

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
          <View style={styles.restaurantInfoContainer}>
            <View style={[styles.restaurantInfoCard, { backgroundColor: theme === 'light' ? '#fff' : colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.restaurantName, { color: colors.text }]}>{restaurant.name}</Text>
              {restaurant.category && (
                <Text style={[styles.restaurantCategory, { color: colors.textSecondary }]}>
                  {restaurant.category}
                </Text>
              )}
              {restaurant.address && (
                <Text style={[styles.restaurantAddress, { color: colors.textSecondary }]}>
                  {restaurant.address}
                </Text>
              )}
              <Text style={[styles.reviewCount, { color: colors.primary }]}>
                메뉴 {menus.length}개 · 리뷰 {reviewsTotal}개
              </Text>
            </View>
          </View>

          {/* 크롤링 진행 상태 */}
          {reviewCrawlStatus.status === 'active' && (
            <View style={styles.crawlProgressContainer}>
              <View style={[styles.crawlProgressCard, { backgroundColor: theme === 'light' ? '#fff' : colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.crawlProgressTitle, { color: colors.text }]}>
                  🔄 리뷰 크롤링 중...
                </Text>

                {crawlProgress && (
                  <View style={styles.progressSection}>
                    <View style={styles.progressInfo}>
                      <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>크롤링 진행</Text>
                      <Text style={[styles.progressText, { color: colors.text }]}>
                        {crawlProgress.current} / {crawlProgress.total} ({crawlProgress.percentage}%)
                      </Text>
                    </View>
                    <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            backgroundColor: colors.primary,
                            width: `${crawlProgress.percentage}%`
                          }
                        ]}
                      />
                    </View>
                  </View>
                )}

                {imageProgress && (
                  <View style={styles.progressSection}>
                    <View style={styles.progressInfo}>
                      <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>이미지 처리</Text>
                      <Text style={[styles.progressText, { color: colors.text }]}>
                        {imageProgress.current} / {imageProgress.total} ({imageProgress.percentage}%)
                      </Text>
                    </View>
                    <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            backgroundColor: '#ff9800',
                            width: `${imageProgress.percentage}%`
                          }
                        ]}
                      />
                    </View>
                  </View>
                )}

                {dbProgress && (
                  <View style={styles.progressSection}>
                    <View style={styles.progressInfo}>
                      <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>DB 저장</Text>
                      <Text style={[styles.progressText, { color: colors.text }]}>
                        {dbProgress.current} / {dbProgress.total} ({dbProgress.percentage}%)
                      </Text>
                    </View>
                    <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            backgroundColor: '#4caf50',
                            width: `${dbProgress.percentage}%`
                          }
                        ]}
                      />
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* 리뷰 요약 진행 상태 */}
          {(reviewSummaryStatus.status === 'active' || summaryProgress) && (
            <View style={styles.crawlProgressContainer}>
              <View style={[styles.crawlProgressCard, { backgroundColor: theme === 'light' ? '#fff' : colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.crawlProgressTitle, { color: colors.text }]}>
                  🤖 AI 리뷰 요약 중...
                </Text>

                {summaryProgress && (
                  <View style={styles.progressSection}>
                    <View style={styles.progressInfo}>
                      <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>요약 진행</Text>
                      <Text style={[styles.progressText, { color: colors.text }]}>
                        {summaryProgress.current} / {summaryProgress.total} ({summaryProgress.percentage}%)
                      </Text>
                    </View>
                    <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            backgroundColor: '#9c27b0',
                            width: `${summaryProgress.percentage}%`
                          }
                        ]}
                      />
                    </View>
                    <View style={styles.progressStats}>
                      <Text style={[styles.progressStat, { color: '#4caf50' }]}>
                        ✓ 완료: {summaryProgress.completed}
                      </Text>
                      {summaryProgress.failed > 0 && (
                        <Text style={[styles.progressStat, { color: '#f44336' }]}>
                          ✗ 실패: {summaryProgress.failed}
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* 탭 메뉴 - Sticky 고정 */}
        <View style={{ backgroundColor: colors.background, paddingHorizontal: 16, paddingBottom: 7 }}>
          <View style={[styles.tabContainer, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={styles.tabButton}
              onPress={() => handleTabChange('menu')}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  { color: activeTab === 'menu' ? colors.primary : colors.textSecondary }
                ]}
              >
                메뉴 {menus.length > 0 && `(${menus.length})`}
              </Text>
              {activeTab === 'menu' && (
                <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabButton}
              onPress={() => handleTabChange('review')}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  { color: activeTab === 'review' ? colors.primary : colors.textSecondary }
                ]}
              >
                리뷰 ({reviewsTotal})
              </Text>
              {activeTab === 'review' && (
                <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabButton}
              onPress={() => handleTabChange('statistics')}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  { color: activeTab === 'statistics' ? colors.primary : colors.textSecondary }
                ]}
              >
                📊 통계
              </Text>
              {activeTab === 'statistics' && (
                <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabButton}
              onPress={() => handleTabChange('map')}
            >
              <Text
                  style={[
                      styles.tabButtonText,
                  { color: activeTab === 'map' ? colors.primary : colors.textSecondary }
                ]}
                  >
                  🗺️ 네이버맵
                  </Text>
                {activeTab === 'map' && (
                  <View style={[styles.tabIndicator, {backgroundColor: colors.primary}]}/>
                )}
            </TouchableOpacity>
          </View>

          {/* 감정 필터 (리뷰 탭에서만 표시) */}
          {activeTab === 'review' && (
            <View style={styles.filterContainer}>
              <View style={styles.filterButtons}>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    {
                      backgroundColor: sentimentFilter === 'all' ? colors.primary : (theme === 'light' ? '#f5f5f5' : colors.surface),
                      borderColor: sentimentFilter === 'all' ? colors.primary : colors.border
                    }
                  ]}
                  onPress={() => changeSentimentFilter(restaurantId, 'all')}
                >
                  <Text style={[styles.filterButtonText, { color: sentimentFilter === 'all' ? '#fff' : colors.text }]}>
                    전체
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    {
                      backgroundColor: sentimentFilter === 'positive' ? '#4caf50' : (theme === 'light' ? '#f5f5f5' : colors.surface),
                      borderColor: sentimentFilter === 'positive' ? '#4caf50' : colors.border
                    }
                  ]}
                  onPress={() => changeSentimentFilter(restaurantId, 'positive')}
                >
                  <Text style={[styles.filterButtonText, { color: sentimentFilter === 'positive' ? '#fff' : colors.text }]}>
                    😊 긍정
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    {
                      backgroundColor: sentimentFilter === 'negative' ? '#f44336' : (theme === 'light' ? '#f5f5f5' : colors.surface),
                      borderColor: sentimentFilter === 'negative' ? '#f44336' : colors.border
                    }
                  ]}
                  onPress={() => changeSentimentFilter(restaurantId, 'negative')}
                >
                  <Text style={[styles.filterButtonText, { color: sentimentFilter === 'negative' ? '#fff' : colors.text }]}>
                    😞 부정
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    {
                      backgroundColor: sentimentFilter === 'neutral' ? '#ff9800' : (theme === 'light' ? '#f5f5f5' : colors.surface),
                      borderColor: sentimentFilter === 'neutral' ? '#ff9800' : colors.border
                    }
                  ]}
                  onPress={() => changeSentimentFilter(restaurantId, 'neutral')}
                >
                  <Text style={[styles.filterButtonText, { color: sentimentFilter === 'neutral' ? '#fff' : colors.text }]}>
                    😐 중립
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 검색 UI */}
              <View style={styles.searchContainer}>
                <View style={[styles.searchInputWrapper, { backgroundColor: theme === 'light' ? '#f5f5f5' : colors.surface, borderColor: colors.border }]}>
                  <FontAwesomeIcon icon={faSearch as IconProp} size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="리뷰 내용 검색..."
                    placeholderTextColor={colors.textSecondary}
                    value={searchText}
                    onChangeText={setSearchText}
                    onSubmitEditing={() => changeSearchText(restaurantId, searchText)}
                    returnKeyType="search"
                  />
                  {searchText && searchText.length > 0 && (
                    <TouchableOpacity
                      onPress={() => {
                        setSearchText('');
                        changeSearchText(restaurantId, '');
                      }}
                      style={{ padding: 4 }}
                    >
                      <FontAwesomeIcon icon={faTimes as IconProp} size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.searchButton, { backgroundColor: colors.primary }]}
                  onPress={() => changeSearchText(restaurantId, searchText)}
                >
                  <Text style={styles.searchButtonText}>검색</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* 메뉴 탭 */}
        {activeTab === 'menu' && (
          <View style={{ paddingHorizontal: 16 }}>
            {menusLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : menus.length > 0 ? (
              <View style={styles.menuSection}>
                <View style={styles.menusList}>
                  {menus.map((menu, index) => (
                    <View
                      key={index}
                      style={[
                        styles.menuCardContainer,
                        theme === 'dark' ? styles.menuCardDark : styles.menuCardLight,
                      ]}
                    >
                      <View style={styles.menuCardContent}>
                        <View style={styles.menuInfo}>
                          <Text style={[styles.menuName, { color: colors.text }]}>{menu.name}</Text>
                          {menu.description && (
                            <Text style={[styles.menuDescription, { color: colors.textSecondary }]}>
                              {menu.description}
                            </Text>
                          )}
                        </View>
                        <Text style={[styles.menuPrice, { color: colors.primary }]}>{menu.price}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>등록된 메뉴가 없습니다</Text>
              </View>
            )}
          </View>
        )}

        {/* 리뷰 탭 */}
        {activeTab === 'review' && (
          <View style={{ paddingHorizontal: 16 }}>
            {reviewsLoading && reviews.length === 0 ? (
              // 스켈레톤 UI - 3개의 빈 박스
              <View style={styles.reviewsList}>
                {[1, 2, 3].map((index) => (
                  <View
                    key={`skeleton-${index}`}
                    style={[
                      styles.reviewCardContainer,
                      styles.skeletonCard,
                      theme === 'dark' ? styles.reviewCardDark : styles.reviewCardLight,
                    ]}
                  >
                    <View style={styles.reviewCardContent}>
                      {/* 헤더 스켈레톤 */}
                      <View style={styles.reviewCardHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={[styles.skeletonLine, styles.skeletonShort, { backgroundColor: colors.border }]} />
                          <View style={[styles.skeletonLine, styles.skeletonTiny, { backgroundColor: colors.border, marginTop: 4 }]} />
                        </View>
                      </View>

                      {/* 텍스트 스켈레톤 */}
                      <View style={[styles.skeletonLine, styles.skeletonFull, { backgroundColor: colors.border, marginTop: 12 }]} />
                      <View style={[styles.skeletonLine, styles.skeletonFull, { backgroundColor: colors.border, marginTop: 8 }]} />
                      <View style={[styles.skeletonLine, styles.skeletonMedium, { backgroundColor: colors.border, marginTop: 8 }]} />
                    </View>
                  </View>
                ))}
              </View>
            ) : reviews.length > 0 ? (
              <View style={styles.reviewsList}>
                {reviews.map((review) => (
                  <View
                    key={review.id}
                    style={[
                      styles.reviewCardContainer,
                      theme === 'dark' ? styles.reviewCardDark : styles.reviewCardLight,
                    ]}
                  >
                    <View style={styles.reviewCardContent}>
                      <View style={styles.reviewCardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.reviewUserName, { color: colors.text }]}>{review.userName || '익명'}</Text>
                          {review.visitInfo.visitDate && (
                            <Text style={[styles.reviewDate, { color: colors.textSecondary }]}>
                              {review.visitInfo.visitDate}
                            </Text>
                          )}
                        </View>
                        {/* 재요약 버튼 - 항상 표시 */}
                        <TouchableOpacity
                          style={styles.resummaryButton}
                          onPress={() => openResummaryModal(review.id)}
                        >
                          <Text style={styles.resummaryButtonText}>🔄 재요약</Text>
                        </TouchableOpacity>
                      </View>

                      {review.visitKeywords.length > 0 && (
                        <View style={styles.keywordsContainer}>
                          {review.visitKeywords.map((keyword: string, idx: number) => (
                            <View key={idx} style={[styles.keyword, { backgroundColor: colors.border }]}>
                              <Text style={[styles.keywordText, { color: colors.text }]}>{keyword}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {review.reviewText && (
                        <Text style={[styles.reviewText, { color: colors.text }]}>{review.reviewText}</Text>
                      )}

                      {/* 리뷰 이미지 표시 */}
                      {review.images && review.images.length > 0 && (
                        <View style={styles.reviewImagesContainer}>
                          {review.images.length === 1 ? (
                            <TouchableOpacity
                              onPress={() => handleImagePress(review.images, 0)}
                              activeOpacity={0.9}
                            >
                              <Image
                                source={{ uri: `${getDefaultApiUrl()}${review.images[0]}` }}
                                style={styles.reviewImageFull}
                                resizeMode="cover"
                              />
                            </TouchableOpacity>
                          ) : (
                            <ScrollView
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              style={styles.reviewImagesScrollView}
                              contentContainerStyle={styles.reviewImagesScrollContent}
                            >
                              {review.images.map((imageUrl: string, idx: number) => (
                                <TouchableOpacity
                                  key={idx}
                                  onPress={() => handleImagePress(review.images, idx)}
                                  activeOpacity={0.9}
                                >
                                  <Image
                                    source={{ uri: `${getDefaultApiUrl()}${imageUrl}` }}
                                    style={styles.reviewImageScroll}
                                    resizeMode="cover"
                                  />
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          )}
                        </View>
                      )}

                      {/* AI 요약 데이터 표시 */}
                      {review.summary ? (
                        <View style={[styles.summaryContainer, { backgroundColor: theme === 'light' ? '#f5f5ff' : '#1a1a2e', borderColor: theme === 'light' ? '#e0e0ff' : '#2d2d44' }]}>
                          <View style={styles.summaryHeader}>
                            <Text style={styles.summaryTitle}>🤖 AI 요약</Text>
                            <View style={styles.sentimentBadge}>
                              <Text style={[styles.sentimentText, {
                                color: review.summary.sentiment === 'positive' ? '#4caf50' :
                                  review.summary.sentiment === 'negative' ? '#f44336' : '#ff9800'
                              }]}>
                                {review.summary.sentiment === 'positive' ? '😊 긍정' :
                                  review.summary.sentiment === 'negative' ? '😞 부정' : '😐 중립'}
                              </Text>
                            </View>
                          </View>

                          <Text style={[styles.summaryText, { color: colors.text }]}>
                            {review.summary.summary}
                          </Text>

                          {review.summary.keyKeywords.length > 0 && (
                            <View style={styles.summaryKeywords}>
                              <TouchableOpacity
                                style={styles.keywordsToggleButton}
                                onPress={() => toggleKeywords(review.id)}
                              >
                                <Text style={[styles.summaryKeywordsTitle, { color: colors.textSecondary }]}>
                                  핵심 키워드 {expandedKeywords.has(review.id) ? '▼' : '▶'}
                                </Text>
                              </TouchableOpacity>

                              {expandedKeywords.has(review.id) && (
                                <View style={styles.keywordsContainer}>
                                  {review.summary.keyKeywords.map((keyword: string, idx: number) => (
                                    <View key={idx} style={styles.summaryKeyword}>
                                      <Text style={styles.summaryKeywordText}>{keyword}</Text>
                                    </View>
                                  ))}
                                </View>
                              )}
                            </View>
                          )}

                          {review.summary.satisfactionScore !== null && (
                            <View style={styles.satisfactionScore}>
                              <Text style={[styles.satisfactionLabel, { color: colors.textSecondary }]}>
                                만족도:
                              </Text>
                              <View style={styles.scoreStars}>
                                {renderStars(review.summary.satisfactionScore)}
                                <Text style={[styles.scoreNumber, { color: colors.text }]}>
                                  {review.summary.satisfactionScore}점
                                </Text>
                              </View>
                            </View>
                          )}

                          {review.summary.menuItems && review.summary.menuItems.length > 0 && (
                            <View style={styles.menuItemsSection}>
                              <Text style={[styles.menuItemsTitle, { color: colors.textSecondary }]}>
                                🍽️ 언급된 메뉴:
                              </Text>
                              <View style={styles.keywordsContainer}>
                                {review.summary.menuItems.map((menuItem, idx: number) => {
                                  // 감정별 색상 및 이모지 설정
                                  const sentimentConfig = {
                                    positive: {
                                      emoji: '😊',
                                      bgLight: '#c8e6c9',
                                      bgDark: '#2e5d2e',
                                      textLight: '#1b5e20',
                                      textDark: '#a5d6a7',
                                      borderLight: '#66bb6a',
                                      borderDark: '#4caf50'
                                    },
                                    negative: {
                                      emoji: '😞',
                                      bgLight: '#ffcdd2',
                                      bgDark: '#5d2e2e',
                                      textLight: '#b71c1c',
                                      textDark: '#ef9a9a',
                                      borderLight: '#ef5350',
                                      borderDark: '#e57373'
                                    },
                                    neutral: {
                                      emoji: '😐',
                                      bgLight: '#ffe0b2',
                                      bgDark: '#5d4a2e',
                                      textLight: '#e65100',
                                      textDark: '#ffcc80',
                                      borderLight: '#ff9800',
                                      borderDark: '#ffb74d'
                                    }
                                  };

                                  const config = sentimentConfig[menuItem.sentiment];
                                  const bgColor = theme === 'light' ? config.bgLight : config.bgDark;
                                  const textColor = theme === 'light' ? config.textLight : config.textDark;
                                  const borderColor = theme === 'light' ? config.borderLight : config.borderDark;

                                  return (
                                    <View key={idx} style={[styles.menuItemBadge, { backgroundColor: bgColor, borderColor }]}>
                                      <Text style={[styles.menuItemText, { color: textColor }]}>
                                        <Text style={{ fontSize: 13 }}>{config.emoji}</Text> {menuItem.name}
                                        {menuItem.reason && ` (${menuItem.reason})`}
                                      </Text>
                                    </View>
                                  );
                                })}
                              </View>
                            </View>
                          )}

                          {review.summary.tips.length > 0 && (
                            <View style={styles.tipsSection}>
                              <Text style={[styles.tipsTitle, { color: colors.textSecondary }]}>
                                💡 팁:
                              </Text>
                              {review.summary.tips.map((tip: string, idx: number) => (
                                <Text key={idx} style={[styles.tipText, { color: colors.text }]}>
                                  • {tip}
                                </Text>
                              ))}
                            </View>
                          )}

                          {review.summary.sentimentReason ? (
                            <View style={styles.sentimentReason}>
                              <Text style={[styles.sentimentReasonLabel, { color: colors.textSecondary }]}>
                                감정 분석:
                              </Text>
                              <Text style={[styles.sentimentReasonText, { color: colors.text }]}>
                                {review.summary.sentimentReason}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      ) : null}

                      {review.emotionKeywords.length > 0 && (
                        <View style={styles.keywordsContainer}>
                          {review.emotionKeywords.map((keyword: string, idx: number) => (
                            <View key={idx} style={[styles.emotionKeyword, { backgroundColor: '#e3f2fd' }]}>
                              <Text style={[styles.keywordText, { color: '#1976d2' }]}>{keyword}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      <View style={styles.visitInfo}>
                        {review.visitInfo.visitCount && (
                          <Text style={[styles.visitInfoText, { color: colors.textSecondary }]}>
                            {review.visitInfo.visitCount}
                          </Text>
                        )}
                        {review.visitInfo.verificationMethod && (
                          <Text style={[styles.visitInfoText, { color: colors.textSecondary }]}>
                            • {review.visitInfo.verificationMethod}
                          </Text>
                        )}
                        {review.waitTime && (
                          <Text style={[styles.visitInfoText, { color: colors.textSecondary }]}>
                            • {review.waitTime}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>등록된 리뷰가 없습니다</Text>
              </View>
            )}

            {/* 추가 로딩 인디케이터 */}
            {reviewsLoadingMore && (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.footerLoaderText, { color: colors.textSecondary }]}>
                  리뷰 불러오는 중...
                </Text>
              </View>
            )}
          </View>
        )}

        {/* 통계 탭 */}
        {activeTab === 'statistics' && (
          <View style={{ paddingHorizontal: 16 }}>
            {statisticsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : menuStatistics ? (
              <View style={styles.statisticsContainer}>
                {/* 전체 요약 */}
                <View style={styles.statisticsCard}>
                  <Text style={[styles.statisticsCardTitle, { color: colors.text }]}>📊 전체 요약</Text>
                  <View style={styles.statisticsSummary}>
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>전체 리뷰</Text>
                      <Text style={[styles.summaryValue, { color: colors.text }]}>{menuStatistics.totalReviews}개</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>분석된 리뷰</Text>
                      <Text style={[styles.summaryValue, { color: colors.text }]}>{menuStatistics.analyzedReviews}개</Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>언급된 메뉴</Text>
                      <Text style={[styles.summaryValue, { color: colors.text }]}>{menuStatistics.menuStatistics.length}개</Text>
                    </View>
                  </View>
                </View>

                {/* 긍정 메뉴 TOP 5 */}
                {menuStatistics.topPositiveMenus.length > 0 && (
                  <View style={styles.statisticsCard}>
                    <Text style={[styles.statisticsCardTitle, { color: colors.text }]}>👍 긍정 평가 TOP 5</Text>
                    <View style={styles.topMenusList}>
                      {menuStatistics.topPositiveMenus.map((menu: any, index: number) => (
                        <View key={index} style={styles.topMenuItem}>
                          <View style={[styles.topMenuRank, { backgroundColor: '#4caf50' }]}>
                            <Text style={styles.topMenuRankText}>{index + 1}</Text>
                          </View>
                          <View style={styles.topMenuInfo}>
                            <Text style={[styles.topMenuName, { color: colors.text }]}>{menu.menuName}</Text>
                            <Text style={[styles.topMenuStats, { color: colors.textSecondary }]}>
                              긍정률 {menu.positiveRate}% • {menu.mentions}회 언급
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* 부정 메뉴 TOP 5 */}
                {menuStatistics.topNegativeMenus.length > 0 && (
                  <View style={styles.statisticsCard}>
                    <Text style={[styles.statisticsCardTitle, { color: colors.text }]}>👎 주의할 메뉴 (부정률 높음)</Text>
                    <View style={styles.topMenusList}>
                      {menuStatistics.topNegativeMenus.map((menu: any, index: number) => (
                        <View key={index} style={styles.topMenuItem}>
                          <View style={[styles.topMenuRank, { backgroundColor: '#f44336' }]}>
                            <Text style={styles.topMenuRankText}>{index + 1}</Text>
                          </View>
                          <View style={styles.topMenuInfo}>
                            <Text style={[styles.topMenuName, { color: colors.text }]}>{menu.menuName}</Text>
                            <Text style={[styles.topMenuStats, { color: colors.textSecondary }]}>
                              부정률 {menu.negativeRate}% • {menu.mentions}회 언급
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* 전체 메뉴 통계 */}
                <View style={styles.statisticsCard}>
                  <Text style={[styles.statisticsCardTitle, { color: colors.text }]}>📝 전체 메뉴 통계</Text>
                  <View style={styles.allMenusList}>
                    {menuStatistics.menuStatistics.map((menu: any, index: number) => {
                      const allReasons = [
                        ...menu.topReasons.positive.map((r: string) => `👍 ${r}`),
                        ...menu.topReasons.negative.map((r: string) => `👎 ${r}`),
                        ...menu.topReasons.neutral.map((r: string) => `😐 ${r}`)
                      ];

                      return (
                        <View key={index} style={styles.menuStatItem}>
                          <View style={styles.menuStatHeader}>
                            <Text style={[styles.menuStatName, { color: colors.text }]}>{menu.menuName}</Text>
                            <View style={[
                              styles.menuStatBadge,
                              { backgroundColor: menu.sentiment === 'positive' ? '#4caf50' : menu.sentiment === 'negative' ? '#f44336' : '#ff9800' }
                            ]}>
                              <Text style={styles.menuStatBadgeText}>
                                {menu.sentiment === 'positive' ? '😊 긍정' : menu.sentiment === 'negative' ? '😞 부정' : '😐 중립'}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.menuStatCounts}>
                            <View style={styles.menuStatCount}>
                              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>긍정</Text>
                              <Text style={{ color: '#4caf50', fontWeight: '600' }}>{menu.positive}</Text>
                            </View>
                            <View style={styles.menuStatCount}>
                              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>부정</Text>
                              <Text style={{ color: '#f44336', fontWeight: '600' }}>{menu.negative}</Text>
                            </View>
                            <View style={styles.menuStatCount}>
                              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>중립</Text>
                              <Text style={{ color: '#ff9800', fontWeight: '600' }}>{menu.neutral}</Text>
                            </View>
                            <View style={styles.menuStatCount}>
                              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>긍정률</Text>
                              <Text style={[styles.summaryValue, { color: colors.text }]}>{menu.positiveRate}%</Text>
                            </View>
                          </View>

                          {allReasons.length > 0 && (
                            <View style={styles.menuStatReasons}>
                              <Text style={[styles.summaryLabel, { color: colors.textSecondary, marginBottom: 4 }]}>주요 이유:</Text>
                              {allReasons.map((reason: string, idx: number) => (
                                <Text key={idx} style={[styles.menuStatReason, { color: colors.text }]}>
                                  • {reason}
                                </Text>
                              ))}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>통계 데이터가 없습니다</Text>
              </View>
            )}
          </View>
        )}

        {/* 네이버맵 탭 */}
        {activeTab === 'map' && (
          <View style={{ paddingHorizontal: 16 }}>
            {restaurant?.place_id ? (
              <View style={styles.mapButtonContainer}>
                <Text style={[styles.mapDescription, { color: colors.textSecondary }]}>
                  네이버 지도에서 위치를 확인하세요
                </Text>
                <TouchableOpacity
                  style={[styles.openMapButton, { backgroundColor: colors.primary }]}
                  onPress={() => openNaverMap(restaurant.place_id)}
                >
                  <Text style={styles.openMapButtonText}>
                    🗺️ 네이버 지도에서 열기
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  지도 정보가 없습니다
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* 이미지 뷰어 모달 */}
      <ImageViewing
        images={imageViewerUrls.map(uri => ({ uri }))}
        imageIndex={imageViewerIndex}
        visible={imageViewerVisible}
        onRequestClose={() => setImageViewerVisible(false)}
      />

      {/* 재요약 모달 */}
      <Modal
        visible={resummaryModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeResummaryModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>AI 모델 선택</Text>
            <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
              리뷰를 재요약할 AI 모델을 선택하세요
            </Text>

            <View style={styles.modelList}>
              {availableModels.map((model) => (
                <TouchableOpacity
                  key={model.value}
                  style={[
                    styles.modelOption,
                    {
                      backgroundColor: selectedModel === model.value ? colors.primary : (theme === 'light' ? '#f5f5f5' : colors.background),
                      borderColor: selectedModel === model.value ? colors.primary : colors.border
                    }
                  ]}
                  onPress={() => setSelectedModel(model.value)}
                >
                  <View style={[styles.radioButton, { borderColor: selectedModel === model.value ? '#fff' : colors.border }]}>
                    {selectedModel === model.value && (
                      <View style={[styles.radioButtonInner, { backgroundColor: '#fff' }]} />
                    )}
                  </View>
                  <Text style={[styles.modelLabel, { color: selectedModel === model.value ? '#fff' : colors.text }]}>
                    {model.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={closeResummaryModal}
                disabled={resummaryLoading}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: colors.primary }]}
                onPress={handleResummarize}
                disabled={resummaryLoading}
              >
                {resummaryLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>재요약 시작</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  restaurantInfoContainer: {
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  restaurantInfoCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  restaurantCategory: {
    fontSize: 14,
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 14,
    marginBottom: 8,
  },
  reviewCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 0,
    backgroundColor: 'transparent', // 배경색을 부모로 이동
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  menuSection: {
    marginBottom: 16,
  },
  menusList: {
    // gap 제거 - borderBottom으로 구분
  },
  menuCardContainer: {
    overflow: 'hidden',
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  menuCardLight: {
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    backgroundColor: 'transparent',
  },
  menuCardDark: {
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'transparent',
  },
  menuCardContent: {
    paddingVertical: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  menuInfo: {
    flex: 1,
    marginRight: 12,
  },
  menuName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  menuPrice: {
    fontSize: 15,
    fontWeight: '700',
  },
  crawlProgressContainer: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  crawlProgressCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  crawlProgressTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  progressSection: {
    marginBottom: 12,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  progressStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  progressStat: {
    fontSize: 13,
    fontWeight: '500',
  },
  reviewsList: {
    // gap 제거 - borderBottom으로 구분
  },
  reviewCardContainer: {
    overflow: 'hidden',
    borderBottomWidth: 1,
    paddingVertical: 16,
  },
  reviewCardLight: {
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    backgroundColor: 'transparent',
  },
  reviewCardDark: {
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'transparent',
  },
  reviewCardContent: {
    paddingVertical: 4,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewUserName: {
    fontSize: 15,
    fontWeight: '600',
  },
  reviewDate: {
    fontSize: 12,
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  keyword: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  emotionKeyword: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  keywordText: {
    fontSize: 12,
  },
  reviewText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewImagesContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  reviewImageFull: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  reviewImagesScrollView: {
    marginHorizontal: -16, // 카드 패딩 상쇄
  },
  reviewImagesScrollContent: {
    paddingHorizontal: 16,
    gap: 4,
  },
  reviewImageScroll: {
    width: 160,
    height: 120,
    borderRadius: 12,
    marginRight: 4,
  },
  visitInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  visitInfoText: {
    fontSize: 12,
  },
  loadingContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLoaderText: {
    fontSize: 13,
    marginTop: 8,
  },
  emptyContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  // AI 요약 스타일
  summaryContainer: {
    marginTop: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366f1',
  },
  resummaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(156, 39, 176, 0.1)',
  },
  resummaryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9c27b0',
  },
  sentimentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  sentimentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  summaryKeywords: {
    marginTop: 8,
  },
  keywordsToggleButton: {
    paddingVertical: 4,
  },
  summaryKeywordsTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryKeyword: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 4,
    marginBottom: 4,
  },
  summaryKeywordText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#1976d2',
  },
  satisfactionScore: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  satisfactionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  scoreStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  star: {
    fontSize: 14,
  },
  scoreNumber: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  tipsSection: {
    marginTop: 8,
  },
  tipsTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 2,
  },
  menuItemsSection: {
    marginTop: 8,
  },
  menuItemsTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  menuItemBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1.5,
  },
  menuItemText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  sentimentReason: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  sentimentReasonLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  sentimentReasonText: {
    fontSize: 11,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  filterContainer: {
    paddingTop: 12,
    paddingBottom: 4,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  modelList: {
    marginBottom: 24,
  },
  modelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  modelLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmButton: {
    minHeight: 48,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  // Statistics styles
  statisticsContainer: {
    marginBottom: 16,
  },
  statisticsCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  statisticsCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  statisticsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  topMenusList: {
    gap: 8,
  },
  topMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  topMenuRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  topMenuRankText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  topMenuInfo: {
    flex: 1,
  },
  topMenuName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  topMenuStats: {
    fontSize: 12,
  },
  allMenusList: {
    gap: 12,
  },
  menuStatItem: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  menuStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  menuStatName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  menuStatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  menuStatBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  menuStatCounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  menuStatCount: {
    alignItems: 'center',
  },
  menuStatReasons: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  menuStatReason: {
    fontSize: 12,
    marginBottom: 2,
  },
  // 스켈레톤 UI 스타일
  skeletonCard: {
    opacity: 0.6,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
  },
  skeletonTiny: {
    width: '30%',
  },
  skeletonShort: {
    width: '40%',
  },
  skeletonMedium: {
    width: '60%',
  },
  skeletonFull: {
    width: '100%',
  },
  // 네이버맵 탭 스타일
  mapButtonContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  mapDescription: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  openMapButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 200,
  },
  openMapButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  // 검색 UI 스타일
  searchContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  searchButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default RestaurantDetailScreen;
