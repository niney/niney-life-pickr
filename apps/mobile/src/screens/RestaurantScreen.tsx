import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from 'shared/contexts';
import { THEME_COLORS } from 'shared/constants';
import { apiService } from 'shared/services';
import type { RestaurantCategory, RestaurantData, ReviewCrawlStatus, ReviewData } from 'shared/services';
import { Alert } from 'shared/utils';
import { io, Socket } from 'socket.io-client';

const RestaurantScreen: React.FC = () => {
  const { theme } = useTheme();
  const colors = THEME_COLORS[theme];
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<RestaurantCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [restaurants, setRestaurants] = useState<RestaurantData[]>([]);
  const [restaurantsLoading, setRestaurantsLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [reviewCrawlStatus, setReviewCrawlStatus] = useState<ReviewCrawlStatus>({
    status: 'idle',
    reviews: []
  });

  // 리뷰 목록 state
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantData | null>(null);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsLimit] = useState(20);
  const [reviewsOffset, setReviewsOffset] = useState(0);

  const socketRef = useRef<Socket | null>(null);

  // Socket.io 연결 설정
  useEffect(() => {
    const socket = io('http://localhost:4000', {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('[Socket.io] Connected:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('[Socket.io] Disconnected');
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const response = await apiService.getRestaurantCategories();
      if (response.result && response.data) {
        setCategories(response.data);
      }
    } catch (err) {
      console.error('카테고리 조회 실패:', err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchRestaurants = async () => {
    setRestaurantsLoading(true);
    try {
      const response = await apiService.getRestaurants(20, 0);
      if (response.result && response.data) {
        setRestaurants(response.data.restaurants);
        setTotal(response.data.total);
      }
    } catch (err) {
      console.error('레스토랑 목록 조회 실패:', err);
    } finally {
      setRestaurantsLoading(false);
    }
  };

  const fetchReviews = async (placeId: string, offset: number = 0) => {
    setReviewsLoading(true);
    try {
      const response = await apiService.getReviewsByPlaceId(placeId, reviewsLimit, offset);
      if (response.result && response.data) {
        setReviews(response.data.reviews);
        setReviewsTotal(response.data.total);
        setReviewsOffset(offset);
      }
    } catch (err) {
      console.error('리뷰 조회 실패:', err);
      Alert.error('조회 실패', '리뷰를 불러오는데 실패했습니다');
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleRestaurantClick = (restaurant: RestaurantData) => {
    setSelectedPlaceId(restaurant.place_id);
    setSelectedRestaurant(restaurant);
    fetchReviews(restaurant.place_id);
  };

  const handleBackToList = () => {
    setSelectedPlaceId(null);
    setSelectedRestaurant(null);
    setReviews([]);
  };

  useEffect(() => {
    fetchCategories();
    fetchRestaurants();
  }, []);

  const handleCrawl = async () => {
    if (!url.trim()) {
      Alert.error('오류', 'URL을 입력해주세요');
      return;
    }

    setLoading(true);
    setReviewCrawlStatus({
      status: 'active',
      reviews: []
    });

    try {
      const response = await apiService.crawlRestaurant({ url: url.trim(), crawlMenus: true, crawlReviews: true });

      if (response.result && response.data?.jobId && socketRef.current) {
        const socket = socketRef.current;
        const jobId = response.data.jobId;

        socket.on(`reviewCrawl:progress:${jobId}`, (data: any) => {
          console.log('[Socket.io] Progress:', data);
          setReviewCrawlStatus({
            status: 'active',
            progress: data.progress,
            reviews: data.reviews
          });
        });

        socket.on(`reviewCrawl:completed:${jobId}`, (data: any) => {
          console.log('[Socket.io] Completed:', data);
          setReviewCrawlStatus({
            status: 'completed',
            reviews: data.reviews
          });
          socket.off(`reviewCrawl:progress:${jobId}`);
          socket.off(`reviewCrawl:completed:${jobId}`);
          socket.off(`reviewCrawl:failed:${jobId}`);

          Alert.success('크롤링 완료', `${data.reviews?.length || 0}개의 리뷰를 수집했습니다`);
          fetchRestaurants();
          fetchCategories();
        });

        socket.on(`reviewCrawl:failed:${jobId}`, (data: any) => {
          console.error('[Socket.io] Failed:', data);
          const errorMessage = data.error || '크롤링 중 오류가 발생했습니다';
          setReviewCrawlStatus({
            status: 'failed',
            error: errorMessage,
            reviews: []
          });
          socket.off(`reviewCrawl:progress:${jobId}`);
          socket.off(`reviewCrawl:completed:${jobId}`);
          socket.off(`reviewCrawl:failed:${jobId}`);

          Alert.error('크롤링 실패', errorMessage);
        });
      } else {
        Alert.success('크롤링 완료', response.message || '크롤링을 완료했습니다');
        fetchRestaurants();
        fetchCategories();
        setReviewCrawlStatus({
          status: 'completed',
          reviews: []
        });
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || '크롤링 중 오류가 발생했습니다';
      setReviewCrawlStatus({
        status: 'failed',
        error: errorMessage,
        reviews: []
      });
      Alert.error('크롤링 실패', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ==================== 공통 컨텐츠 컴포넌트 ====================
  const RestaurantListContent = () => (
    <>
      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          placeholder="URL 또는 Place ID를 입력하세요"
          placeholderTextColor={colors.textSecondary}
          value={url}
          onChangeText={setUrl}
        />
        <TouchableOpacity
          style={[styles.searchButton, { backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: colors.border }]}
          onPress={handleCrawl}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#666" />
          ) : (
            <Text style={{ color: '#666', fontSize: 15, fontWeight: '600' }}>추가</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 카테고리 섹션 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>카테고리</Text>
          {categoriesLoading && <ActivityIndicator size="small" color={colors.text} />}
        </View>
        {categories.length > 0 ? (
          <View style={styles.categoriesGrid}>
            {categories.map((category) => (
              <View
                key={category.category}
                style={[styles.categoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={[styles.categoryName, { color: colors.text }]}>{category.category}</Text>
                <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>{category.count}개</Text>
              </View>
            ))}
          </View>
        ) : !categoriesLoading ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>등록된 카테고리가 없습니다</Text>
        ) : null}
      </View>

      {/* 리뷰 크롤링 진행 상황 */}
      {reviewCrawlStatus.status !== 'idle' && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>리뷰 크롤링</Text>
            {reviewCrawlStatus.status === 'active' && <ActivityIndicator size="small" color={colors.text} />}
          </View>

          {reviewCrawlStatus.progress && (
            <View style={[styles.progressContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.progressInfo}>
                <Text style={[styles.progressText, { color: colors.text }]}>
                  {reviewCrawlStatus.progress.current} / {reviewCrawlStatus.progress.total}
                </Text>
                <Text style={[styles.progressPercentage, { color: colors.textSecondary }]}>
                  {reviewCrawlStatus.progress.percentage}%
                </Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${reviewCrawlStatus.progress.percentage}%`, backgroundColor: colors.primary }
                  ]}
                />
              </View>
            </View>
          )}

          {reviewCrawlStatus.status === 'completed' && (
            <Text style={[styles.statusText, { color: '#28a745' }]}>✓ 크롤링 완료</Text>
          )}
          {reviewCrawlStatus.status === 'failed' && (
            <Text style={[styles.statusText, { color: '#dc3545' }]}>✗ {reviewCrawlStatus.error || '크롤링 실패'}</Text>
          )}
        </View>
      )}

      {/* 크롤링된 리뷰 임시 표시 */}
      {reviewCrawlStatus.reviews && reviewCrawlStatus.reviews.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>크롤링된 리뷰 ({reviewCrawlStatus.reviews.length})</Text>
          </View>

          <View style={styles.reviewsList}>
            {reviewCrawlStatus.reviews.map((review, index) => (
              <View
                key={index}
                style={[
                  styles.reviewCard,
                  {
                    backgroundColor: theme === 'light' ? '#ffffff' : colors.surface,
                    borderColor: colors.border
                  }
                ]}
              >
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
            ))}
          </View>
        </View>
      )}

      {/* 레스토랑 목록 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>레스토랑 목록 ({total})</Text>
          {restaurantsLoading && <ActivityIndicator size="small" color={colors.text} />}
        </View>
        {restaurants.length > 0 ? (
          <View style={styles.restaurantsList}>
            {restaurants.map((restaurant) => (
              <TouchableOpacity
                key={restaurant.id}
                style={[
                  styles.restaurantCard,
                  {
                    backgroundColor: theme === 'light' ? '#ffffff' : colors.surface,
                    borderColor: colors.border
                  },
                  selectedPlaceId === restaurant.place_id && styles.restaurantCardSelected,
                  selectedPlaceId === restaurant.place_id && { borderColor: colors.primary }
                ]}
                onPress={() => handleRestaurantClick(restaurant)}
              >
                <Text style={[styles.restaurantName, { color: colors.text }]}>{restaurant.name}</Text>
                {restaurant.category && (
                  <Text style={[styles.restaurantCategory, { color: colors.textSecondary }]}>
                    {restaurant.category}
                  </Text>
                )}
                {restaurant.address && (
                  <Text style={[styles.restaurantAddress, { color: colors.textSecondary }]} numberOfLines={1}>
                    {restaurant.address}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : !restaurantsLoading ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>등록된 레스토랑이 없습니다</Text>
        ) : null}
      </View>
    </>
  );

  const ReviewListContent = () => (
    <>
      <View style={[styles.reviewHeader, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackToList}>
          <Text style={[styles.backButtonText, { color: colors.text }]}>← 뒤로</Text>
        </TouchableOpacity>
        <View style={styles.reviewHeaderInfo}>
          <Text style={[styles.reviewHeaderTitle, { color: colors.text }]}>
            {selectedRestaurant?.name || '레스토랑'}
          </Text>
          <Text style={[styles.reviewHeaderSubtitle, { color: colors.textSecondary }]}>
            리뷰 {reviewsTotal}개
          </Text>
        </View>
      </View>

      <ScrollView style={styles.reviewScrollView}>
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
                  styles.reviewCard,
                  {
                    backgroundColor: theme === 'light' ? '#ffffff' : colors.surface,
                    borderColor: colors.border
                  }
                ]}
              >
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
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>등록된 리뷰가 없습니다</Text>
          </View>
        )}
      </ScrollView>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 모바일: 전체 화면 토글 (레스토랑 목록 ↔ 리뷰) */}
      {selectedPlaceId ? (
        <View style={styles.mobileReviewContainer}>
          <ReviewListContent />
        </View>
      ) : (
        <ScrollView style={styles.mobileScrollView} contentContainerStyle={styles.content}>
          <RestaurantListContent />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mobileScrollView: {
    flex: 1,
  },
  mobileReviewContainer: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  searchButton: {
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCard: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 100,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 13,
  },
  restaurantsList: {
    gap: 8,
  },
  restaurantCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  restaurantCardSelected: {
    borderWidth: 2,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  restaurantCategory: {
    fontSize: 13,
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 13,
  },
  // 리뷰 크롤링
  progressContainer: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: 14,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // 리뷰 목록
  reviewsList: {
    gap: 12,
  },
  reviewCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
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
  // 리뷰 헤더
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    paddingRight: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  reviewHeaderInfo: {
    flex: 1,
  },
  reviewHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  reviewHeaderSubtitle: {
    fontSize: 13,
  },
  reviewScrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default RestaurantScreen;
