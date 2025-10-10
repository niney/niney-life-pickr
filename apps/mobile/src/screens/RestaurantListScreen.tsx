import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BlurView } from '@react-native-community/blur';
import {
  useTheme,
  useSocket,
  THEME_COLORS,
  apiService,
  Alert,
  useRestaurantList,
  type RestaurantData
} from 'shared';
import type { RestaurantStackParamList } from '../navigation/types';
import RecrawlModal from '../components/RecrawlModal';

type NavigationProp = NativeStackNavigationProp<RestaurantStackParamList, 'RestaurantList'>;

const RestaurantListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const colors = THEME_COLORS[theme];
  const { setRestaurantCallbacks, resetCrawlStatus } = useSocket();

  const [recrawlModalVisible, setRecrawlModalVisible] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantData | null>(null);

  // Pull to refresh 상태
  const [refreshing, setRefreshing] = useState(false);

  // iOS TextInput 성능 최적화를 위한 스타일 메모이제이션
  const inputStyle = React.useMemo(
    () => [
      styles.input,
      {
        borderColor: colors.border,
        color: colors.text,
        backgroundColor: theme === 'light' ? '#ffffff' : colors.surface,
      },
    ],
    [colors.border, colors.text, colors.surface, theme]
  );

  const searchButtonStyle = React.useMemo(
    () => [
      styles.searchButton,
      {
        backgroundColor: theme === 'light' ? '#f5f5f5' : colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      },
    ],
    [colors.surface, colors.border, theme]
  );

  // shared 훅 사용 (플랫폼 독립적)
  const {
    url,
    setUrl,
    loading,
    categories,
    categoriesLoading,
    restaurants,
    restaurantsLoading,
    total,
    handleCrawl: sharedHandleCrawl,
    fetchRestaurants,
    fetchCategories,
  } = useRestaurantList({
    onCrawlSuccess: (restaurant: RestaurantData | null) => {
      if (restaurant) {
        // 정석적인 네비게이션: 상세 화면으로 이동
        navigation.navigate('RestaurantDetail', {
          restaurantId: restaurant.id,
          restaurant: restaurant,
        });
      }
    },
  });

  // Pull to refresh 핸들러
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchCategories(),
        fetchRestaurants()
      ]);
    } catch (error) {
      console.error('새로고침 실패:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // 모바일 전용 크롤링 핸들러 (Socket 콜백 설정 추가)
  const handleCrawl = async () => {
    resetCrawlStatus();

    setRestaurantCallbacks({
      onCompleted: async () => {
        await fetchRestaurants();
        await fetchCategories();
      },
      onError: async () => {
        await fetchRestaurants();
        await fetchCategories();
      }
    });

    await sharedHandleCrawl();
  };

  const handleRestaurantPress = (restaurant: RestaurantData) => {
    // 정석적인 네비게이션: 상세 화면으로 이동
    navigation.navigate('RestaurantDetail', {
      restaurantId: restaurant.id,
      restaurant: restaurant,
    });
  };

  const handleRecrawlClick = (restaurant: RestaurantData, event: any) => {
    event.stopPropagation();
    setSelectedRestaurant(restaurant);
    setRecrawlModalVisible(true);
  };

  const handleRecrawlConfirm = async (options: { crawlMenus: boolean; crawlReviews: boolean; createSummary: boolean }) => {
    if (!selectedRestaurant) return;

    try {
      const response = await apiService.recrawlRestaurant(selectedRestaurant.id, options);
      if (response.result) {
        Alert.alert('재크롤링 시작', '백그라운드에서 크롤링이 진행됩니다.');
      } else {
        Alert.alert('재크롤링 실패', response.message || '재크롤링을 시작할 수 없습니다.');
      }
    } catch (error) {
      console.error('Recrawl error:', error);
      Alert.alert('오류', '재크롤링 중 오류가 발생했습니다.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* 검색 입력 */}
        <View style={styles.searchContainer}>
          <TextInput
            style={inputStyle}
            placeholder="URL 또는 Place ID를 입력하세요"
            placeholderTextColor={colors.textSecondary}
            value={url}
            onChangeText={setUrl}
            keyboardAppearance={theme === 'dark' ? 'dark' : 'light'}
          />
          <TouchableOpacity
            style={searchButtonStyle}
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
                  style={[
                    styles.categoryCardContainer,
                    theme === 'dark' ? styles.categoryCardDark : styles.categoryCardLight,
                  ]}
                >
                  <BlurView
                    style={styles.blurContainer}
                    blurType={theme === 'dark' ? 'dark' : 'light'}
                    blurAmount={20}
                    reducedTransparencyFallbackColor={theme === 'dark' ? 'rgba(26, 26, 26, 0.8)' : 'rgba(255, 255, 255, 0.9)'}
                    pointerEvents="none"
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
                    theme === 'dark' ? styles.restaurantCardDark : styles.restaurantCardLight,
                  ]}
                  onPress={() => handleRestaurantPress(restaurant)}
                  activeOpacity={0.7}
                >
                  <BlurView
                    style={styles.blurContainer}
                    blurType={theme === 'dark' ? 'dark' : 'light'}
                    blurAmount={20}
                    reducedTransparencyFallbackColor={theme === 'dark' ? 'rgba(26, 26, 26, 0.8)' : 'rgba(255, 255, 255, 0.9)'}
                    pointerEvents="none"
                  />
                  <View style={styles.restaurantCardContentWrapper}>
                    <View style={styles.restaurantCardContent}>
                      <Text style={[styles.restaurantName, { color: colors.text }]} numberOfLines={1}>
                        {restaurant.name}
                      </Text>
                      {restaurant.category && (
                        <Text style={[styles.restaurantCategory, { color: colors.textSecondary }]} numberOfLines={1}>
                          {restaurant.category}
                        </Text>
                      )}
                      {restaurant.address && (
                        <Text style={[styles.restaurantAddress, { color: colors.textSecondary }]} numberOfLines={1}>
                          {restaurant.address}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[styles.recrawlButton, { backgroundColor: colors.border }]}
                      onPress={(e: any) => handleRecrawlClick(restaurant, e)}
                    >
                      <Text style={[styles.recrawlIcon, { color: colors.text }]}>↻</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : !restaurantsLoading ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>등록된 레스토랑이 없습니다</Text>
          ) : null}
        </View>
      </ScrollView>

      <RecrawlModal
        visible={recrawlModalVisible}
        onClose={() => setRecrawlModalVisible(false)}
        onConfirm={handleRecrawlConfirm}
        restaurantName={selectedRestaurant?.name || ''}
      />
    </SafeAreaView>
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
    paddingBottom: 100,
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
  categoriesScrollContent: {
    gap: 8,
    paddingRight: 16,
  },
  categoryCardContainer: {
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1.5,
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  categoryCardLight: {
    borderColor: 'rgba(0, 0, 0, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  categoryCardDark: {
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
  categoryCardContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
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
  restaurantCardContainer: {
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  restaurantCardLight: {
    borderColor: 'rgba(0, 0, 0, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  restaurantCardDark: {
    borderColor: 'rgba(255, 255, 255, 0.18)',
    backgroundColor: 'rgba(26, 26, 26, 0.3)',
  },
  restaurantCardContent: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  restaurantCardContentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  recrawlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    flexShrink: 0,
  },
  recrawlIcon: {
    fontSize: 20,
    fontWeight: '600',
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
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default RestaurantListScreen;
