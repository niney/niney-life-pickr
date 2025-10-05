import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import { InputField, Button } from '@shared/components'
import { apiService } from '@shared/services'
import type { RestaurantInfo } from '@shared/services'
import { Alert } from '@shared/utils'
import Header from './Header'
import Drawer from './Drawer'

interface RestaurantProps {
  onLogout: () => Promise<void>
}

const Restaurant: React.FC<RestaurantProps> = ({ onLogout }) => {
  const { theme } = useTheme()
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [crawlResult, setCrawlResult] = useState<RestaurantInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  const colors = THEME_COLORS[theme]

  const handleCrawl = async () => {
    if (!url.trim()) {
      Alert.error('오류', 'URL을 입력해주세요')
      return
    }

    setLoading(true)
    setError(null)
    setCrawlResult(null)

    try {
      const response = await apiService.crawlRestaurant({
        url: url.trim(),
        crawlMenus: true,
      })

      if (response.result && response.data) {
        setCrawlResult(response.data)
        Alert.success('성공', '크롤링이 완료되었습니다')
      } else {
        throw new Error(response.message || '크롤링 실패')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '크롤링 중 오류가 발생했습니다'
      setError(errorMessage)
      Alert.error('크롤링 실패', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await onLogout()
    window.location.href = '/login'
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header onMenuPress={() => setDrawerVisible(true)} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>네이버 맛집 크롤링</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            네이버 맛집 URL을 입력하면 음식점 정보와 메뉴를 크롤링합니다
          </Text>
        </View>

        <View style={[styles.formSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <InputField
            label="네이버 맛집 URL"
            placeholder="URL 또는 Place ID를 입력하세요"
            value={url}
            onChangeText={setUrl}
          />

          <Button
            title={loading ? '크롤링 중...' : '크롤링 시작'}
            onPress={handleCrawl}
            variant="primary"
            disabled={loading}
          />

          {loading && (
            <View style={styles.loadingSection}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                크롤링 중입니다... 잠시만 기다려주세요
              </Text>
            </View>
          )}

          {error && (
            <View style={[styles.errorSection, { backgroundColor: '#fee', borderColor: '#fcc' }]}>
              <Text style={[styles.errorText, { color: '#c00' }]}>{error}</Text>
            </View>
          )}

          {crawlResult && (
            <View style={[styles.resultSection, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.resultTitle, { color: colors.text }]}>크롤링 결과</Text>

              {/* 음식점 기본 정보 */}
              <View style={styles.infoRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>이름:</Text>
                <Text style={[styles.value, { color: colors.text }]}>{crawlResult.name}</Text>
              </View>

              {crawlResult.category && (
                <View style={styles.infoRow}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>카테고리:</Text>
                  <Text style={[styles.value, { color: colors.text }]}>{crawlResult.category}</Text>
                </View>
              )}

              {crawlResult.address && (
                <View style={styles.infoRow}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>주소:</Text>
                  <Text style={[styles.value, { color: colors.text }]}>{crawlResult.address}</Text>
                </View>
              )}

              {crawlResult.phone && (
                <View style={styles.infoRow}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>전화:</Text>
                  <Text style={[styles.value, { color: colors.text }]}>{crawlResult.phone}</Text>
                </View>
              )}

              {crawlResult.description && (
                <View style={styles.infoRow}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>설명:</Text>
                  <Text style={[styles.value, { color: colors.text }]}>{crawlResult.description}</Text>
                </View>
              )}

              {crawlResult.placeId && (
                <View style={styles.infoRow}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Place ID:</Text>
                  <Text style={[styles.value, { color: colors.text }]}>{crawlResult.placeId}</Text>
                </View>
              )}

              {crawlResult.savedToDb !== undefined && (
                <View style={styles.infoRow}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>DB 저장:</Text>
                  <Text style={[styles.value, { color: crawlResult.savedToDb ? '#0a0' : '#a00' }]}>
                    {crawlResult.savedToDb ? '✓ 저장됨' : '✗ 저장 안됨'}
                  </Text>
                </View>
              )}

              {crawlResult.restaurantId && (
                <View style={styles.infoRow}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>음식점 ID:</Text>
                  <Text style={[styles.value, { color: colors.text }]}>{crawlResult.restaurantId}</Text>
                </View>
              )}

              {/* 메뉴 목록 */}
              {crawlResult.menuItems && crawlResult.menuItems.length > 0 && (
                <View style={styles.menuSection}>
                  <Text style={[styles.menuTitle, { color: colors.text }]}>
                    메뉴 ({crawlResult.menuItems.length}개)
                  </Text>
                  {crawlResult.menuItems.map((menu, index) => (
                    <View key={index} style={[styles.menuItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.menuHeader}>
                        <Text style={[styles.menuName, { color: colors.text }]}>{menu.name}</Text>
                        <Text style={[styles.menuPrice, { color: colors.primary }]}>{menu.price}</Text>
                      </View>
                      {menu.description && (
                        <Text style={[styles.menuDescription, { color: colors.textSecondary }]}>
                          {menu.description}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* 원본 URL 링크 */}
              <TouchableOpacity onPress={() => window.open(crawlResult.url, '_blank')} style={styles.linkButton}>
                <Text style={[styles.linkText, { color: colors.primary }]}>원본 페이지 열기 →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <Drawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onLogout={handleLogout}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  section: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  formSection: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  loadingSection: {
    marginTop: 20,
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorSection: {
    marginTop: 20,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 14,
  },
  resultSection: {
    marginTop: 20,
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 100,
    marginRight: 8,
  },
  value: {
    fontSize: 14,
    flex: 1,
  },
  menuSection: {
    marginTop: 24,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  menuItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  menuName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  menuPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  menuDescription: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  linkButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
})

export default Restaurant
