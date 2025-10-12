import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Image,
  Dimensions,
  Modal,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faStar, faStarHalfStroke, faRedo } from '@fortawesome/free-solid-svg-icons';
import { faStar as farStar } from '@fortawesome/free-regular-svg-icons';
import ImageViewing from 'react-native-image-viewing';
import {
  useTheme,
  useSocket,
  THEME_COLORS,
  useReviews,
  useMenus,
  apiService
} from 'shared';
import type { RestaurantStackParamList } from '../navigation/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type RestaurantDetailRouteProp = RouteProp<RestaurantStackParamList, 'RestaurantDetail'>;
type TabType = 'menu' | 'review';

// API Base URL 헬퍼 함수
const getApiBaseUrl = (): string => {
  // @ts-ignore - apiService.baseUrl는 private이지만 접근 가능
  return (apiService as any).baseUrl || 'http://localhost:4000';
};

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

  // 탭 상태 관리
  const [activeTab, setActiveTab] = useState<TabType>('menu');

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
    fetchReviews,
    loadMoreReviews,
    changeSentimentFilter,
  } = useReviews();

  const {
    menus,
    menusLoading,
    fetchMenus,
  } = useMenus();

  // Room 입장/퇴장 및 크롤링 완료 콜백 설정
  useEffect(() => {
    const restaurantIdStr = String(restaurantId);
    joinRestaurantRoom(restaurantIdStr);

    // 크롤링 완료 시 리뷰 갱신 콜백 설정
    setRestaurantCallbacks({
      onReviewCrawlCompleted: async () => {
        // 리뷰 다시 로드 (shared 훅 사용)
        await fetchReviews(restaurantId, 0, false); // offset 0으로 초기화

        // 메뉴도 함께 갱신
        await fetchMenus(restaurantId);
      },
      onReviewSummaryCompleted: async () => {
        // 리뷰 요약 완료 시에도 갱신
        await fetchReviews(restaurantId, 0, false);
      },
      onReviewCrawlError: async () => {
        await fetchReviews(restaurantId, 0, false);
        await fetchMenus(restaurantId);
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

  // 크롤링/요약 상태 체크
  const isCrawling = reviewCrawlStatus.status === 'active';
  const isSummarizing = reviewSummaryStatus.status === 'active';

  // 스크롤 이벤트 처리 (무한 스크롤)
  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const paddingToBottom = 100; // 하단에서 100px 전에 트리거
    const isNearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - paddingToBottom;

    if (isNearBottom && activeTab === 'review' && !reviewsLoadingMore && !reviewsLoading && hasMoreReviews) {
      loadMoreReviews(restaurantId);
    }
  }, [activeTab, restaurantId, reviewsLoadingMore, reviewsLoading, hasMoreReviews]);

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
      const apiBaseUrl = getApiBaseUrl();
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
        throw new Error('재요약 요청 실패');
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
    const fullUrls = images.map(img => `${getApiBaseUrl()}${img}`);
    setImageViewerUrls(fullUrls);
    setImageViewerIndex(index);
    setImageViewerVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
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
        <View onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
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
              onPress={() => setActiveTab('menu')}
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
              onPress={() => setActiveTab('review')}
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
            {reviewsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
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
                                source={{ uri: `${getApiBaseUrl()}${review.images[0]}` }}
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
                                    source={{ uri: `${getApiBaseUrl()}${imageUrl}` }}
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
});

export default RestaurantDetailScreen;
