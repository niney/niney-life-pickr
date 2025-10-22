import { useState, useRef, useCallback } from 'react'
import { apiService, type ReviewData, Alert } from '../'

export type SentimentFilter = 'all' | 'positive' | 'negative' | 'neutral'

/**
 * 리뷰 관리 훅 (무한 스크롤 지원)
 * 플랫폼 독립적 - 웹/모바일 공통 사용
 */
export const useReviews = () => {
  const [reviews, setReviews] = useState<ReviewData[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsLoadingMore, setReviewsLoadingMore] = useState(false)
  const [reviewsTotal, setReviewsTotal] = useState(0)
  const [reviewsOffset, setReviewsOffset] = useState(0)
  const [hasMoreReviews, setHasMoreReviews] = useState(true)
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>('all')
  const [searchText, setSearchText] = useState('')

  // 중복 요청 방지를 위한 ref
  const fetchingOffsetRef = useRef<number | null>(null)

  const fetchReviews = useCallback(async (restaurantId: number, offset: number = 0, append: boolean = false) => {
    // 첫 로드(offset=0)는 3개, 그 이후는 10개씩 가져오기
    const reviewsLimit = offset === 0 ? 3 : 10;

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
      // sentiment 필터 적용
      const sentiments = sentimentFilter === 'all' ? undefined : [sentimentFilter]
      const response = await apiService.getReviewsByRestaurantId(
        restaurantId,
        reviewsLimit,
        offset,
        sentiments,
        searchText || undefined
      )
      if (response.result && response.data) {
        const newReviews = response.data.reviews
        const totalReviews = response.data.total

        if (append) {
          // 중복 제거: 기존 리뷰 ID와 비교하여 중복 제거
          setReviews(prev => {
            const existingIds = new Set(prev.map(r => r.id))
            const uniqueNewReviews = newReviews.filter(r => !existingIds.has(r.id))

            if (uniqueNewReviews.length < newReviews.length) {
              console.log(`⚠️ 중복 리뷰 제거: ${newReviews.length - uniqueNewReviews.length}개`)
            }

            return [...prev, ...uniqueNewReviews]
          })
        } else {
          // 초기 로드: 새로 설정
          setReviews(newReviews)
        }

        setReviewsTotal(totalReviews)
        // offset을 실제로 로드된 리뷰 개수만큼 증가
        setReviewsOffset(offset + newReviews.length)

        // 더 이상 불러올 데이터가 있는지 확인
        setReviews(currentReviews => {
          const totalLoaded = append ? currentReviews.length + newReviews.length : newReviews.length
          const hasMore = totalLoaded < totalReviews
          setHasMoreReviews(hasMore)
          return currentReviews
        })
      }
    } catch (err) {
      console.error('리뷰 조회 실패:', err)
      Alert.error('조회 실패', '리뷰를 불러오는데 실패했습니다')
    } finally {
      setReviewsLoading(false)
      setReviewsLoadingMore(false)
      fetchingOffsetRef.current = null // 요청 완료 후 초기화
    }
  }, [sentimentFilter, searchText])

  const loadMoreReviews = useCallback(async (restaurantId: number) => {
    if (!hasMoreReviews || reviewsLoadingMore || reviewsLoading) return

    // 현재까지 로드된 리뷰 개수를 기준으로 다음 offset 계산
    const nextOffset = reviews.length
    await fetchReviews(restaurantId, nextOffset, true)
  }, [hasMoreReviews, reviewsLoadingMore, reviewsLoading, reviews, fetchReviews])

  const clearReviews = useCallback(() => {
    setReviews([])
    setReviewsTotal(0)
    setReviewsOffset(0)
    setHasMoreReviews(true)
    fetchingOffsetRef.current = null // ref도 초기화
  }, [])

  const changeSentimentFilter = useCallback(async (restaurantId: number, filter: SentimentFilter) => {
    setSentimentFilter(filter)
    // 필터가 변경되면 리뷰를 처음부터 다시 로드
    clearReviews()
    // 새 필터로 리뷰 재조회 (다음 렌더링에서 sentimentFilter가 업데이트되므로, 직접 전달)
    const sentiments = filter === 'all' ? undefined : [filter]

    setReviewsLoading(true)
    try {
      // 필터 변경 시에도 첫 로드는 3개
      const response = await apiService.getReviewsByRestaurantId(
        restaurantId,
        3,
        0,
        sentiments,
        searchText || undefined
      )
      if (response.result && response.data) {
        setReviews(response.data.reviews)
        setReviewsTotal(response.data.total)
        setReviewsOffset(response.data.reviews.length)
        const hasMore = response.data.reviews.length < response.data.total
        setHasMoreReviews(hasMore)
      }
    } catch (err) {
      console.error('리뷰 조회 실패:', err)
      Alert.error('조회 실패', '리뷰를 불러오는데 실패했습니다')
    } finally {
      setReviewsLoading(false)
    }
  }, [searchText, clearReviews])

  const changeSearchText = useCallback(async (restaurantId: number, text: string) => {
    setSearchText(text)
    // 검색어 변경 시 리뷰를 처음부터 다시 로드
    clearReviews()
    const sentiments = sentimentFilter === 'all' ? undefined : [sentimentFilter]

    setReviewsLoading(true)
    try {
      const response = await apiService.getReviewsByRestaurantId(
        restaurantId,
        3,
        0,
        sentiments,
        text || undefined
      )
      if (response.result && response.data) {
        setReviews(response.data.reviews)
        setReviewsTotal(response.data.total)
        setReviewsOffset(response.data.reviews.length)
        const hasMore = response.data.reviews.length < response.data.total
        setHasMoreReviews(hasMore)
      }
    } catch (err) {
      console.error('리뷰 조회 실패:', err)
      Alert.error('조회 실패', '리뷰를 불러오는데 실패했습니다')
    } finally {
      setReviewsLoading(false)
    }
  }, [sentimentFilter, clearReviews])

  return {
    reviews,
    reviewsLoading,
    reviewsLoadingMore,
    reviewsTotal,
    reviewsOffset,
    hasMoreReviews,
    sentimentFilter,
    searchText,
    fetchReviews,
    loadMoreReviews,
    clearReviews,
    changeSentimentFilter,
    setSearchText,
    changeSearchText,
  }
}

export type ReviewsHookReturn = ReturnType<typeof useReviews>
