import { useState, useCallback } from 'react'
import { apiService, type CatchtableReviewData } from '@shared/services'

const REVIEWS_PER_PAGE = 20

export const useCatchtableReviews = () => {
  const [reviews, setReviews] = useState<CatchtableReviewData[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsTotal, setReviewsTotal] = useState(0)
  const [hasMoreReviews, setHasMoreReviews] = useState(false)
  const [currentOffset, setCurrentOffset] = useState(0)
  const [hasFetched, setHasFetched] = useState(false)  // fetch 시도 여부 추적

  // 리뷰 조회 (초기 또는 새로고침)
  const fetchReviews = useCallback(async (restaurantId: number) => {
    setReviewsLoading(true)
    setHasFetched(true)  // fetch 시도 표시
    try {
      const response = await apiService.getCatchtableReviews(
        restaurantId,
        REVIEWS_PER_PAGE,
        0
      )

      if (response.result && response.data) {
        setReviews(response.data.reviews)
        setReviewsTotal(response.data.pagination.total)
        setHasMoreReviews(response.data.pagination.hasMore)
        setCurrentOffset(REVIEWS_PER_PAGE)
      }
    } catch (error) {
      console.error('❌ 캐치테이블 리뷰 조회 실패:', error)
      setReviews([])
      setReviewsTotal(0)
      setHasMoreReviews(false)
    } finally {
      setReviewsLoading(false)
    }
  }, [])

  // 더 보기 (페이지네이션)
  const loadMoreReviews = useCallback(async (restaurantId: number) => {
    if (reviewsLoading || !hasMoreReviews) return

    setReviewsLoading(true)
    try {
      const response = await apiService.getCatchtableReviews(
        restaurantId,
        REVIEWS_PER_PAGE,
        currentOffset
      )

      if (response.result && response.data) {
        setReviews((prev) => [...prev, ...response.data!.reviews])
        setHasMoreReviews(response.data.pagination.hasMore)
        setCurrentOffset((prev) => prev + REVIEWS_PER_PAGE)
      }
    } catch (error) {
      console.error('❌ 캐치테이블 리뷰 추가 로드 실패:', error)
    } finally {
      setReviewsLoading(false)
    }
  }, [reviewsLoading, hasMoreReviews, currentOffset])

  // 리뷰 초기화
  const resetReviews = useCallback(() => {
    setReviews([])
    setReviewsTotal(0)
    setHasMoreReviews(false)
    setCurrentOffset(0)
    setHasFetched(false)  // 초기화 시 fetch 상태도 리셋
  }, [])

  return {
    catchtableReviews: reviews,
    catchtableReviewsLoading: reviewsLoading,
    catchtableReviewsTotal: reviewsTotal,
    hasMoreCatchtableReviews: hasMoreReviews,
    hasFetchedCatchtableReviews: hasFetched,  // 추가
    fetchCatchtableReviews: fetchReviews,
    loadMoreCatchtableReviews: loadMoreReviews,
    resetCatchtableReviews: resetReviews,
  }
}
