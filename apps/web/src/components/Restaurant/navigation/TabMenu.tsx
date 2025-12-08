import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'

export type TabType = 'menu' | 'review' | 'statistics' | 'map' | 'vworld'

interface TabMenuProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  menuCount: number
  reviewCount: number
}

const TabMenu: React.FC<TabMenuProps> = ({
  activeTab,
  onTabChange,
  menuCount,
  reviewCount,
}) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]

  const tabs: Array<{ key: TabType; label: string }> = [
    { key: 'menu', label: `메뉴 ${menuCount > 0 ? `(${menuCount})` : ''}` },
    { key: 'review', label: `리뷰 (${reviewCount})` },
    { key: 'statistics', label: '📊 통계' },
    { key: 'map', label: '🗺️ 네이버맵' },
    { key: 'vworld', label: '🌏 VWorld' },
  ]

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
          onPress={() => onTabChange(tab.key)}
        >
          <Text
            style={[
              styles.tabButtonText,
              { color: activeTab === tab.key ? colors.primary : colors.textSecondary },
            ]}
          >
            {tab.label}
          </Text>
          {activeTab === tab.key && (
            <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    backgroundColor: 'transparent',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabButtonActive: {
    // активная вкладка
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
})

export default TabMenu
