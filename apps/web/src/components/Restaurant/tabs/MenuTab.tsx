import React from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import { getDefaultApiUrl } from '@shared/services'

interface MenuData {
  name: string
  price: string
  description?: string
  image?: string
}

interface MenuTabProps {
  menus: MenuData[]
  menusLoading: boolean
  isMobile?: boolean
}

const MenuTab: React.FC<MenuTabProps> = ({ menus, menusLoading, isMobile = false }) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]

  if (menusLoading && menus.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (menus.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          등록된 메뉴가 없습니다
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.section}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '16px',
        }}
      >
        {menus.map((menu, index) => (
          <View
            key={index}
            style={[
              styles.card,
              {
                backgroundColor: theme === 'light' ? '#fff' : colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.cardContent}>
              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.text }]}>{menu.name}</Text>
                {menu.description && (
                  <Text style={[styles.description, { color: colors.textSecondary }]}>
                    {menu.description}
                  </Text>
                )}
                <Text style={[styles.price, { color: colors.primary, marginTop: 8 }]}>
                  {menu.price}
                </Text>
              </View>
              {menu.image && (
                <img
                  src={`${getDefaultApiUrl()}${menu.image}`}
                  alt={menu.name}
                  style={{
                    width: 100,
                    height: 100,
                    objectFit: 'cover',
                    borderRadius: 8,
                    marginLeft: 12,
                    flexShrink: 0,
                  }}
                />
              )}
            </View>
          </View>
        ))}
      </div>
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 32,
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
  card: {
    borderBottomWidth: 1,
    paddingVertical: 16,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
  },
})

export default MenuTab
