import React from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import type { CatchtableReviewData } from '@shared/services'
import CatchtableReviewCard from './CatchtableReviewCard'

interface CatchtableReviewTabProps {
  reviews: CatchtableReviewData[]
  reviewsLoading: boolean
  reviewsTotal: number
  hasMoreReviews: boolean
  isMobile?: boolean
  onLoadMore: () => void
  loadMoreTriggerRef?: React.RefObject<HTMLDivElement | null>
}

const CatchtableReviewTab: React.FC<CatchtableReviewTabProps> = ({
  reviews,
  reviewsLoading,
  reviewsTotal,
  hasMoreReviews,
  isMobile = false,
  onLoadMore,
  loadMoreTriggerRef,
}) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]
  const isDark = theme === 'dark'

  // 골드 악센트
  const accentGold = '#C9A962'

  // 로딩 중 (초기 로드)
  if (reviewsLoading && reviews.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={accentGold} />
      </View>
    )
  }

  // 리뷰 없음
  if (reviews.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: isDark
              ? 'linear-gradient(135deg, rgba(201, 169, 98, 0.2) 0%, rgba(201, 169, 98, 0.05) 100%)'
              : 'linear-gradient(135deg, rgba(201, 169, 98, 0.15) 0%, rgba(201, 169, 98, 0.05) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 32 }}>🍽️</span>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 15,
            color: colors.textSecondary,
            fontWeight: '500',
          }}
        >
          캐치테이블 리뷰가 없습니다
        </p>
        <p
          style={{
            margin: '8px 0 0 0',
            fontSize: 13,
            color: colors.textSecondary,
            opacity: 0.7,
          }}
        >
          캐치테이블 ID를 등록하고 리뷰를 크롤링해주세요
        </p>
      </div>
    )
  }

  return (
    <>
      {/* 헤더 요약 */}
      <div
        style={{
          marginBottom: 24,
          padding: '16px 20px',
          background: isDark
            ? 'linear-gradient(135deg, rgba(201, 169, 98, 0.12) 0%, rgba(31, 41, 55, 0.8) 100%)'
            : 'linear-gradient(135deg, rgba(201, 169, 98, 0.08) 0%, rgba(255, 255, 255, 0.9) 100%)',
          borderRadius: 12,
          border: `1px solid ${isDark ? 'rgba(201, 169, 98, 0.2)' : 'rgba(201, 169, 98, 0.15)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>🍽️</span>
          <div>
            <div
              style={{
                fontSize: 10,
                color: accentGold,
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: 2,
              }}
            >
              CATCHTABLE REVIEWS
            </div>
            <div style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
              총 {reviewsTotal}개의 리뷰
            </div>
          </div>
        </div>

        {/* 평균 점수 계산 */}
        {reviews.length > 0 && (
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: 10,
                color: colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 2,
              }}
            >
              평균 점수
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: '800',
                color: accentGold,
                fontFamily: "'DM Mono', 'Consolas', monospace",
              }}
            >
              {(
                reviews.reduce((sum, r) => sum + (r.total_score || 0), 0) / reviews.length
              ).toFixed(1)}
            </div>
          </div>
        )}
      </div>

      {/* 리뷰 그리드 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(420px, 1fr))',
          gap: '20px',
        }}
      >
        {reviews.map((review) => (
          <CatchtableReviewCard key={review.id} review={review} />
        ))}
      </div>

      {/* 더 보기 버튼 */}
      {!reviewsLoading && hasMoreReviews && reviews.length > 0 && (
        <View style={styles.loadMoreButtonContainer}>
          <button
            onClick={onLoadMore}
            style={{
              padding: '14px 32px',
              borderRadius: 12,
              background: `linear-gradient(135deg, ${accentGold} 0%, #D4AF37 100%)`,
              border: 'none',
              cursor: 'pointer',
              minWidth: 240,
              color: '#1A1A1A',
              fontSize: 15,
              fontWeight: '700',
              letterSpacing: '0.5px',
              boxShadow: '0 4px 16px rgba(201, 169, 98, 0.3)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(201, 169, 98, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(201, 169, 98, 0.3)'
            }}
          >
            리뷰 더 보기 ({reviewsTotal - reviews.length}개 남음)
          </button>
        </View>
      )}

      {/* 무한 스크롤 트리거 (모바일) */}
      {isMobile && hasMoreReviews && loadMoreTriggerRef && (
        <div ref={loadMoreTriggerRef} style={{ padding: '20px', textAlign: 'center' }}>
          {reviewsLoading && <ActivityIndicator size="small" color={accentGold} />}
        </div>
      )}

      {/* 로딩 인디케이터 (데스크톱) */}
      {!isMobile && reviewsLoading && hasMoreReviews && (
        <View style={styles.loadMoreButtonContainer}>
          <ActivityIndicator size="small" color={accentGold} />
        </View>
      )}

      {/* 모든 리뷰 로드 완료 표시 */}
      {!hasMoreReviews && reviews.length > 0 && (
        <div
          style={{
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              background: isDark
                ? 'rgba(201, 169, 98, 0.1)'
                : 'rgba(201, 169, 98, 0.08)',
              borderRadius: 24,
              color: accentGold,
              fontSize: 14,
              fontWeight: '500',
            }}
          >
            <span>✨</span>
            모든 리뷰를 불러왔습니다 ({reviewsTotal}개)
          </div>
        </div>
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
  loadMoreButtonContainer: {
    padding: 24,
    alignItems: 'center',
  },
})

export default CatchtableReviewTab
