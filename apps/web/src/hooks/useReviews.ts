import { useState } from 'react'
import { apiService } from '@shared/services'
import type { ReviewData } from '@shared/services'
import { Alert } from '@shared/utils'

export const useReviews = () => {
  const [reviews, setReviews] = useState<ReviewData[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsTotal, setReviewsTotal] = useState(0)
  const [reviewsLimit] = useState(20)
  const [reviewsOffset, setReviewsOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const fetchReviews = async (placeId: string, offset: number = 0, append: boolean = false) => {
    setReviewsLoading(true)
    try {
      const response = await apiService.getReviewsByPlaceId(placeId, reviewsLimit, offset)
      if (response.result && response.data) {
        if (append) {
          // 무한 스크롤: 기존 리뷰에 추가
          setReviews(prev => [...prev, ...response.data!.reviews])
        } else {
          // 초기 로드: 새로 설정
          setReviews(response.data.reviews)
        }
        setReviewsTotal(response.data.total)
        setReviewsOffset(offset)
        
        // 더 이상 불러올 데이터가 있는지 확인
        const loadedCount = append ? reviews.length + response.data.reviews.length : response.data.reviews.length
        setHasMore(loadedCount < response.data.total)
      }
    } catch (err) {
      console.error('리뷰 조회 실패:', err)
      Alert.error('조회 실패', '리뷰를 불러오는데 실패했습니다')
    } finally {
      setReviewsLoading(false)
    }
  }

  const loadMoreReviews = async (placeId: string) => {
    if (!hasMore || reviewsLoading) return
    
    const nextOffset = reviewsOffset + reviewsLimit
    await fetchReviews(placeId, nextOffset, true)
  }

  const clearReviews = () => {
    setReviews([])
    setReviewsTotal(0)
    setReviewsOffset(0)
    setHasMore(true)
  }

  return {
    reviews,
    reviewsLoading,
    reviewsTotal,
    reviewsLimit,
    reviewsOffset,
    hasMore,
    fetchReviews,
    loadMoreReviews,
    clearReviews,
  }
}

