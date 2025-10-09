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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BlurView } from '@react-native-community/blur';
import { useTheme, useSocket } from 'shared/contexts';
import { THEME_COLORS } from 'shared/constants';
import { apiService } from 'shared/services';
import type { RestaurantCategory, RestaurantData } from 'shared/services';
import { Alert } from 'shared/utils';
import type { RestaurantStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RestaurantStackParamList, 'RestaurantList'>;

const RestaurantListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const colors = THEME_COLORS[theme];
  const { setRestaurantCallbacks, resetCrawlStatus } = useSocket();
  
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<RestaurantCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [restaurants, setRestaurants] = useState<RestaurantData[]>([]);
  const [restaurantsLoading, setRestaurantsLoading] = useState(false);
  const [total, setTotal] = useState(0);

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
        return response.data.restaurants;
      }
    } catch (err) {
      console.error('레스토랑 목록 조회 실패:', err);
    } finally {
      setRestaurantsLoading(false);
    }
    return [];
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

    try {
      const response = await apiService.crawlRestaurant({ 
        url: url.trim(), 
        crawlMenus: true, 
        crawlReviews: true 
      });

      if (response.result && response.data) {
        const placeId = response.data.placeId;
        
        if (placeId) {
          const updatedRestaurants = await fetchRestaurants();
          await fetchCategories();
          
          const restaurant = updatedRestaurants.find(r => r.place_id === placeId);
          if (restaurant) {
            // 정석적인 네비게이션: 상세 화면으로 이동
            navigation.navigate('RestaurantDetail', {
              restaurantId: restaurant.id,
              restaurant: restaurant,
            });
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

  const handleRestaurantPress = (restaurant: RestaurantData) => {
    // 정석적인 네비게이션: 상세 화면으로 이동
    navigation.navigate('RestaurantDetail', {
      restaurantId: restaurant.id,
      restaurant: restaurant,
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 검색 입력 */}
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
                  style={styles.restaurantCardContainer}
                  onPress={() => handleRestaurantPress(restaurant)}
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
      </ScrollView>
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
