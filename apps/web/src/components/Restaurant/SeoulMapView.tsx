import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { SEOUL_DISTRICTS, useTheme, THEME_COLORS } from '@shared'
import type { District } from '@shared'
import SeoulMapSvg from '../../assets/name_mark_map-seoul.svg'

interface SeoulMapViewProps {
  onDistrictClick?: (districtName: string) => void
  isMobile?: boolean
  onBack?: () => void
}

// 모바일 웹 전용: 앱과 동일한 구현
const MobileSeoulMapView: React.FC<SeoulMapViewProps> = ({ onDistrictClick, onBack }) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 })
  const [pressedDistrict, setPressedDistrict] = useState<string | null>(null)
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // 웹에서는 ResizeObserver를 사용하여 크기 측정
  useEffect(() => {
    if (!containerRef.current) return

    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        console.log('[MobileSeoulMapView] Container size:', { width, height })
        setMapSize({ width, height })
      }
    }

    // 초기 크기 설정 (약간 지연)
    const timer = setTimeout(updateSize, 100)

    // ResizeObserver로 크기 변경 감지
    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(containerRef.current)

    return () => {
      clearTimeout(timer)
      resizeObserver.disconnect()
    }
  }, [])

  const handleDistrictPress = useCallback((districtName: string) => {
    setPressedDistrict(districtName)

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setPressedDistrict(null)
      if (onDistrictClick) {
        onDistrictClick(districtName)
      }
      timeoutRef.current = null
    }, 0) as unknown as number
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* 모바일 전용: 헤더 */}
      {onBack && (
        <View
          style={{
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <TouchableOpacity
            onPress={onBack}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: 18, color: colors.text }} />
            <Text style={{ fontSize: 16, color: colors.text, fontWeight: '600' }}>
              목록으로
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Map container with ref */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative', backgroundColor: colors.background }}>
        {/* Background */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor
        }} />

        {mapSize.width > 0 && mapSize.height > 0 && (
          <>
            {/* Han River (한강) - Native SVG for web */}
            <svg
              width={mapSize.width}
              height={mapSize.height}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'none',
              }}
            >
              {/* 한강 외곽선 (더 진한 색) */}
              <path
                d={hanRiverPath}
                stroke={hanRiverColors.outer}
                strokeWidth={16}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* 한강 내부 (밝은 색) */}
              <path
                d={hanRiverPath}
                stroke={hanRiverColors.inner}
                strokeWidth={10}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

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

            {/* Title overlay - semi-transparent to avoid overlapping districts */}
            <View style={styles.titleContainer} pointerEvents="box-none">
              <View style={[styles.titleBackground, { backgroundColor: titleBackgroundColor }]}>
                <Text style={[styles.titleText, { color: titleTextColor }]}>서울 25개 구</Text>
                <Text style={[styles.subtitleText, { color: subtitleTextColor }]}>
                  원하는 구를 선택하세요
                </Text>
              </View>
            </View>
          </>
        )}
      </div>
    </div>
  )
}

// 데스크탑 웹 전용: 기존 SVG 방식 유지
const DesktopSeoulMapView: React.FC<SeoulMapViewProps> = ({ onDistrictClick }) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]
  const svgContainerRef = useRef<HTMLDivElement>(null)
  const [svgContent, setSvgContent] = useState<string>('')

  // SVG 파일을 fetch하여 인라인으로 삽입
  useEffect(() => {
    const loadSvg = async () => {
      try {
        const response = await fetch(SeoulMapSvg)
        const svgText = await response.text()
        setSvgContent(svgText)
      } catch (error) {
        console.error('SVG 로드 실패:', error)
      }
    }
    loadSvg()
  }, [])

  // SVG 요소에 클릭 이벤트 리스너 추가 및 스타일 설정
  useEffect(() => {
    if (!svgContainerRef.current || !svgContent) return

    const container = svgContainerRef.current
    const svgElement = container.querySelector('svg')
    if (!svgElement) return

    // viewBox는 SVG 파일 자체에서 설정됨

    // SVG 크기 조정 (컨테이너에 맞추되 비율 유지, 잘림 방지)
    svgElement.style.width = '100%'
    svgElement.style.height = '100%'
    svgElement.style.display = 'block'
    svgElement.setAttribute('preserveAspectRatio', 'xMinYMin meet')

    // TEXT 요소들에 클릭 영역 추가 (특정 그룹 내부만)
    // id="_주기" > id="_명칭_x5F_시군구" 안에 있는 TEXT 요소만 대상
    const parentGroup = svgElement.querySelector('g[id="_주기"][data-name="주기"]')
    if (!parentGroup) {
      console.warn('주기 그룹을 찾을 수 없습니다')
      return
    }

    const nameGroup = parentGroup.querySelector('g[id="_명칭_x5F_시군구"][data-name="명칭_x5F_시군구"]')
    if (!nameGroup) {
      console.warn('명칭_x5F_시군구 그룹을 찾을 수 없습니다')
      return
    }

    const textElements = nameGroup.querySelectorAll('g[id^="TEXT"]')
    const expandSize = 20

    textElements.forEach((textElement) => {
      try {
        const bbox = (textElement as SVGGraphicsElement).getBBox()

        // 투명한 클릭 영역 생성 (bbox보다 훨씬 크게)
        const clickArea = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        clickArea.setAttribute('x', String(bbox.x - expandSize))
        clickArea.setAttribute('y', String(bbox.y - expandSize))
        clickArea.setAttribute('width', String(bbox.width + expandSize * 2))
        clickArea.setAttribute('height', String(bbox.height + expandSize * 2))
        clickArea.setAttribute('fill', 'transparent')
        clickArea.setAttribute('cursor', 'pointer')
        clickArea.setAttribute('pointer-events', 'all') // 모든 마우스 이벤트 캐치
        clickArea.setAttribute('data-text-id', textElement.getAttribute('id') || '')
        clickArea.setAttribute('data-text-name', textElement.getAttribute('data-name') || '')
        clickArea.setAttribute('data-name-ko', textElement.getAttribute('data-name-ko') || '')

        // 내부 path 요소들이 마우스 이벤트를 가로채지 않도록 설정
        const paths = textElement.querySelectorAll('path')
        paths.forEach(path => {
          path.setAttribute('pointer-events', 'none')
        })

        // TEXT 요소의 맨 뒤에 삽입 (다른 요소 위에 배치)
        textElement.appendChild(clickArea)
      } catch (error) {
        console.error('TEXT 영역 클릭 영역 추가 실패:', error)
      }
    })

    // 모든 클릭 가능한 요소에 이벤트 리스너 추가
    const handleClick = (event: MouseEvent) => {
      const target = event.target as SVGElement

      // 투명한 클릭 영역(rect)을 클릭한 경우
      if (target.tagName === 'rect' && target.hasAttribute('data-text-id')) {
        const textNameKo = target.getAttribute('data-name-ko')

        // 한글 구 이름을 부모 컴포넌트로 전달
        if (textNameKo && onDistrictClick) {
          onDistrictClick(textNameKo)
        }

        // 클릭 피드백 효과
        const originalFill = target.getAttribute('fill') || 'transparent'
        target.setAttribute('fill', colors.primary)
        target.setAttribute('opacity', '0.3')

        setTimeout(() => {
          target.setAttribute('fill', originalFill)
          target.setAttribute('opacity', '0')
        }, 300)

        return
      }
    }

    svgElement.addEventListener('click', handleClick)

    // TEXT 영역에 호버 효과 추가
    const hoverHandlers: Array<{ element: Element; enter: () => void; leave: () => void }> = []

    textElements.forEach((textElement) => {
      const clickArea = textElement.querySelector('rect[data-text-id]')
      if (clickArea) {
        const handleEnter = () => {
          clickArea.setAttribute('fill', colors.primary)
          clickArea.setAttribute('opacity', '0.2')
        }
        const handleLeave = () => {
          clickArea.setAttribute('fill', 'transparent')
          clickArea.removeAttribute('opacity')
        }

        clickArea.addEventListener('mouseenter', handleEnter)
        clickArea.addEventListener('mouseleave', handleLeave)

        hoverHandlers.push({ element: clickArea, enter: handleEnter, leave: handleLeave })
      }
    })

    return () => {
      svgElement.removeEventListener('click', handleClick)
      hoverHandlers.forEach(({ element, enter, leave }) => {
        element.removeEventListener('mouseenter', enter)
        element.removeEventListener('mouseleave', leave)
      })
    }
  }, [svgContent, colors, onDistrictClick])

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: colors.background,
        overflow: 'hidden',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        ref={svgContainerRef}
        style={{
          width: '100%',
          height: '100%',
          flex: 1,
        }}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  )
}

// Main component - 화면 크기에 따라 다른 구현 선택
const SeoulMapView: React.FC<SeoulMapViewProps> = (props) => {
  const { isMobile = false } = props

  // 모바일 웹: 앱과 동일한 구현
  if (isMobile) {
    return <MobileSeoulMapView {...props} />
  }

  // 데스크탑 웹: 기존 SVG 방식
  return <DesktopSeoulMapView {...props} />
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
