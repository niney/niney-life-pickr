import React, { useState, useEffect } from 'react'
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Text } from 'react-native'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import { apiService } from '@shared/services'
import type { RestaurantCategory, RestaurantData } from '@shared/services'
import { Alert } from '@shared/utils'
import Header from './Header'
import Drawer from './Drawer'

interface RestaurantProps {
  onLogout: () => Promise<void>
}

const Restaurant: React.FC<RestaurantProps> = ({ onLogout }) => {
  const { theme } = useTheme()
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<RestaurantCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [restaurants, setRestaurants] = useState<RestaurantData[]>([])
  const [restaurantsLoading, setRestaurantsLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const colors = THEME_COLORS[theme]

  // 카테고리 목록 가져오기
  const fetchCategories = async () => {
    setCategoriesLoading(true)
    try {
      const response = await apiService.getRestaurantCategories()
      if (response.result && response.data) {
        setCategories(response.data)
      }
    } catch (err) {
      console.error('카테고리 조회 실패:', err)
    } finally {
      setCategoriesLoading(false)
    }
  }

  // 레스토랑 목록 가져오기
  const fetchRestaurants = async () => {
    setRestaurantsLoading(true)
    try {
      const response = await apiService.getRestaurants(20, 0)
      if (response.result && response.data) {
        setRestaurants(response.data.restaurants)
        setTotal(response.data.total)
      }
    } catch (err) {
      console.error('레스토랑 목록 조회 실패:', err)
    } finally {
      setRestaurantsLoading(false)
    }
  }

  // 컴포넌트 마운트 시 카테고리 및 레스토랑 목록 가져오기
  useEffect(() => {
    fetchCategories()
    fetchRestaurants()
  }, [])

  const handleCrawl = async () => {
    if (!url.trim()) {
      Alert.error('오류', 'URL을 입력해주세요')
      return
    }

    setLoading(true)
    try {
      const response = await apiService.crawlRestaurant({
        url: url.trim(),
        crawlMenus: true,
      })

      if (response.result && response.data) {
        Alert.success('성공', '크롤링이 완료되었습니다')
        setUrl('')
        // 크롤링 완료 후 카테고리 및 레스토랑 목록 새로고침
        fetchCategories()
        fetchRestaurants()
      } else {
        throw new Error(response.message || '크롤링 실패')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '크롤링 중 오류가 발생했습니다'
      Alert.error('크롤링 실패', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await onLogout()
    window.location.href = '/login'
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header onMenuPress={() => setDrawerVisible(true)} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
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
              <FontAwesomeIcon icon={faPlus} style={{ fontSize: 18, color: '#666' }} />
            )}
          </TouchableOpacity>
        </View>

        {/* 카테고리 영역 */}
        <View style={styles.categoriesSection}>
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
        <View style={styles.restaurantsSection}>
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
                    <Text style={[styles.restaurantCategory, { color: colors.textSecondary }]}>{restaurant.category}</Text>
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
      </ScrollView>

      <Drawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onLogout={handleLogout}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesSection: {
    marginTop: 24,
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
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  restaurantsSection: {
    marginTop: 24,
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
})

export default Restaurant
