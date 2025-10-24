import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import type { TopMenu } from './types'

interface TopMenuListProps {
  menus: TopMenu[]
  type: 'positive' | 'negative'
  title: string
}

const TopMenuList: React.FC<TopMenuListProps> = ({ menus, type, title }) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]

  const config =
    type === 'positive'
      ? {
          bgColor: '#e8f5e9',
          borderColor: '#4caf50',
          rankColor: '#2e7d32',
          nameColor: '#1b5e20',
          statsColor: '#2e7d32',
          rateLabel: '긍정률',
        }
      : {
          bgColor: '#ffebee',
          borderColor: '#f44336',
          rankColor: '#c62828',
          nameColor: '#b71c1c',
          statsColor: '#c62828',
          rateLabel: '부정률',
        }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme === 'light' ? '#fff' : colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <View style={styles.list}>
        {menus.map((menu, index) => {
          const rate = type === 'positive' ? menu.positiveRate : menu.negativeRate
          return (
            <View
              key={index}
              style={[
                styles.item,
                { backgroundColor: config.bgColor, borderColor: config.borderColor },
              ]}
            >
              <Text style={[styles.rank, { color: config.rankColor }]}>#{index + 1}</Text>
              <View style={styles.info}>
                <Text style={[styles.name, { color: config.nameColor }]}>{menu.menuName}</Text>
                <Text style={[styles.stats, { color: config.statsColor }]}>
                  {config.rateLabel} {rate}% · {menu.mentions}회 언급
                </Text>
                <Text style={[styles.stats, { color: config.statsColor, fontSize: 13, marginTop: 2 }]}>
                  😊 {menu.positive} · 😞 {menu.negative} · 😐 {menu.neutral}
                </Text>
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  list: {
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  rank: {
    fontSize: 20,
    fontWeight: '700',
    marginRight: 16,
    minWidth: 36,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  stats: {
    fontSize: 14,
  },
})

export default TopMenuList
