import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import type { MenuStat } from './types'

interface MenuStatItemProps {
  stat: MenuStat
}

const MenuStatItem: React.FC<MenuStatItemProps> = ({ stat }) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]

  const sentimentColor =
    stat.sentiment === 'positive' ? '#4caf50' : stat.sentiment === 'negative' ? '#f44336' : '#ff9800'
  const sentimentBg =
    stat.sentiment === 'positive' ? '#e8f5e9' : stat.sentiment === 'negative' ? '#ffebee' : '#fff3e0'

  return (
    <View style={[styles.item, { borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.name, { color: colors.text }]}>{stat.menuName}</Text>
        <View style={[styles.badge, { backgroundColor: sentimentBg }]}>
          <Text style={[styles.badgeText, { color: sentimentColor }]}>
            {stat.sentiment === 'positive' ? '😊' : stat.sentiment === 'negative' ? '😞' : '😐'}{' '}
            {stat.positiveRate}%
          </Text>
        </View>
      </View>

      <View style={styles.counts}>
        <Text style={[styles.count, { color: '#4caf50' }]}>긍정 {stat.positive}</Text>
        <Text style={[styles.count, { color: '#f44336' }]}>부정 {stat.negative}</Text>
        <Text style={[styles.count, { color: '#ff9800' }]}>중립 {stat.neutral}</Text>
        <Text style={[styles.count, { color: colors.textSecondary }]}>총 {stat.totalMentions}회</Text>
      </View>

      {(stat.topReasons.positive.length > 0 || stat.topReasons.negative.length > 0) && (
        <View style={styles.reasons}>
          {stat.topReasons.positive.length > 0 && (
            <Text style={[styles.reason, { color: '#4caf50' }]}>
              👍 {stat.topReasons.positive.join(', ')}
            </Text>
          )}
          {stat.topReasons.negative.length > 0 && (
            <Text style={[styles.reason, { color: '#f44336' }]}>
              👎 {stat.topReasons.negative.join(', ')}
            </Text>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  item: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  counts: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  count: {
    fontSize: 13,
    fontWeight: '500',
  },
  reasons: {
    gap: 4,
  },
  reason: {
    fontSize: 13,
    lineHeight: 18,
  },
})

export default MenuStatItem
