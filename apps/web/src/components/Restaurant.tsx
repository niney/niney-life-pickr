import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import { InputField, Button } from '@shared/components'
import Header from './Header'
import Drawer from './Drawer'

interface RestaurantProps {
  onLogout: () => Promise<void>
}

const Restaurant: React.FC<RestaurantProps> = ({ onLogout }) => {
  const { theme } = useTheme()
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [url, setUrl] = useState('')
  const [normalizedUrl, setNormalizedUrl] = useState('')

  const colors = THEME_COLORS[theme]

  const normalizeToMobileUrl = (inputUrl: string): string => {
    // 1. naver.me 단축 URL인 경우 그대로 반환 (백엔드에서 리다이렉트 처리)
    if (inputUrl.includes('naver.me')) {
      return inputUrl;
    }

    // 2. Place ID만 입력된 경우 (숫자만)
    if (/^\d+$/.test(inputUrl)) {
      return `https://m.place.naver.com/restaurant/${inputUrl}/home`;
    }

    // 3. 데스크탑 URL에서 Place ID 추출
    // 예: https://map.naver.com/p/search/조연탄/place/20848484
    const desktopPlaceMatch = inputUrl.match(/map\.naver\.com\/.*\/place\/(\d+)/);
    if (desktopPlaceMatch) {
      const placeId = desktopPlaceMatch[1];
      return `https://m.place.naver.com/restaurant/${placeId}/home`;
    }

    // 4. 다른 패턴의 데스크탑 URL
    // 예: https://map.naver.com/v5/entry/place/20848484
    const v5PlaceMatch = inputUrl.match(/map\.naver\.com\/v5\/entry\/place\/(\d+)/);
    if (v5PlaceMatch) {
      const placeId = v5PlaceMatch[1];
      return `https://m.place.naver.com/restaurant/${placeId}/home`;
    }

    // 5. entry/place 패턴의 데스크탑 URL
    // 예: https://map.naver.com/p/entry/place/20848484
    const entryPlaceMatch = inputUrl.match(/map\.naver\.com\/p\/entry\/place\/(\d+)/);
    if (entryPlaceMatch) {
      const placeId = entryPlaceMatch[1];
      return `https://m.place.naver.com/restaurant/${placeId}/home`;
    }

    // 6. 이미 모바일 URL인 경우
    if (inputUrl.includes('m.place.naver.com') || inputUrl.includes('place.naver.com')) {
      return inputUrl;
    }

    // 7. 기타 URL 패턴에서 Place ID 추출 시도
    const generalPlaceMatch = inputUrl.match(/place[\/=](\d+)/);
    if (generalPlaceMatch) {
      const placeId = generalPlaceMatch[1];
      return `https://m.place.naver.com/restaurant/${placeId}/home`;
    }

    // 변환할 수 없는 경우 원본 반환
    return inputUrl;
  }

  const handleNormalize = () => {
    if (!url.trim()) return
    const normalized = normalizeToMobileUrl(url.trim())
    setNormalizedUrl(normalized)
  }

  const handleLogout = async () => {
    await onLogout()
    window.location.href = '/login'
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header onMenuPress={() => setDrawerVisible(true)} />

      <View style={styles.content}>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>맛집 URL 정규화</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            네이버 맛집 URL을 모바일 URL로 변환합니다
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
            title="모바일 URL로 변환"
            onPress={handleNormalize}
            variant="primary"
          />

          {normalizedUrl && (
            <View style={[styles.resultSection, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>변환된 URL:</Text>
              <TouchableOpacity onPress={() => window.open(normalizedUrl, '_blank')}>
                <Text style={[styles.resultUrl, { color: colors.primary }]} numberOfLines={0}>
                  {normalizedUrl}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

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
  content: {
    flex: 1,
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
  resultSection: {
    marginTop: 20,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  resultLabel: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '600',
  },
  resultUrl: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
})

export default Restaurant
