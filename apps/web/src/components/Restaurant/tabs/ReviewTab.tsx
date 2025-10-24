import React from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import type { ReviewData } from '@shared/services'
import ReviewCard from '../review/ReviewCard'

interface ReviewTabProps {
  reviews: ReviewData[]
  reviewsLoading: boolean
  reviewsTotal: number
  hasMoreReviews: boolean
  expandedKeywords: Set<number>
  isMobile?: boolean
  onLoadMore: () => void
  onResummary: (reviewId: number) => void
  onToggleKeywords: (reviewId: number) => void
  loadMoreTriggerRef?: React.RefObject<HTMLDivElement | null>
}

const ReviewTab: React.FC<ReviewTabProps> = ({
  reviews,
  reviewsLoading,
  reviewsTotal,
  hasMoreReviews,
  expandedKeywords,
  isMobile = false,
  onLoadMore,
  onResummary,
  onToggleKeywords,
  loadMoreTriggerRef,
}) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]

  // 로딩 중 (초기 로드)
  if (reviewsLoading && reviews.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  // 리뷰 없음
  if (reviews.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <span style={{ fontSize: 15, color: colors.textSecondary }}>등록된 리뷰가 없습니다</span>
      </View>
    )
  }

  return (
    <>
      {/* 리뷰 그리드 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(450px, 1fr))',
          gap: '16px',
        }}
      >
        {reviews.map((review: ReviewData) => (
          <ReviewCard
            key={review.id}
            review={review}
            expandedKeywords={expandedKeywords}
            onResummary={onResummary}
            onToggleKeywords={onToggleKeywords}
          />
        ))}
      </div>

      {/* 더 보기 버튼 */}
      {!reviewsLoading && hasMoreReviews && reviews.length > 0 && (
        <View style={styles.loadMoreButtonContainer}>
          <div className="load-more-button">
            <button
              onClick={onLoadMore}
              style={{
                paddingTop: 12,
                paddingBottom: 12,
                paddingLeft: 28,
                paddingRight: 28,
                borderRadius: 14,
                backgroundColor: colors.primary,
                border: 'none',
                cursor: 'pointer',
                minWidth: 220,
                color: '#fff',
                fontSize: 16,
                fontWeight: '700',
              }}
            >
              리뷰 더 보기 ({reviewsTotal - reviews.length}개 남음)
            </button>
          </div>
        </View>
      )}

      {/* 무한 스크롤 트리거 (모바일) */}
      {isMobile && hasMoreReviews && loadMoreTriggerRef && (
        <div ref={loadMoreTriggerRef} style={{ padding: '20px', textAlign: 'center' }}>
          {reviewsLoading && <ActivityIndicator size="small" color={colors.primary} />}
        </div>
      )}

      {/* 로딩 인디케이터 (데스크톱) */}
      {!isMobile && reviewsLoading && hasMoreReviews && (
        <View style={styles.loadMoreButtonContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}

      {/* 모든 리뷰 로드 완료 표시 */}
      {!hasMoreReviews && (
        <View style={styles.endMessageContainer}>
          <span style={{ fontSize: 14, color: colors.textSecondary }}>
            모든 리뷰를 불러왔습니다 ({reviewsTotal}개)
          </span>
        </View>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadMoreButtonContainer: {
    padding: 20,
    alignItems: 'center',
  },
  endMessageContainer: {
    padding: 20,
    alignItems: 'center',
  },
})

export default ReviewTab
