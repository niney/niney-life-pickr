import { useState, useEffect } from 'react'
import { apiService, type RestaurantCategory, type RestaurantData, Alert } from '../'

export interface RestaurantListHookOptions {
  onCrawlSuccess?: (restaurant: RestaurantData | null, placeId: string) => void
  onCrawlError?: (error: string) => void
}

/**
 * 레스토랑 목록 관리 훅
 * 플랫폼 독립적 - 웹/모바일 공통 사용
 * 네비게이션은 콜백으로 처리 (플랫폼별 구현)
 */
export const useRestaurantList = (options?: RestaurantListHookOptions) => {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<RestaurantCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [restaurants, setRestaurants] = useState<RestaurantData[]>([])
  const [restaurantsLoading, setRestaurantsLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

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

  const fetchRestaurants = async (limit: number = 100, offset: number = 0) => {
    setRestaurantsLoading(true)
    try {
      const response = await apiService.getRestaurants(
        limit, 
        offset, 
        selectedCategory || undefined
      )
      if (response.result && response.data) {
        setRestaurants(response.data.restaurants)
        setTotal(response.data.total)
        return response.data.restaurants
      }
    } catch (err) {
      console.error('레스토랑 조회 실패:', err)
    } finally {
      setRestaurantsLoading(false)
    }
    return []
  }

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
        crawlReviews: true
      })

      if (response.result && response.data) {
        const placeId = response.data.placeId

        // 목록 갱신
        const updatedRestaurants = await fetchRestaurants()
        await fetchCategories()

        // 성공 시 URL 초기화
        setUrl('')

        if (placeId) {
          // placeId로 레스토랑 찾기
          const newRestaurant = updatedRestaurants.find(r => r.place_id === placeId) || null

          // 성공 콜백 호출 (플랫폼별 네비게이션 처리)
          options?.onCrawlSuccess?.(newRestaurant, placeId)
        } else {
          options?.onCrawlSuccess?.(null, '')
        }
      } else {
        await fetchRestaurants()
        await fetchCategories()
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || '크롤링 중 오류가 발생했습니다'
      Alert.error('크롤링 실패', errorMessage)
      options?.onCrawlError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  // 카테고리 변경 시 레스토랑 재조회 (마운트 시에도 실행됨)
  useEffect(() => {
    fetchRestaurants()
  }, [selectedCategory])

  return {
    url,
    setUrl,
    loading,
    categories,
    categoriesLoading,
    restaurants,
    restaurantsLoading,
    total,
    selectedCategory,
    setSelectedCategory,
    handleCrawl,
    fetchRestaurants,
    fetchCategories,
  }
}

export type RestaurantListHookReturn = ReturnType<typeof useRestaurantList>
