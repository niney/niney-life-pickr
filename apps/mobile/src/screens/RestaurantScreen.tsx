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
import { useTheme } from 'shared/contexts';
import { THEME_COLORS } from 'shared/constants';
import { apiService } from 'shared/services';
import type { RestaurantCategory, RestaurantData } from 'shared/services';
import { Alert } from 'shared/utils';

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
    try {
      const response = await apiService.crawlRestaurant({
        url: url.trim(),
        crawlMenus: true,
      });

      if (response.result && response.data) {
        Alert.success('성공', '크롤링이 완료되었습니다');
        setUrl('');
        fetchCategories();
        fetchRestaurants();
      } else {
        throw new Error(response.message || '크롤링 실패');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '크롤링 중 오류가 발생했습니다';
      Alert.error('크롤링 실패', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            placeholder="네이버 맵 URL 입력"
            placeholderTextColor={colors.textSecondary}
            value={url}
            onChangeText={setUrl}
          />
          <TouchableOpacity
            style={[styles.searchButton, { backgroundColor: colors.primary }]}
            onPress={handleCrawl}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.searchButtonText}>추가</Text>
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

        {/* 레스토랑 목록 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>레스토랑 목록 ({total})</Text>
            {restaurantsLoading && <ActivityIndicator size="small" color={colors.text} />}
          </View>
          {restaurants.length > 0 ? (
            <View style={styles.restaurantsList}>
              {restaurants.map((restaurant) => (
                <View
                  key={restaurant.id}
                  style={[styles.restaurantCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
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
                </View>
              ))}
            </View>
          ) : !restaurantsLoading ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>등록된 레스토랑이 없습니다</Text>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
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
  searchButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
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

export default RestaurantScreen;
