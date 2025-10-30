import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  LayoutChangeEvent,
} from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { SEOUL_DISTRICTS, District, useTheme, THEME_COLORS } from 'shared'

interface SeoulMapViewProps {
  onDistrictClick: (districtName: string) => void
}

const SeoulMapView: React.FC<SeoulMapViewProps> = ({ onDistrictClick }) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 })
  const [pressedDistrict, setPressedDistrict] = useState<string | null>(null)
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null)
  const timeoutRef = useRef<number | null>(null)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    setMapSize({ width, height })
  }, [])

  const handleDistrictPress = useCallback((districtName: string) => {
    setPressedDistrict(districtName)

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setPressedDistrict(null)
      onDistrictClick(districtName)
      timeoutRef.current = null
    }, 0)
  }, [onDistrictClick])

  const handlePressIn = useCallback((districtName: string) => {
    setHoveredDistrict(districtName)
  }, [])

  const handlePressOut = useCallback(() => {
    setHoveredDistrict(null)
  }, [])

  // 일러스트레이터 스타일 색상 팔레트 (메모이제이션)
  const getDistrictColor = useCallback((isPressed: boolean, isHovered: boolean) => {
    if (isPressed) {
      return theme === 'dark'
        ? '#667eea'  // Purple
        : '#f093fb'  // Pink
    }

    if (isHovered) {
      return theme === 'dark'
        ? '#4facfe'  // Blue
        : '#43e97b'  // Green
    }

    // Default pastel colors
    return theme === 'dark'
      ? 'rgba(139, 152, 191, 0.3)'
      : 'rgba(255, 255, 255, 0.9)'
  }, [theme])

  const getTextColor = useCallback((isPressed: boolean, isHovered: boolean) => {
    if (isPressed || isHovered) {
      return '#ffffff'
    }
    return theme === 'dark' ? '#e2e8f0' : '#334155'
  }, [theme])

  const getBorderColor = useCallback((isPressed: boolean, isHovered: boolean) => {
    if (isPressed || isHovered) {
      return theme === 'dark'
        ? 'rgba(255, 255, 255, 0.3)'
        : 'rgba(255, 255, 255, 0.8)'
    }
    return theme === 'dark'
      ? 'rgba(148, 163, 184, 0.3)'
      : 'rgba(203, 213, 225, 0.5)'
  }, [theme])

  // 한강 경로 생성 (메모이제이션 - mapSize 변경 시에만 재계산)
  // 한강은 서쪽(강서)에서 동쪽(강동)으로 흐르며 중간에 S자 곡선
  // 강서구 위 → 용산구 아래 → 광진구 아래 → 강동구 위
  const hanRiverPath = useMemo(() => {
    if (mapSize.width === 0 || mapSize.height === 0) return ''

    // 한강 주요 포인트 (x, y는 0~1 비율)
    const points = [
      { x: 0.05, y: 0.38 },  // 서쪽 시작 (강서구 위쪽)
      { x: 0.10, y: 0.40 },  // 강서구 위
      { x: 0.30, y: 0.48 },  // 양천구 아래
      { x: 0.35, y: 0.49 },  // 마포구 아래
      { x: 0.37, y: 0.51 },  // 영등포구 아래
      { x: 0.45, y: 0.55 },  // 용산구 아래 (최저점)
      { x: 0.55, y: 0.56 },  // 중구 아래
      { x: 0.65, y: 0.53 },  // 성동구 아래
      { x: 0.72, y: 0.48 },  // 성동구 아래
      { x: 0.82, y: 0.50 },  // 광진구 아래
      { x: 0.90, y: 0.48 },  // 강동구 위
      { x: 0.95, y: 0.43 },  // 동쪽 끝 (강동구 위)
    ]

    // SVG Path 문자열 생성 (Quadratic Bezier Curve)
    let path = `M ${points[0].x * mapSize.width} ${points[0].y * mapSize.height}`

    for (let i = 1; i < points.length; i++) {
      const curr = points[i]
      const prev = points[i - 1]

      // 중간 제어점 (부드러운 곡선을 위해)
      const cpX = ((prev.x + curr.x) / 2) * mapSize.width
      const cpY = ((prev.y + curr.y) / 2) * mapSize.height

      path += ` Q ${cpX} ${cpY}, ${curr.x * mapSize.width} ${curr.y * mapSize.height}`
    }

    return path
  }, [mapSize.width, mapSize.height])

  // 한강 색상 (테마별 메모이제이션)
  const hanRiverColors = useMemo(
    () => ({
      outer: theme === 'dark' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(37, 99, 235, 0.4)',
      inner: theme === 'dark' ? 'rgba(96, 165, 250, 0.4)' : 'rgba(147, 197, 253, 0.5)',
    }),
    [theme]
  )

  // 배경 색상 (테마별 메모이제이션)
  const backgroundColor = useMemo(
    () => (theme === 'dark' ? '#1a202c' : '#f0f4f8'),
    [theme]
  )

  // Title 배경 색상 (테마별 메모이제이션)
  const titleBackgroundColor = useMemo(
    () => (theme === 'dark' ? 'rgba(30, 41, 59, 0.75)' : 'rgba(255, 255, 255, 0.80)'),
    [theme]
  )

  const titleTextColor = useMemo(
    () => (theme === 'dark' ? '#f1f5f9' : '#1e293b'),
    [theme]
  )

  const subtitleTextColor = useMemo(
    () => (theme === 'dark' ? '#94a3b8' : '#64748b'),
    [theme]
  )

  // Indicator dot 배경색 (테마별 메모이제이션)
  const indicatorColor = useMemo(
    () => (theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.95)'),
    [theme]
  )

  // 동적 스타일 생성 함수 (메모이제이션)
  const getCardInnerStyle = useCallback(
    (cardColor: string, borderColor: string, isPressed: boolean, isHovered: boolean) => ({
      backgroundColor: cardColor,
      borderColor: borderColor,
      shadowColor: isPressed || isHovered ? '#000' : 'transparent',
      shadowOffset: {
        width: 0,
        height: isPressed || isHovered ? 8 : 4,
      },
      shadowOpacity: isPressed || isHovered ? 0.3 : 0.1,
      shadowRadius: isPressed || isHovered ? 12 : 6,
      elevation: isPressed || isHovered ? 8 : 3,
      transform: [{ scale: isPressed ? 0.95 : isHovered ? 1.05 : 1 }],
    }),
    []
  )

  const getTextStyle = useCallback(
    (textColor: string, isPressed: boolean, isHovered: boolean) => ({
      color: textColor,
      fontWeight: (isPressed || isHovered ? '700' : '600') as '700' | '600',
    }),
    []
  )

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Background with decorative pattern */}
      <View style={[styles.backgroundPattern, { backgroundColor }]} />

      {/* Map container */}
      <View style={styles.mapContainer} onLayout={handleLayout}>
        {mapSize.width > 0 && mapSize.height > 0 && (
          <View style={StyleSheet.absoluteFill}>
            {/* Han River (한강) */}
            <Svg
              width={mapSize.width}
              height={mapSize.height}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            >
              {/* 한강 외곽선 (더 진한 색) */}
              <Path
                d={hanRiverPath}
                stroke={hanRiverColors.outer}
                strokeWidth={16}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* 한강 내부 (밝은 색) */}
              <Path
                d={hanRiverPath}
                stroke={hanRiverColors.inner}
                strokeWidth={10}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>

            {/* District cards */}
            {SEOUL_DISTRICTS.map((district: District) => {
              const isPressed = pressedDistrict === district.name
              const isHovered = hoveredDistrict === district.name
              const cardColor = getDistrictColor(isPressed, isHovered)
              const textColor = getTextColor(isPressed, isHovered)
              const borderColor = getBorderColor(isPressed, isHovered)

              // Fixed size for all cards
              const cardWidth = 70
              const cardHeight = 36

              return (
                <TouchableOpacity
                  key={district.name}
                  style={[
                    styles.districtCard,
                    {
                      left: district.x * mapSize.width - cardWidth / 2,
                      top: district.y * mapSize.height - cardHeight / 2,
                      width: cardWidth,
                      height: cardHeight,
                    },
                  ]}
                  onPress={() => handleDistrictPress(district.name)}
                  onPressIn={() => handlePressIn(district.name)}
                  onPressOut={handlePressOut}
                  activeOpacity={0.9}
                >
                  <View
                    style={[
                      styles.districtCardInner,
                      getCardInnerStyle(cardColor, borderColor, isPressed, isHovered),
                    ]}
                  >
                    <Text
                      style={[styles.districtText, getTextStyle(textColor, isPressed, isHovered)]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {district.name}
                    </Text>

                    {/* Dot indicator */}
                    {(isPressed || isHovered) && (
                      <View style={[styles.indicator, { backgroundColor: indicatorColor }]} />
                    )}
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </View>

      {/* Title overlay - semi-transparent to avoid overlapping districts */}
      <View style={styles.titleContainer} pointerEvents="box-none">
        <View style={[styles.titleBackground, { backgroundColor: titleBackgroundColor }]}>
          <Text style={[styles.titleText, { color: titleTextColor }]}>서울 25개 구</Text>
          <Text style={[styles.subtitleText, { color: subtitleTextColor }]}>
            원하는 구를 선택하세요
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mapContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  districtCard: {
    position: 'absolute',
  },
  districtCardInner: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  districtText: {
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  indicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  titleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  titleBackground: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 13,
    marginTop: 2,
    letterSpacing: -0.2,
  },
})

export default SeoulMapView
