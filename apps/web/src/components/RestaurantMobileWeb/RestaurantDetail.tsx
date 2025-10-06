import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Text, ScrollView } from 'react-native'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import type { RestaurantData, ReviewData } from '@shared/services'

interface RestaurantDetailProps {
  selectedRestaurant: RestaurantData | null
  reviews: ReviewData[]
  reviewsLoading: boolean
  reviewsTotal: number
  handleBackToList: () => void
}

const RestaurantDetail: React.FC<RestaurantDetailProps> = ({
  selectedRestaurant,
  reviews,
  reviewsLoading,
  reviewsTotal,
  handleBackToList,
}) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]

  return (
    <View style={{ flex: 1 }}>
      {/* 헤더 */}
      <View style={[styles.reviewHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackToList}>
          <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: 22, color: colors.text }} />
        </TouchableOpacity>
        <View style={styles.reviewHeaderInfo}>
          <Text style={[styles.reviewTitle, { color: colors.text }]}>{selectedRestaurant?.name || '레스토랑'}</Text>
          <Text style={[styles.reviewSubtitle, { color: colors.textSecondary }]}>리뷰 {reviewsTotal}개</Text>
        </View>
      </View>

      {/* 콘텐츠 */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
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
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  // 리뷰 헤더
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  reviewHeaderInfo: {
    flex: 1,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 3,
  },
  reviewSubtitle: {
    fontSize: 13,
  },
  // 스크롤뷰
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  // 리뷰 목록
  reviewsList: {
    gap: 14,
  },
  reviewCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewUserName: {
    fontSize: 15,
    fontWeight: '700',
  },
  reviewDate: {
    fontSize: 12,
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  keyword: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  emotionKeyword: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  keywordText: {
    fontSize: 12,
    fontWeight: '500',
  },
  reviewText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  visitInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  visitInfoText: {
    fontSize: 12,
  },
  // 공통
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
    fontSize: 14,
  },
})

export default RestaurantDetail
