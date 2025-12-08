import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import { geocodeAddress } from '../../../utils/vworldGeocode'

// OpenLayers imports
import OlMap from 'ol/Map'
import OlView from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import XYZ from 'ol/source/XYZ'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import { fromLonLat } from 'ol/proj'
import { Style, Icon, Text as OlText, Fill, Stroke } from 'ol/style'
import 'ol/ol.css'

interface VworldMapTabProps {
  lat?: number | null
  lng?: number | null
  address?: string | null
  restaurantName?: string
  isMobile?: boolean
}

// 서울 시청 좌표 (기본값)
const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 }
const DEFAULT_ZOOM = 17

const VworldMapTab: React.FC<VworldMapTabProps> = ({
  lat,
  lng,
  address,
  restaurantName,
  isMobile = false,
}) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<OlMap | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(
    lat && lng ? { lat, lng } : null
  )
  const [error, setError] = useState<string | null>(null)

  const apiKey = import.meta.env.VITE_VWORLD_API_KEY as string
  const wmtsUrl = import.meta.env.VITE_VWORLD_WMTS_URL as string || 'https://api.vworld.kr/req/wmts/1.0.0'

  // 주소 → 좌표 변환 (지오코딩) - 백엔드 프록시 API 사용
  useEffect(() => {
    const fetchCoordinates = async () => {
      // 이미 좌표가 있으면 스킵
      if (lat && lng) {
        setCoordinates({ lat, lng })
        return
      }

      // 주소가 있으면 지오코딩 시도
      if (address) {
        setIsLoading(true)
        setError(null)

        try {
          const result = await geocodeAddress(address)
          if (result) {
            setCoordinates(result)
          } else {
            setError('주소를 좌표로 변환할 수 없습니다')
          }
        } catch (err) {
          setError('지오코딩 중 오류가 발생했습니다')
          console.error('Geocoding error:', err)
        } finally {
          setIsLoading(false)
        }
      } else {
        setError('주소 정보가 없습니다')
      }
    }

    fetchCoordinates()
  }, [lat, lng, address])

  // OpenLayers 지도 초기화
  useEffect(() => {
    if (!mapContainerRef.current || !apiKey) return

    // 기존 지도 제거
    if (mapRef.current) {
      mapRef.current.setTarget(undefined)
      mapRef.current = null
    }

    const center = coordinates || DEFAULT_CENTER

    // VWorld 배경지도 레이어
    const vworldBaseLayer = new TileLayer({
      source: new XYZ({
        url: `${wmtsUrl}/${apiKey}/Base/{z}/{y}/{x}.png`,
        crossOrigin: 'anonymous',
      }),
    })

    // 지도 뷰 생성
    const view = new OlView({
      center: fromLonLat([center.lng, center.lat]),
      zoom: DEFAULT_ZOOM,
    })

    // 지도 생성
    const map = new OlMap({
      target: mapContainerRef.current,
      layers: [vworldBaseLayer],
      view: view,
    })

    // 좌표가 있으면 마커 추가
    if (coordinates) {
      const markerFeature = new Feature({
        geometry: new Point(fromLonLat([coordinates.lng, coordinates.lat])),
        name: restaurantName || '위치',
      })

      // 마커 스타일 (SVG 아이콘)
      const markerStyle = new Style({
        image: new Icon({
          anchor: [0.5, 1],
          src: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48">
              <path fill="${colors.primary}" stroke="#fff" stroke-width="2" d="M16 2C8.268 2 2 8.268 2 16c0 10 14 30 14 30s14-20 14-30c0-7.732-6.268-14-14-14z"/>
              <circle fill="#fff" cx="16" cy="16" r="6"/>
            </svg>
          `),
          scale: 1,
        }),
        text: new OlText({
          text: restaurantName || '',
          offsetY: -55,
          font: 'bold 14px sans-serif',
          fill: new Fill({ color: colors.text }),
          stroke: new Stroke({ color: '#fff', width: 3 }),
        }),
      })

      markerFeature.setStyle(markerStyle)

      const vectorSource = new VectorSource({
        features: [markerFeature],
      })

      const vectorLayer = new VectorLayer({
        source: vectorSource,
      })

      map.addLayer(vectorLayer)
    }

    mapRef.current = map

    // 클린업
    return () => {
      if (mapRef.current) {
        mapRef.current.setTarget(undefined)
        mapRef.current = null
      }
    }
  }, [coordinates, apiKey, wmtsUrl, restaurantName, colors.primary, colors.text])

  // API 키가 없는 경우
  if (!apiKey) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          VWorld API 키가 설정되지 않았습니다
        </Text>
        <Text style={[styles.helpText, { color: colors.textSecondary }]}>
          config/base.yml에서 vworld.apiKey를 설정해주세요
        </Text>
      </View>
    )
  }

  // 로딩 중
  if (isLoading) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          주소를 좌표로 변환 중...
        </Text>
      </View>
    )
  }

  // 에러 발생
  if (error && !coordinates) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{error}</Text>
        {address && (
          <Text style={[styles.addressText, { color: colors.textSecondary }]}>
            주소: {address}
          </Text>
        )}
      </View>
    )
  }

  const mapHeight = isMobile ? 'calc(100vh - 320px)' : 'calc(100vh - 285px)'

  return (
    <View style={styles.container}>
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: mapHeight,
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      />

      {/* 주소 정보 표시 */}
      {address && (
        <View style={[styles.addressBar, { backgroundColor: colors.surface }]}>
          <Text style={[styles.addressLabel, { color: colors.textSecondary }]}>주소</Text>
          <Text style={[styles.addressValue, { color: colors.text }]}>{address}</Text>
        </View>
      )}
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
  helpText: {
    fontSize: 13,
    marginTop: 8,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  addressText: {
    fontSize: 13,
    marginTop: 8,
  },
  addressBar: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  addressLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  addressValue: {
    fontSize: 14,
  },
})

export default VworldMapTab
