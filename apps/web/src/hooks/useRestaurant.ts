import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import { apiService } from '@shared/services'
import type { RestaurantCategory, RestaurantData, ReviewCrawlStatus, ReviewData } from '@shared/services'
import { Alert } from '@shared/utils'

export const useRestaurant = () => {
  const { placeId } = useParams<{ placeId?: string }>()
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

  // 리뷰 목록 state
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(placeId || null)
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantData | null>(null)
  const [reviews, setReviews] = useState<ReviewData[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsTotal, setReviewsTotal] = useState(0)
  const [reviewsLimit] = useState(20)
  const [reviewsOffset, setReviewsOffset] = useState(0)

  const socketRef = useRef<Socket | null>(null)

  // Socket.io 연결 설정
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

  // selectedPlaceId 변경 시 place room 구독/구독 해제
  useEffect(() => {
    if (!socketRef.current) return

    if (selectedPlaceId) {
      // 새로운 place room 구독
      socketRef.current.emit('subscribe:place', selectedPlaceId)
      console.log(`[Socket.io] Subscribed to place:${selectedPlaceId}`)

      // Socket 이벤트 리스너 등록
      const handleCrawlProgress = (data: any) => {
        if (data.placeId === selectedPlaceId) {
          console.log('[Socket.io] Crawl Progress:', data)
          setCrawlProgress({
            current: data.current,
            total: data.total,
            percentage: data.percentage
          })
          setReviewCrawlStatus(prev => ({
            ...prev,
            status: 'active'
          }))
        }
      }

      const handleDbProgress = (data: any) => {
        if (data.placeId === selectedPlaceId) {
          console.log('[Socket.io] DB Progress:', data)
          setDbProgress({
            current: data.current,
            total: data.total,
            percentage: data.percentage
          })
          setReviewCrawlStatus(prev => ({
            ...prev,
            status: 'active'
          }))
        }
      }

      const handleCompleted = (data: any) => {
        if (data.placeId === selectedPlaceId) {
          console.log('[Socket.io] Completed:', data)
          setReviewCrawlStatus({
            status: 'completed',
            reviews: []
          })
          setCrawlProgress(null)
          setDbProgress(null)
          Alert.success('크롤링 완료', `${data.totalReviews || 0}개의 리뷰를 수집했습니다`)
          
          // 데이터 갱신
          fetchRestaurants()
          fetchCategories()
          if (selectedPlaceId) {
            fetchReviews(selectedPlaceId)
          }
        }
      }

      const handleError = (data: any) => {
        if (data.placeId === selectedPlaceId) {
          console.error('[Socket.io] Error:', data)
          const errorMessage = data.error || '크롤링 중 오류가 발생했습니다'
          setReviewCrawlStatus({
            status: 'failed',
            error: errorMessage,
            reviews: []
          })
          setCrawlProgress(null)
          setDbProgress(null)
          Alert.error('크롤링 실패', errorMessage)
          
          // 에러 발생 시에도 데이터 갱신 시도
          fetchRestaurants()
          fetchCategories()
        }
      }

      socketRef.current.on('review:crawl_progress', handleCrawlProgress)
      socketRef.current.on('review:db_progress', handleDbProgress)
      socketRef.current.on('review:completed', handleCompleted)
      socketRef.current.on('review:error', handleError)

      return () => {
        // 구독 해제 및 이벤트 리스너 제거
        socketRef.current?.emit('unsubscribe:place', selectedPlaceId)
        socketRef.current?.off('review:crawl_progress', handleCrawlProgress)
        socketRef.current?.off('review:db_progress', handleDbProgress)
        socketRef.current?.off('review:completed', handleCompleted)
        socketRef.current?.off('review:error', handleError)
        console.log(`[Socket.io] Unsubscribed from place:${selectedPlaceId}`)
      }
    }
  }, [selectedPlaceId])

  // URL 파라미터로 placeId가 전달되면 해당 레스토랑 정보 가져오기
  useEffect(() => {
    if (placeId && placeId !== selectedPlaceId) {
      // placeId가 있으면 리뷰 로드
      setSelectedPlaceId(placeId)
      fetchReviews(placeId)
    } else if (!placeId && selectedPlaceId) {
      // placeId가 없으면 (브라우저 뒤로가기) state 초기화
      setSelectedPlaceId(null)
      setSelectedRestaurant(null)
      setReviews([])
    }
  }, [placeId])

  // 선택된 레스토랑 정보 가져오기
  useEffect(() => {
    if (selectedPlaceId && !selectedRestaurant) {
      const restaurant = restaurants.find(r => r.place_id === selectedPlaceId)
      if (restaurant) {
        setSelectedRestaurant(restaurant)
      }
    }
  }, [selectedPlaceId, restaurants])

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

  const fetchReviews = async (placeId: string, offset: number = 0) => {
    setReviewsLoading(true)
    try {
      const response = await apiService.getReviewsByPlaceId(placeId, reviewsLimit, offset)
      if (response.result && response.data) {
        setReviews(response.data.reviews)
        setReviewsTotal(response.data.total)
        setReviewsOffset(offset)
      }
    } catch (err) {
      console.error('리뷰 조회 실패:', err)
      Alert.error('조회 실패', '리뷰를 불러오는데 실패했습니다')
    } finally {
      setReviewsLoading(false)
    }
  }

  const handleRestaurantClick = (restaurant: RestaurantData) => {
    setSelectedPlaceId(restaurant.place_id)
    setSelectedRestaurant(restaurant)
    navigate(`/restaurant/${restaurant.place_id}`)
    fetchReviews(restaurant.place_id)
  }

  const handleBackToList = () => {
    setSelectedPlaceId(null)
    setSelectedRestaurant(null)
    setReviews([])
    navigate('/restaurant')
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
    setReviewCrawlStatus({
      status: 'active',
      reviews: []
    })
    // 진행도 초기화 (0%로 시작)
    setCrawlProgress({ current: 0, total: 0, percentage: 0 })
    setDbProgress({ current: 0, total: 0, percentage: 0 })

    try {
      const response = await apiService.crawlRestaurant({ url, crawlMenus: true, crawlReviews: true })

      if (response.result && response.data) {
        // 크롤링 시작 성공
        console.log('[Crawl] Started successfully:', response.data)
        
        // placeId가 있으면 즉시 방 구독하여 진행도 수신
        const placeId = response.data.placeId
        if (placeId) {
          console.log('[Crawl] Subscribing to place:', placeId)
          
          // 레스토랑 목록 먼저 갱신 (새로 등록된 레스토랑 표시)
          await fetchRestaurants()
          await fetchCategories()
          
          // 레스토랑 찾기
          const newRestaurant = restaurants.find(r => r.place_id === placeId)
          if (!newRestaurant) {
            // 목록이 아직 갱신되지 않았다면 재시도
            await new Promise(resolve => setTimeout(resolve, 500))
            const refreshedResponse = await apiService.getRestaurants()
            if (refreshedResponse.result && refreshedResponse.data) {
              setRestaurants(refreshedResponse.data.restaurants)
              const foundRestaurant = refreshedResponse.data.restaurants.find((r: RestaurantData) => r.place_id === placeId)
              if (foundRestaurant) {
                setSelectedRestaurant(foundRestaurant)
              }
            }
          } else {
            setSelectedRestaurant(newRestaurant)
          }
          
          // 방 구독 및 리뷰 패널 표시 (클릭한 것처럼 동작)
          setSelectedPlaceId(placeId)
          navigate(`/restaurant/${placeId}`)
          
          // 리뷰 초기화 (크롤링 중에는 빈 상태로 시작)
          setReviews([])
          setReviewsTotal(0)
        }
      } else {
        fetchRestaurants()
        fetchCategories()
        setReviewCrawlStatus({
          status: 'completed',
          reviews: []
        })
        setCrawlProgress(null)
        setDbProgress(null)
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || '크롤링 중 오류가 발생했습니다'
      setReviewCrawlStatus({
        status: 'failed',
        error: errorMessage,
        reviews: []
      })
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
    selectedPlaceId,
    selectedRestaurant,
    reviews,
    reviewsLoading,
    reviewsTotal,
    reviewsLimit,
    reviewsOffset,
    handleCrawl,
    handleRestaurantClick,
    handleBackToList,
    fetchReviews,
  }
}
