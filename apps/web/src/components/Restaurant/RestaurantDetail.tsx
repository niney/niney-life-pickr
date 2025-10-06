import React from 'react'
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Text } from 'react-native'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import type { ReviewData } from '@shared/services'
import { useRestaurantDetail } from '../../hooks/useRestaurantDetail'

interface RestaurantDetailProps {
  isMobile?: boolean
}

const RestaurantDetail: React.FC<RestaurantDetailProps> = ({ isMobile = false }) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]

  // 독립적으로 데이터 로드
  const {
    restaurant,
    restaurantLoading,
    reviews,
    reviewsLoading,
    reviewsTotal,
    handleBackToList,
  } = useRestaurantDetail()

  // 레스토랑 정보 로딩 중
  if (restaurantLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    )
  }

  return (
    <div 
      className={isMobile ? '' : 'restaurant-scroll-area'}
      style={{ backgroundColor: colors.background }}
    >
      <View style={[styles.reviewHeader, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackToList}>
          <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: isMobile ? 22 : 20, color: colors.text }} />
        </TouchableOpacity>
        <View style={styles.reviewHeaderInfo}>
          <Text style={[styles.reviewTitle, { color: colors.text }]}>{restaurant?.name || '레스토랑'}</Text>
          <Text style={[styles.reviewSubtitle, { color: colors.textSecondary }]}>리뷰 {reviewsTotal}개</Text>
        </View>
      </View>

      <div style={{ padding: 20 }}>
        {reviewsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : reviews.length > 0 ? (
          <View style={styles.reviewsList}>
            {reviews.map((review: ReviewData) => (
              <View
                key={review.id}
                style={[styles.reviewCard, { backgroundColor: theme === 'light' ? '#fff' : colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.reviewCardHeader}>
                  <Text style={[styles.reviewUserName, { color: colors.text }]}>{review.userName || '익명'}</Text>
                  {review.visitInfo.visitDate && (
                    <Text style={[styles.reviewDate, { color: colors.textSecondary }]}>
                      {review.visitInfo.visitDate}
                    </Text>
                  )}
                </View>

                {review.visitKeywords.length > 0 && (
                  <View style={styles.keywordsContainer}>
                    {review.visitKeywords.map((keyword: string, idx: number) => (
                      <View key={idx} style={[styles.keyword, { backgroundColor: theme === 'light' ? '#f0f0f0' : colors.border }]}>
                        <Text style={[styles.keywordText, { color: colors.text }]}>{keyword}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {review.reviewText && (
                  <Text style={[styles.reviewText, { color: colors.text }]}>{review.reviewText}</Text>
                )}

                {review.emotionKeywords.length > 0 && (
                  <View style={styles.keywordsContainer}>
                    {review.emotionKeywords.map((keyword: string, idx: number) => (
                      <View key={idx} style={[styles.emotionKeyword, { backgroundColor: '#e3f2fd' }]}>
                        <Text style={[styles.keywordText, { color: '#1976d2' }]}>{keyword}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.visitInfo}>
                  {review.visitInfo.visitCount && (
                    <Text style={[styles.visitInfoText, { color: colors.textSecondary }]}>
                      {review.visitInfo.visitCount}
                    </Text>
                  )}
                  {review.visitInfo.verificationMethod && (
                    <Text style={[styles.visitInfoText, { color: colors.textSecondary }]}>
                      • {review.visitInfo.verificationMethod}
                    </Text>
                  )}
                  {review.waitTime && (
                    <Text style={[styles.visitInfoText, { color: colors.textSecondary }]}>
                      • {review.waitTime}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>등록된 리뷰가 없습니다</Text>
          </View>
        )}
      </div>
    </div>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reviewHeaderInfo: {
    flex: 1,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  reviewSubtitle: {
    fontSize: 15,
  },
  reviewScrollView: {
    flex: 1,
  },
  reviewScrollContent: {
    padding: 20,
  },
  reviewsList: {
    gap: 16,
  },
  reviewCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewUserName: {
    fontSize: 16,
    fontWeight: '700',
  },
  reviewDate: {
    fontSize: 13,
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  keyword: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  emotionKeyword: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  keywordText: {
    fontSize: 13,
    fontWeight: '500',
  },
  reviewText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  visitInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  visitInfoText: {
    fontSize: 13,
  },
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
  emptyText: {
    fontSize: 15,
  },
})

export default RestaurantDetail

