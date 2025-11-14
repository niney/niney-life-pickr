import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'

interface MapTabProps {
  placeId?: string
  onOpenNaverMap: (placeId: string) => void
  isMobile?: boolean
}

const MapTab: React.FC<MapTabProps> = ({ placeId, onOpenNaverMap, isMobile = false }) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]

  if (!placeId) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          지도 정보가 없습니다
        </Text>
      </View>
    )
  }

  // 플랫폼별 네이버 지도 URL
  const mapUrl = isMobile
    ? `https://m.place.naver.com/restaurant/${placeId}/location`  // 모바일
    : `https://map.naver.com/p/entry/place/${placeId}`            // 데스크톱

  return (
    <View style={styles.container}>
      <iframe
        src={mapUrl}
        style={{
          width: '100%',
          height: 'calc(100vh - 285px)',
          border: 'none',
          borderRadius: '12px',
        }}
        title="네이버 지도"
      />

      {/* Fallback: iframe 차단 시 새 창 열기 버튼 (앱 우선) */}
      <TouchableOpacity
        style={[styles.openMapButton, { backgroundColor: colors.primary }]}
        onPress={() => onOpenNaverMap(placeId)}
      >
        <Text style={styles.openMapButtonText}>🔗 네이버 지도에서 열기</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 20,
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
  openMapButton: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    cursor: 'pointer',
  },
  openMapButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
})

export default MapTab
