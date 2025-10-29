import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import SeoulMapSvg from '../../assets/name_mark_map-seoul.svg'

interface SeoulMapViewProps {
  onDistrictClick?: (districtName: string) => void
}

const SeoulMapView: React.FC<SeoulMapViewProps> = ({ onDistrictClick }) => {
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
    const expandSize = 20 // 클릭 영역 확장 크기

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
      }}
    >
      <div
        ref={svgContainerRef}
        style={{
          width: '100%',
          height: '100%',
        }}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  )
}

export default SeoulMapView
