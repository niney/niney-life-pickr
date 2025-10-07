import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useTheme, useSocket } from 'shared/contexts';
import { THEME_COLORS } from 'shared/constants';
import { apiService } from 'shared/services';
import type { RestaurantCategory, RestaurantData, ReviewData } from 'shared/services';
import { Alert } from 'shared/utils';

const RestaurantScreen: React.FC = () => {
  const { theme } = useTheme();
  const colors = THEME_COLORS[theme];
  
  // Socket 연결 (전역 단일 연결)
  const { 
    reviewCrawlStatus, 
    crawlProgress, 
    dbProgress, 
    joinPlaceRoom, 
    leavePlaceRoom,
    setPlaceCallbacks,
    resetCrawlStatus 
  } = useSocket();
  
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<RestaurantCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [restaurants, setRestaurants] = useState<RestaurantData[]>([]);
  const [restaurantsLoading, setRestaurantsLoading] = useState(false);
  const [total, setTotal] = useState(0);

  // 리뷰 목록 state
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantData | null>(null);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsLimit] = useState(20);
  const [reviewsOffset, setReviewsOffset] = useState(0);

  // selectedPlaceId 변경 시 room 입장/퇴장
  useEffect(() => {
    if (selectedPlaceId) {
      joinPlaceRoom(selectedPlaceId);
      return () => {
        leavePlaceRoom(selectedPlaceId);
      };
    }
  }, [selectedPlaceId]);

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
    resetCrawlStatus();
    
    // 크롤링 완료/에러 시 콜백 설정
    setPlaceCallbacks({
      onCompleted: async () => {
        await fetchRestaurants();
        await fetchCategories();
      },
      onError: async () => {
        await fetchRestaurants();
        await fetchCategories();
      }
    });

    try {
      const response = await apiService.crawlRestaurant({ url: url.trim(), crawlMenus: true, crawlReviews: true });

      if (response.result && response.data) {
        const placeId = response.data.placeId;
        
        if (placeId) {
          // 목록 갱신
          await fetchRestaurants();
          await fetchCategories();
          
          // 해당 레스토랑 선택 (자동으로 room 입장)
          const restaurant = restaurants.find(r => r.place_id === placeId);
          if (restaurant) {
            handleRestaurantClick(restaurant);
          }
        } else {
          Alert.success('크롤링 완료', response.message || '크롤링을 완료했습니다');
          await fetchRestaurants();
          await fetchCategories();
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || '크롤링 중 오류가 발생했습니다';
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
          style={[
            styles.input, 
            { 
              borderColor: colors.border, 
              color: colors.text,
              backgroundColor: theme === 'light' ? '#ffffff' : colors.surface
            }
          ]}
          placeholder="URL 또는 Place ID를 입력하세요"
          placeholderTextColor={colors.textSecondary}
          value={url}
          onChangeText={setUrl}
        />
        <TouchableOpacity
          style={[
            styles.searchButton, 
            { 
              backgroundColor: theme === 'light' ? '#f5f5f5' : colors.surface,
              borderWidth: 1, 
              borderColor: colors.border 
            }
          ]}
          onPress={handleCrawl}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>추가</Text>
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
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScrollContent}
          >
            {categories.map((category) => (
              <View
                key={category.category}
                style={styles.categoryCardContainer}
              >
                <BlurView
                  style={styles.blurContainer}
                  blurType={theme === 'dark' ? 'dark' : 'light'}
                  blurAmount={15}
                  reducedTransparencyFallbackColor={theme === 'dark' ? 'rgba(26, 26, 26, 0.7)' : 'rgba(255, 255, 255, 0.7)'}
                />
                <View style={styles.categoryCardContent}>
                  <Text style={[styles.categoryName, { color: colors.text }]}>{category.category}</Text>
                  <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>{category.count}개</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : !categoriesLoading ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>등록된 카테고리가 없습니다</Text>
        ) : null}
      </View>

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
                  styles.restaurantCardContainer,
                  selectedPlaceId === restaurant.place_id && styles.restaurantCardSelected,
                  selectedPlaceId === restaurant.place_id && { borderColor: colors.primary }
                ]}
                onPress={() => handleRestaurantClick(restaurant)}
              >
                <BlurView
                  style={styles.blurContainer}
                  blurType={theme === 'dark' ? 'dark' : 'light'}
                  blurAmount={15}
                  reducedTransparencyFallbackColor={theme === 'dark' ? 'rgba(26, 26, 26, 0.7)' : 'rgba(255, 255, 255, 0.7)'}
                />
                <View style={styles.restaurantCardContent}>
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
                </View>
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

      <ScrollView 
        style={styles.reviewScrollView}
        contentContainerStyle={styles.reviewScrollContent}
      >
        {/* 크롤링 진행 상태 표시 */}
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

        {reviewsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : reviews.length > 0 ? (
          <View style={styles.reviewsList}>
            {reviews.map((review) => (
              <View
                key={review.id}
                style={styles.reviewCardContainer}
              >
                <BlurView
                  style={styles.blurContainer}
                  blurType={theme === 'dark' ? 'dark' : 'light'}
                  blurAmount={15}
                  reducedTransparencyFallbackColor={theme === 'dark' ? 'rgba(26, 26, 26, 0.7)' : 'rgba(255, 255, 255, 0.7)'}
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
    paddingBottom: 100, // 하단 탭바 공간 확보
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
  categoriesScrollContent: {
    gap: 8,
    paddingRight: 16,
  },
  // 글래스모피즘 카테고리 카드
  categoryCardContainer: {
    overflow: 'hidden',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  blurContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  categoryCardContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
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
  // 글래스모피즘 레스토랑 카드
  restaurantCardContainer: {
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  restaurantCardContent: {
    padding: 16,
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
  // 크롤링 진행 상태 (상세 화면용)
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600' as '600',
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
  // 리뷰 목록
  reviewsList: {
    gap: 12,
  },
  // 글래스모피즘 리뷰 카드
  reviewCardContainer: {
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  reviewCardContent: {
    padding: 16,
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
  },
  reviewScrollContent: {
    padding: 16,
    paddingBottom: 100, // 하단 탭바 공간 확보
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
  crawlProgressContainer: {
    marginBottom: 16,
  },
  crawlProgressCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  crawlProgressTitle: {
    fontSize: 15,
    fontWeight: '700' as '700',
    marginBottom: 12,
  },
  progressSection: {
    marginBottom: 12,
  },
});

export default RestaurantScreen;
