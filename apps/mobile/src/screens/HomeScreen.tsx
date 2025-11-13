import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from '@react-native-community/blur';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from 'shared/contexts';
import { useRankings } from 'shared/hooks';
import { THEME_COLORS } from 'shared/constants';
import type { RestaurantRanking, RestaurantRankingsResponse } from 'shared/services';
import type { RootTabParamList, RestaurantStackParamList } from '../navigation/types';

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, 'Home'>,
  NativeStackNavigationProp<RestaurantStackParamList>
>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [excludeNeutral, setExcludeNeutral] = useState(false);
  const [displayCounts, setDisplayCounts] = useState({
    positive: 10,
    negative: 10,
    neutral: 10,
  });
  const { positiveRankings, negativeRankings, neutralRankings, loading, error, refresh, refreshWithCacheInvalidation } = useRankings(100, 10, undefined, excludeNeutral);
  const colors = THEME_COLORS[theme];

  // Dynamic styles based on theme and state
  const dynamicStyles = useMemo(() => ({
    toggleButtonActive: {
      backgroundColor: '#8b5cf6',
    },
    toggleButtonInactive: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
    },
    toggleTextActive: {
      color: '#ffffff',
    },
    toggleTextInactive: {
      color: colors.text,
    },
    refreshButtonBg: {
      backgroundColor: colors.primary,
    },
  }), [colors.surface, colors.border, colors.text, colors.primary]);

  const loadMore = (type: 'positive' | 'negative' | 'neutral') => {
    setDisplayCounts(prev => ({
      ...prev,
      [type]: prev[type] + 10,
    }));
  };

  /**
   * 레스토랑 상세로 이동
   * CommonActions를 사용하여 스택 구조를 명시적으로 재구성
   * RestaurantList를 스택에 포함시켜 뒤로가기 지원
   * restaurant 객체를 함께 전달하여 헤더명이 즉시 표시되도록 함
   */
  const handleRestaurantPress = useCallback((
    restaurantId: number,
    restaurant?: { id: number; name: string; category: string | null; address: string | null }
  ) => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'Restaurant',
            state: {
              routes: [
                { name: 'RestaurantList' },
                {
                  name: 'RestaurantDetail',
                  params: {
                    restaurantId,
                    restaurant: restaurant,
                  },
                },
              ],
              index: 1,
            },
          },
        ],
      })
    );
  }, [navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const renderRankingCard = (
    title: string,
    emoji: string,
    rankingsResponse: RestaurantRankingsResponse | null,
    rateKey: 'positiveRate' | 'negativeRate' | 'neutralRate',
    color: string,
    type: 'positive' | 'negative' | 'neutral'
  ) => {
    const rankings = rankingsResponse?.rankings || null;
    const displayLimit = displayCounts[type];
    const displayedRankings = rankings?.slice(0, displayLimit) || null;
    const hasMore = rankings && rankings.length > displayLimit;

    return (
    <View style={styles.cardContainer}>
      <BlurView
        style={styles.blurContainer}
        blurType={theme === 'dark' ? 'dark' : 'light'}
        blurAmount={20}
        reducedTransparencyFallbackColor={theme === 'dark' ? 'rgba(26, 26, 26, 0.7)' : 'rgba(255, 255, 255, 0.7)'}
      />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={color} />
          </View>
        )}

        {!loading && displayedRankings && displayedRankings.length > 0 && (
          <View style={styles.rankingList}>
            {displayedRankings.map((ranking: RestaurantRanking) => (
              <TouchableOpacity
                key={ranking.rank}
                style={[styles.rankingItem, { borderColor: colors.border }]}
                onPress={() => handleRestaurantPress(ranking.restaurant.id, ranking.restaurant)}
                activeOpacity={0.7}
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
                      {ranking.statistics.analyzedReviews}개
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

        {!loading && hasMore && (
          <TouchableOpacity
            style={[styles.loadMoreButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => loadMore(type)}
            activeOpacity={0.7}
          >
            <Text style={[styles.loadMoreText, { color: colors.primary }]}>
              더보기 ({displayedRankings?.length || 0} / {rankings?.length || 0})
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>레스토랑 순위</Text>
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                excludeNeutral ? dynamicStyles.toggleButtonActive : dynamicStyles.toggleButtonInactive
              ]}
              onPress={() => setExcludeNeutral(!excludeNeutral)}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Text style={[
                styles.toggleButtonText,
                excludeNeutral ? dynamicStyles.toggleTextActive : dynamicStyles.toggleTextInactive
              ]}>
                {excludeNeutral ? '중립 제외' : '중립 포함'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.refreshButton, dynamicStyles.refreshButtonBg]}
              onPress={() => refreshWithCacheInvalidation()}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Text style={styles.refreshButtonText}>🔄 새로고침</Text>
            </TouchableOpacity>
          </View>
        </View>

        {error && (
          <View style={styles.cardContainer}>
            <BlurView
              style={styles.blurContainer}
              blurType={theme === 'dark' ? 'dark' : 'light'}
              blurAmount={20}
              reducedTransparencyFallbackColor={theme === 'dark' ? 'rgba(26, 26, 26, 0.7)' : 'rgba(255, 255, 255, 0.7)'}
            />
            <View style={styles.cardContent}>
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
                <TouchableOpacity
                  style={[styles.retryButton, { backgroundColor: colors.primary }]}
                  onPress={() => refresh()}
                  activeOpacity={0.7}
                >
                  <Text style={styles.retryButtonText}>다시 시도</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {renderRankingCard('긍정 평가 TOP 5', '🌟', positiveRankings, 'positiveRate', '#10b981', 'positive')}
        {renderRankingCard('부정 평가 TOP 5', '⚠️', negativeRankings, 'negativeRate', '#ef4444', 'negative')}
        {renderRankingCard('중립 평가 TOP 5', '➖', neutralRankings, 'neutralRate', '#8b5cf6', 'neutral')}
      </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 12,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 2,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    flex: 1,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  refreshButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  cardContainer: {
    overflow: 'hidden',
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  blurContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardContent: {
    padding: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  emoji: {
    fontSize: 24,
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankingList: {
    gap: 8,
  },
  rankingItem: {
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankNumber: {
    textAlign: 'right',
    fontSize: 20,
    fontWeight: 'bold',
    width: 36,
  },
  restaurantInfo: {
    flex: 1,
    gap: 4,
  },
  restaurantName: {
    fontSize: 15,
    fontWeight: '600',
  },
  restaurantCategory: {
    fontSize: 12,
  },
  rateContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  rateValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  reviewCount: {
    fontSize: 11,
  },
  errorContainer: {
    alignItems: 'center',
    gap: 16,
  },
  errorIcon: {
    fontSize: 48,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 8,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
  loadMoreButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default HomeScreen;
