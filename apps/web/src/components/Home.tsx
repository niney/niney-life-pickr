import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useNavigate } from 'react-router-dom'
import { useRankings } from '@shared/hooks'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import type { RestaurantRanking, RestaurantRankingsResponse } from '@shared/services'
import Header from './Header'
import Drawer from './Drawer'

interface HomeProps {
  onLogout: () => Promise<void>
}

const Home: React.FC<HomeProps> = ({ onLogout }) => {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [excludeNeutral, setExcludeNeutral] = useState(false)
  const { positiveRankings, negativeRankings, neutralRankings, loading, error, refreshWithCacheInvalidation } = useRankings(5, 10, undefined, excludeNeutral)

  const colors = THEME_COLORS[theme]

  const handleLogout = async () => {
    await onLogout()
    window.location.href = '/login'
  }

  const handleRestaurantPress = (restaurantId: number) => {
    navigate(`/restaurant/${restaurantId}`)
  }

  const renderRankingCard = (
    title: string,
    emoji: string,
    rankingsResponse: RestaurantRankingsResponse | null,
    rateKey: 'positiveRate' | 'negativeRate' | 'neutralRate',
    color: string
  ) => {
    const rankings = rankingsResponse?.rankings || null;

    return (
    <View style={[styles.rankingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={color} />
        </View>
      )}

      {!loading && rankings && rankings.length > 0 && (
        <View style={styles.rankingList}>
          {rankings.map((ranking: RestaurantRanking) => (
            <TouchableOpacity
              key={ranking.rank}
              style={[styles.rankingItem, { borderColor: colors.border }]}
              onPress={() => handleRestaurantPress(ranking.restaurant.id)}
            >
              <View style={styles.rankRow}>
                <Text style={[styles.rankNumber, { color }]}>{ranking.rank}</Text>
                <View style={styles.restaurantInfo}>
                  <Text style={[styles.restaurantName, { color: colors.text }]} numberOfLines={1}>
                    {ranking.restaurant.name}
                  </Text>
                  <Text style={[styles.restaurantCategory, { color: colors.textSecondary }]} numberOfLines={1}>
                    {ranking.restaurant.category || '카테고리 없음'}
                  </Text>
                </View>
                <View style={styles.rateContainer}>
                  <Text style={[styles.rateValue, { color }]}>
                    {ranking.statistics[rateKey].toFixed(1)}%
                  </Text>
                  <Text style={[styles.reviewCount, { color: colors.textSecondary }]}>
                    {ranking.statistics.analyzedReviews}개 리뷰
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!loading && (!rankings || rankings.length === 0) && (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          순위 데이터가 없습니다
        </Text>
      )}
    </View>
    );
  };

  return (
    <div className="page-container" style={{ backgroundColor: colors.background }}>
      <Header onMenuPress={() => setDrawerVisible(true)} />

      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>레스토랑 순위</Text>
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                excludeNeutral
                  ? { backgroundColor: '#8b5cf6' }
                  : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }
              ]}
              onPress={() => setExcludeNeutral(!excludeNeutral)}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Text style={[
                styles.toggleButtonText,
                { color: excludeNeutral ? '#ffffff' : colors.text }
              ]}>
                {excludeNeutral ? '중립 제외' : '중립 포함'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.refreshButton, { backgroundColor: colors.primary }]}
              onPress={() => refreshWithCacheInvalidation()}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Text style={styles.refreshButtonText}>🔄 새로고침</Text>
            </TouchableOpacity>
          </View>
        </View>

        {error && (
          <View style={[styles.errorContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          </View>
        )}

        <div className="rankings-grid">
          {renderRankingCard('긍정 평가 TOP 5', '🌟', positiveRankings, 'positiveRate', '#10b981')}
          {renderRankingCard('부정 평가 TOP 5', '⚠️', negativeRankings, 'negativeRate', '#ef4444')}
          {renderRankingCard('중립 평가 TOP 5', '➖', neutralRankings, 'neutralRate', '#8b5cf6')}
        </div>
      </View>

      <Drawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onLogout={handleLogout}
      />
    </div>
  )
}

const styles = StyleSheet.create({
  contentContainer: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    flex: 1,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  refreshButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  rankingCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  emoji: {
    fontSize: 28,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankingList: {
    gap: 12,
  },
  rankingItem: {
    borderBottomWidth: 1,
    paddingVertical: 16,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rankNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    width: 32,
  },
  restaurantInfo: {
    flex: 1,
    gap: 4,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
  },
  restaurantCategory: {
    fontSize: 13,
  },
  rateContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  rateValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  reviewCount: {
    fontSize: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 32,
  },
})

export default Home
