import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'

interface RestaurantDetailHeaderProps {
  restaurantName: string
  menuCount: number
  reviewCount: number
  onBack: () => void
  isMobile?: boolean
}

const RestaurantDetailHeader: React.FC<RestaurantDetailHeaderProps> = ({
  restaurantName,
  menuCount,
  reviewCount,
  onBack,
  isMobile = false,
}) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]

  return (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <FontAwesomeIcon
          icon={faArrowLeft}
          style={{ fontSize: isMobile ? 22 : 20, color: colors.text }}
        />
      </TouchableOpacity>
      <View style={styles.headerInfo}>
        <Text style={[styles.title, { color: colors.text }]}>
          {restaurantName || '레스토랑'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          메뉴 {menuCount}개 · 리뷰 {reviewCount}개
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
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
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
  },
})

export default RestaurantDetailHeader
