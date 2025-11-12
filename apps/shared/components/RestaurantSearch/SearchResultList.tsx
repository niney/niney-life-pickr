import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native'
import type { GestureResponderEvent } from 'react-native'
import { useTheme } from '../../contexts'
import { THEME_COLORS } from '../../constants'
import type { NaverPlaceItem } from '../../services'

interface SearchResultListProps {
  results: NaverPlaceItem[];
  isLoading?: boolean;
  error?: string | null;
  selectedRestaurantNames?: string[];
  onToggleSelection?: (name: string) => void;
  onItemPress?: (placeId?: string) => void;
}

const SearchResultList: React.FC<SearchResultListProps> = ({
  results = [],
  isLoading = false,
  error = null,
  selectedRestaurantNames = [],
  onToggleSelection,
  onItemPress
}) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]

  const handleCheckboxPress = (e: GestureResponderEvent, name: string) => {
    e.stopPropagation();
    if (onToggleSelection) {
      onToggleSelection(name);
    }
  }

  // 로딩 중
  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          검색 중...
        </Text>
      </View>
    )
  }

  // 에러
  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorIcon, { color: colors.error }]}>⚠️</Text>
        <Text style={[styles.errorText, { color: colors.error }]}>
          {error}
        </Text>
      </View>
    )
  }

  // 검색 결과 없음
  if (results.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyIcon, { color: colors.textSecondary }]}>🔍</Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          검색 결과가 없습니다.
        </Text>
        <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
          다른 키워드로 검색해보세요.
        </Text>
      </View>
    )
  }

  const renderItem = ({ item }: { item: NaverPlaceItem }) => {
    const isSelected = selectedRestaurantNames.includes(item.name);

    return (
      <TouchableOpacity
        style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => onItemPress?.(item.placeId)}
      >
        {/* 체크박스 영역 */}
        {onToggleSelection && (
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={(e) => handleCheckboxPress(e, item.name)}
          >
            <View style={[
              styles.checkbox,
              { borderColor: colors.border },
              isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
            ]}>
              {isSelected && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.isAd && (
              <View style={[styles.adBadge, { backgroundColor: colors.error }]}>
                <Text style={styles.adText}>광고</Text>
              </View>
            )}
          </View>

          {item.category && (
            <Text style={[styles.category, { color: colors.textSecondary }]}>{item.category}</Text>
          )}

          {item.address && (
            <Text style={[styles.address, { color: colors.textSecondary }]} numberOfLines={1}>
              📍 {item.address}
            </Text>
          )}

          <View style={styles.infoRow}>
            {item.reviewCount !== undefined && item.reviewCount > 0 && (
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                💬 리뷰 {item.reviewCount.toLocaleString()}
              </Text>
            )}
            {item.status && (
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {item.status}
              </Text>
            )}
          </View>

          {item.tvShow && (
            <View style={[styles.tvBadge, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
              <Text style={[styles.tvText, { color: colors.primary }]}>📺 {item.tvShow}</Text>
            </View>
          )}

          <View style={styles.badgeRow}>
            {item.hasReservation && (
              <View style={[styles.badge, { backgroundColor: colors.success + '20' }]}>
                <Text style={[styles.badgeText, { color: colors.success }]}>예약</Text>
              </View>
            )}
            {item.hasCoupon && (
              <View style={[styles.badge, { backgroundColor: colors.secondary + '20' }]}>
                <Text style={[styles.badgeText, { color: colors.secondary }]}>쿠폰</Text>
              </View>
            )}
          </View>

          {item.reviewSnippets && item.reviewSnippets.length > 0 && (
            <View style={styles.reviewSnippets}>
              {item.reviewSnippets.slice(0, 2).map((snippet, index) => (
                <Text
                  key={index}
                  style={[styles.snippetText, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  "{snippet}"
                </Text>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <FlatList
      data={results}
      renderItem={renderItem}
      keyExtractor={(item, index) => item.placeId || `place-${index}`}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
    />
  )
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  item: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  checkboxContainer: {
    paddingRight: 12,
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  adBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  adText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  category: {
    fontSize: 14,
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
  },
  tvBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  tvText: {
    fontSize: 13,
    fontWeight: '500',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  reviewSnippets: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  snippetText: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  placeIdText: {
    fontSize: 11,
    marginTop: 8,
    fontFamily: 'monospace',
  },
})

export default SearchResultList
