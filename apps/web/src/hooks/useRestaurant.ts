import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import { apiService } from '@shared/services'
import type { RestaurantCategory, RestaurantData, ReviewCrawlStatus } from '@shared/services'
import { Alert } from '@shared/utils'

export const useRestaurant = () => {
  const navigate = useNavigate()
  
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<RestaurantCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [restaurants, setRestaurants] = useState<RestaurantData[]>([])
  const [restaurantsLoading, setRestaurantsLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [reviewCrawlStatus, setReviewCrawlStatus] = useState<ReviewCrawlStatus>({
    status: 'idle',
    reviews: []
  })
  const [crawlProgress, setCrawlProgress] = useState<{ current: number; total: number; percentage: number } | null>(null)
  const [dbProgress, setDbProgress] = useState<{ current: number; total: number; percentage: number } | null>(null)
  const [currentCrawlPlaceId, setCurrentCrawlPlaceId] = useState<string | null>(null)

  const socketRef = useRef<Socket | null>(null)

  // Socket.io 연결 - 크롤링 진행 상황 실시간 수신
  useEffect(() => {
    const socket = io('http://localhost:4000', {
      transports: ['websocket', 'polling']
    })

    socket.on('connect', () => {
      console.log('[Socket.io] Connected:', socket.id)
    })

    socket.on('disconnect', () => {
      console.log('[Socket.io] Disconnected')
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
    }
  }, [])

  // 크롤링 중인 placeId가 변경될 때 room 구독
  useEffect(() => {
    if (!socketRef.current || !currentCrawlPlaceId) return

    const socket = socketRef.current
    const placeId = currentCrawlPlaceId

    // place room 구독
    socket.emit('subscribe:place', placeId)
    console.log(`[Socket.io] Subscribed to place:${placeId}`)

    // 진행 상황 이벤트 핸들러
    const handleCrawlProgress = (data: any) => {
      if (data.placeId === placeId) {
        console.log('[Socket.io] Crawl Progress:', data)
        setCrawlProgress({
          current: data.current,
          total: data.total,
          percentage: data.percentage
        })
        setReviewCrawlStatus(prev => ({ ...prev, status: 'active' }))
      }
    }

    const handleDbProgress = (data: any) => {
      if (data.placeId === placeId) {
        console.log('[Socket.io] DB Progress:', data)
        setDbProgress({
          current: data.current,
          total: data.total,
          percentage: data.percentage
        })
        setReviewCrawlStatus(prev => ({ ...prev, status: 'active' }))
      }
    }

    const handleCompleted = (data: any) => {
      if (data.placeId === placeId) {
        console.log('[Socket.io] Completed:', data)
        setReviewCrawlStatus({ status: 'completed', reviews: [] })
        setCrawlProgress(null)
        setDbProgress(null)
        setCurrentCrawlPlaceId(null)
        Alert.success('크롤링 완료', `${data.totalReviews || 0}개의 리뷰를 수집했습니다`)
        
        // 데이터 갱신
        fetchRestaurants()
        fetchCategories()
      }
    }

    const handleError = (data: any) => {
      if (data.placeId === placeId) {
        console.error('[Socket.io] Error:', data)
        const errorMessage = data.error || '크롤링 중 오류가 발생했습니다'
        setReviewCrawlStatus({ status: 'failed', error: errorMessage, reviews: [] })
        setCrawlProgress(null)
        setDbProgress(null)
        setCurrentCrawlPlaceId(null)
        Alert.error('크롤링 실패', errorMessage)
        
        // 에러 발생 시에도 데이터 갱신
        fetchRestaurants()
        fetchCategories()
      }
    }

    socket.on('review:crawl_progress', handleCrawlProgress)
    socket.on('review:db_progress', handleDbProgress)
    socket.on('review:completed', handleCompleted)
    socket.on('review:error', handleError)

    return () => {
      socket.emit('unsubscribe:place', placeId)
      socket.off('review:crawl_progress', handleCrawlProgress)
      socket.off('review:db_progress', handleDbProgress)
      socket.off('review:completed', handleCompleted)
      socket.off('review:error', handleError)
      console.log(`[Socket.io] Unsubscribed from place:${placeId}`)
    }
  }, [currentCrawlPlaceId])

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

  const fetchRestaurants = async () => {
    setRestaurantsLoading(true)
    try {
      const response = await apiService.getRestaurants()
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

  const handleRestaurantClick = (restaurant: RestaurantData) => {
    navigate(`/restaurant/${restaurant.place_id}`)
  }

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
    setReviewCrawlStatus({ status: 'active', reviews: [] })
    setCrawlProgress({ current: 0, total: 0, percentage: 0 })
    setDbProgress({ current: 0, total: 0, percentage: 0 })

    try {
      const response = await apiService.crawlRestaurant({ url, crawlMenus: true, crawlReviews: true })

      if (response.result && response.data) {
        const placeId = response.data.placeId
        
        if (placeId) {
          // Socket.io room 구독하여 실시간 진행 상황 수신
          setCurrentCrawlPlaceId(placeId)
          
          // 목록 갱신 (새로 추가된 레스토랑 표시)
          await fetchRestaurants()
          await fetchCategories()
          
          // 상세 화면으로 이동
          navigate(`/restaurant/${placeId}`)
        }
      } else {
        setReviewCrawlStatus({ status: 'completed', reviews: [] })
        setCrawlProgress(null)
        setDbProgress(null)
        await fetchRestaurants()
        await fetchCategories()
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || '크롤링 중 오류가 발생했습니다'
      setReviewCrawlStatus({ status: 'failed', error: errorMessage, reviews: [] })
      setCrawlProgress(null)
      setDbProgress(null)
      Alert.error('크롤링 실패', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return {
    url,
    setUrl,
    loading,
    categories,
    categoriesLoading,
    restaurants,
    restaurantsLoading,
    total,
    reviewCrawlStatus,
    crawlProgress,
    dbProgress,
    handleCrawl,
    handleRestaurantClick,
  }
}
