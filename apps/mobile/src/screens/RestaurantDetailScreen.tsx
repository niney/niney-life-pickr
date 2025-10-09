import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import { useTheme, useSocket } from 'shared/contexts';
import { THEME_COLORS } from 'shared/constants';
import { apiService } from 'shared/services';
import type { ReviewData, MenuItem } from 'shared/services';
import { Alert } from 'shared/utils';
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
    joinRestaurantRoom, 
    leaveRestaurantRoom 
  } = useSocket();
  
  // 탭 상태 관리
  const [activeTab, setActiveTab] = useState<TabType>('menu');
  
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsLimit] = useState(20);
  const [reviewsOffset, setReviewsOffset] = useState(0);

  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [menusLoading, setMenusLoading] = useState(false);

  // Room 입장/퇴장
  useEffect(() => {
    const restaurantIdStr = String(restaurantId);
    joinRestaurantRoom(restaurantIdStr);
    
    return () => {
      leaveRestaurantRoom(restaurantIdStr);
    };
  }, [restaurantId]);

  // 리뷰 조회
  const fetchReviews = async (offset: number = 0) => {
    setReviewsLoading(true);
    try {
      const response = await apiService.getReviewsByRestaurantId(restaurantId, reviewsLimit, offset);
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
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

        {/* 탭 메뉴 */}
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

        {/* 메뉴 탭 */}
        {activeTab === 'menu' && (
          <>
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
          </>
        )}

        {/* 리뷰 탭 */}
        {activeTab === 'review' && (
          <>
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
          </>
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
  content: {
    padding: 16,
  },
  restaurantInfoContainer: {
    marginBottom: 16,
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
    backgroundColor: 'transparent',
    marginBottom: 16,
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
  emptyContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default RestaurantDetailScreen;
