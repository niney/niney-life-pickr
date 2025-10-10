import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import { useTheme, useSocket, THEME_COLORS, apiService, Alert, type ReviewData, type MenuItem } from 'shared';
import type { RestaurantStackParamList } from '../navigation/types';

type RestaurantDetailRouteProp = RouteProp<RestaurantStackParamList, 'RestaurantDetail'>;
type TabType = 'menu' | 'review';

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

  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsLoadingMore, setReviewsLoadingMore] = useState(false);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsLimit] = useState(20);
  const [reviewsOffset, setReviewsOffset] = useState(0);
  const [hasMoreReviews, setHasMoreReviews] = useState(true);

  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [menusLoading, setMenusLoading] = useState(false);

  // Pull to refresh 상태
  const [refreshing, setRefreshing] = useState(false);

  // 중복 요청 방지를 위한 ref
  const fetchingOffsetRef = useRef<number | null>(null);

  // Room 입장/퇴장 및 크롤링 완료 콜백 설정
  useEffect(() => {
    const restaurantIdStr = String(restaurantId);
    joinRestaurantRoom(restaurantIdStr);

    // 크롤링 완료 시 리뷰 갱신 콜백 설정
    setRestaurantCallbacks({
      onCompleted: async () => {
        // 리뷰 다시 로드
        await fetchReviews(0, false); // offset 0으로 초기화
        
        // 메뉴도 함께 갱신
        await fetchMenus();
      },
      onError: async () => {
        await fetchReviews(0, false);
        await fetchMenus();
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

  // 리뷰 조회 (초기 로드)
  const fetchReviews = async (offset: number = 0, append: boolean = false) => {
    // 중복 요청 방지: 이미 같은 offset으로 요청 중이면 스킵
    if (fetchingOffsetRef.current === offset) {
      return;
    }

    // 요청 시작 - offset 기록
    fetchingOffsetRef.current = offset;
    
    if (append) {
      setReviewsLoadingMore(true);
    } else {
      setReviewsLoading(true);
    }
    
    try {
      const response = await apiService.getReviewsByRestaurantId(restaurantId, reviewsLimit, offset);
      
      if (response.result && response.data) {
        const newReviews = response.data.reviews;
        
        if (append) {
          setReviews(prev => [...prev, ...newReviews]);
        } else {
          setReviews(newReviews);
        }
        
        setReviewsTotal(response.data.total);
        setReviewsOffset(offset);
        
        // 더 불러올 데이터가 있는지 확인
        const hasMore = offset + newReviews.length < response.data.total;
        setHasMoreReviews(hasMore);
      }
    } catch (err) {
      console.error('리뷰 조회 실패:', err);
      Alert.error('조회 실패', '리뷰를 불러오는데 실패했습니다');
    } finally {
      // 요청 완료 - offset 기록 초기화
      fetchingOffsetRef.current = null;
      setReviewsLoading(false);
      setReviewsLoadingMore(false);
    }
  };

  // 추가 리뷰 로드
  const loadMoreReviews = useCallback(() => {
    if (!reviewsLoadingMore && !reviewsLoading && hasMoreReviews && activeTab === 'review') {
      const nextOffset = reviewsOffset + reviewsLimit;
      fetchReviews(nextOffset, true);
    }
  }, [reviewsLoadingMore, reviewsLoading, hasMoreReviews, reviewsOffset, reviewsLimit, reviews.length, activeTab, reviewsTotal]);

  // 메뉴 조회
  const fetchMenus = async () => {
    setMenusLoading(true);
    try {
      const response = await apiService.getRestaurantById(restaurantId);
      if (response.result && response.data) {
        setMenus(response.data.menus || []);
      }
    } catch (err) {
      console.error('메뉴 조회 실패:', err);
      Alert.error('조회 실패', '메뉴를 불러오는데 실패했습니다');
    } finally {
      setMenusLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    fetchMenus();
  }, []);

  // 크롤링/요약 상태 체크
  const isCrawling = reviewCrawlStatus.status === 'active';
  const isSummarizing = reviewSummaryStatus.status === 'active';

  // 스크롤 이벤트 처리 (무한 스크롤)
  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const paddingToBottom = 100; // 하단에서 100px 전에 트리거
    const isNearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - paddingToBottom;
    
    if (isNearBottom && activeTab === 'review') {
      loadMoreReviews();
    }
  }, [activeTab, loadMoreReviews]);

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

  // Pull to refresh 핸들러
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // 리뷰와 메뉴 동시에 새로고침
      await Promise.all([
        fetchReviews(0, false),
        fetchMenus()
      ]);
    } catch (error) {
      console.error('새로고침 실패:', error);
    } finally {
      setRefreshing(false);
    }
  }, [restaurantId]);

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
                      <BlurView
                        style={styles.blurContainer}
                        blurType={theme === 'dark' ? 'dark' : 'light'}
                        blurAmount={20}
                        reducedTransparencyFallbackColor={theme === 'dark' ? 'rgba(26, 26, 26, 0.8)' : 'rgba(255, 255, 255, 0.9)'}
                        pointerEvents="none"
                      />
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
                <BlurView
                  style={styles.blurContainer}
                  blurType={theme === 'dark' ? 'dark' : 'light'}
                  blurAmount={20}
                  reducedTransparencyFallbackColor={theme === 'dark' ? 'rgba(26, 26, 26, 0.8)' : 'rgba(255, 255, 255, 0.9)'}
                  pointerEvents="none"
                />
                <View style={styles.reviewCardContent}>
                  <View style={styles.reviewCardHeader}>
                    <Text style={[styles.reviewUserName, { color: colors.text }]}>{review.userName || '익명'}</Text>
                    {review.visitInfo.visitDate && (
                      <Text style={[styles.reviewDate, { color: colors.textSecondary }]}>
                        {review.visitInfo.visitDate}
                      </Text>
                    )}
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
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Text key={star} style={styles.star}>
                                {star <= (review.summary?.satisfactionScore || 0) ? '⭐' : '☆'}
                              </Text>
                            ))}
                            <Text style={[styles.scoreNumber, { color: colors.text }]}>
                              {review.summary.satisfactionScore.toFixed(1)}
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
    gap: 12,
  },
  menuCardContainer: {
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  menuCardLight: {
    borderColor: 'rgba(0, 0, 0, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  menuCardDark: {
    borderColor: 'rgba(255, 255, 255, 0.18)',
    backgroundColor: 'rgba(26, 26, 26, 0.3)',
  },
  menuCardContent: {
    padding: 14,
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
    gap: 12,
  },
  reviewCardContainer: {
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  reviewCardLight: {
    borderColor: 'rgba(0, 0, 0, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  reviewCardDark: {
    borderColor: 'rgba(255, 255, 255, 0.18)',
    backgroundColor: 'rgba(26, 26, 26, 0.3)',
  },
  blurContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  reviewCardContent: {
    padding: 16,
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
});

export default RestaurantDetailScreen;
