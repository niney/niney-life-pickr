import { useState, useRef } from 'react'
import { apiService, type ReviewData, Alert } from '../'

/**
 * 리뷰 관리 훅 (무한 스크롤 지원)
 * 플랫폼 독립적 - 웹/모바일 공통 사용
 */
export const useReviews = () => {
  const [reviews, setReviews] = useState<ReviewData[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsLoadingMore, setReviewsLoadingMore] = useState(false)
  const [reviewsTotal, setReviewsTotal] = useState(0)
  const [reviewsLimit] = useState(20)
  const [reviewsOffset, setReviewsOffset] = useState(0)
  const [hasMoreReviews, setHasMoreReviews] = useState(true)

  // 중복 요청 방지를 위한 ref
  const fetchingOffsetRef = useRef<number | null>(null)

  const fetchReviews = async (restaurantId: number, offset: number = 0, append: boolean = false) => {
    // 중복 요청 방지: 같은 offset으로 이미 요청 중이면 무시
    if (fetchingOffsetRef.current === offset) {
      console.log(`⚠️ 중복 요청 방지: offset ${offset}은 이미 요청 중입니다`)
      return
    }

    fetchingOffsetRef.current = offset

    if (append) {
      setReviewsLoadingMore(true)
    } else {
      setReviewsLoading(true)
    }

    try {
      const response = await apiService.getReviewsByRestaurantId(restaurantId, reviewsLimit, offset)
      if (response.result && response.data) {
        const newReviews = response.data.reviews

        if (append) {
          // 무한 스크롤: 기존 리뷰에 추가
          setReviews(prev => [...prev, ...newReviews])
        } else {
          // 초기 로드: 새로 설정
          setReviews(newReviews)
        }

        setReviewsTotal(response.data.total)
        setReviewsOffset(offset)

        // 더 이상 불러올 데이터가 있는지 확인
        const hasMore = offset + newReviews.length < response.data.total
        setHasMoreReviews(hasMore)
      }
    } catch (err) {
      console.error('리뷰 조회 실패:', err)
      Alert.error('조회 실패', '리뷰를 불러오는데 실패했습니다')
    } finally {
      setReviewsLoading(false)
      setReviewsLoadingMore(false)
      fetchingOffsetRef.current = null // 요청 완료 후 초기화
    }
  }

  const loadMoreReviews = async (restaurantId: number) => {
    if (!hasMoreReviews || reviewsLoadingMore || reviewsLoading) return

    const nextOffset = reviewsOffset + reviewsLimit
    await fetchReviews(restaurantId, nextOffset, true)
  }

  const clearReviews = () => {
    setReviews([])
    setReviewsTotal(0)
    setReviewsOffset(0)
    setHasMoreReviews(true)
    fetchingOffsetRef.current = null // ref도 초기화
  }

  return {
    reviews,
    reviewsLoading,
    reviewsLoadingMore,
    reviewsTotal,
    reviewsLimit,
    reviewsOffset,
    hasMoreReviews,
    fetchReviews,
    loadMoreReviews,
    clearReviews,
  }
}

export type ReviewsHookReturn = ReturnType<typeof useReviews>
