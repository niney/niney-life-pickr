import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import { apiService } from '@shared/services'
import type { RestaurantData, ReviewData } from '@shared/services'
import { Alert } from '@shared/utils'

export const useRestaurantDetail = () => {
  const { placeId } = useParams<{ placeId: string }>()
  const navigate = useNavigate()
  
  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null)
  const [restaurantLoading, setRestaurantLoading] = useState(false)
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
      console.log('[Socket.io Detail] Connected:', socket.id)
    })

    socket.on('disconnect', () => {
      console.log('[Socket.io Detail] Disconnected')
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
    }
  }, [])

  // placeId 변경 시 place room 구독
  useEffect(() => {
    if (!socketRef.current || !placeId) return

    // place room 구독
    socketRef.current.emit('subscribe:place', placeId)
    console.log(`[Socket.io Detail] Subscribed to place:${placeId}`)

    const handleCompleted = (data: any) => {
      if (data.placeId === placeId) {
        console.log('[Socket.io Detail] Review crawl completed:', data)
        Alert.success('크롤링 완료', `${data.totalReviews || 0}개의 리뷰를 수집했습니다`)
        // 리뷰 데이터 갱신
        fetchReviews(placeId)
      }
    }

    const handleError = (data: any) => {
      if (data.placeId === placeId) {
        console.error('[Socket.io Detail] Error:', data)
        Alert.error('크롤링 실패', data.error || '크롤링 중 오류가 발생했습니다')
      }
    }

    socketRef.current.on('review:completed', handleCompleted)
    socketRef.current.on('review:error', handleError)

    return () => {
      socketRef.current?.emit('unsubscribe:place', placeId)
      socketRef.current?.off('review:completed', handleCompleted)
      socketRef.current?.off('review:error', handleError)
      console.log(`[Socket.io Detail] Unsubscribed from place:${placeId}`)
    }
  }, [placeId])

  // placeId로 레스토랑 정보 가져오기
  const fetchRestaurant = async (placeId: string) => {
    setRestaurantLoading(true)
    try {
      const response = await apiService.getRestaurants()
      if (response.result && response.data) {
        const found = response.data.restaurants.find((r: RestaurantData) => r.place_id === placeId)
        if (found) {
          setRestaurant(found)
        } else {
          Alert.error('오류', '레스토랑을 찾을 수 없습니다')
          navigate('/restaurant')
        }
      }
    } catch (err) {
      console.error('레스토랑 조회 실패:', err)
      Alert.error('조회 실패', '레스토랑 정보를 불러오는데 실패했습니다')
    } finally {
      setRestaurantLoading(false)
    }
  }

  // placeId로 리뷰 가져오기
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

  // placeId 변경 시 데이터 로드
  useEffect(() => {
    if (placeId) {
      fetchRestaurant(placeId)
      fetchReviews(placeId)
    }
  }, [placeId])

  const handleBackToList = () => {
    navigate('/restaurant')
  }

  return {
    placeId,
    restaurant,
    restaurantLoading,
    reviews,
    reviewsLoading,
    reviewsTotal,
    reviewsLimit,
    reviewsOffset,
    handleBackToList,
    fetchReviews,
  }
}
