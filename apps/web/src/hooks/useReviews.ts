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

  const clearReviews = () => {
    setReviews([])
    setReviewsTotal(0)
    setReviewsOffset(0)
  }

  return {
    reviews,
    reviewsLoading,
    reviewsTotal,
    reviewsLimit,
    reviewsOffset,
    fetchReviews,
    clearReviews,
  }
}

