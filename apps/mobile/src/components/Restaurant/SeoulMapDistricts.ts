/**
 * 서울 지도 구 좌표 데이터
 *
 * 좌표는 SVG viewBox 기준 비율 (0~1)
 * viewBox="22.6415958404541 117.70999908447266 572.4083862304688 606.3599853515625"
 *
 * TODO: 웹 버전에서 실제 getBBox() 값을 추출하여 정확한 좌표로 업데이트 필요
 * 브라우저 콘솔에서 다음 스크립트 실행:
 *
 * const districts = []
 * const svg = document.querySelector('svg')
 * const nameGroup = svg.querySelector('g[id="_명칭_x5F_시군구"]')
 * const textElements = nameGroup.querySelectorAll('g[id^="TEXT"]')
 * const svgBBox = svg.getBBox()
 *
 * textElements.forEach(el => {
 *   const bbox = el.getBBox()
 *   const nameKo = el.getAttribute('data-name-ko')
 *   if (nameKo) {
 *     districts.push({
 *       name: nameKo,
 *       x: (bbox.x - svgBBox.x) / svgBBox.width,
 *       y: (bbox.y - svgBBox.y) / svgBBox.height,
 *       width: bbox.width / svgBBox.width,
 *       height: bbox.height / svgBBox.height
 *     })
 *   }
 * })
 * console.log(JSON.stringify(districts, null, 2))
 */

export interface District {
  name: string
  x: number      // 비율 (0~1)
  y: number      // 비율 (0~1)
  width: number  // 비율 (0~1)
  height: number // 비율 (0~1)
}

// 임시 좌표 데이터 (SVG viewBox 기준 대략적인 위치)
// 웹에서 정확한 좌표 추출 후 업데이트 필요
export const SEOUL_DISTRICTS: District[] = [
  { name: '강남구', x: 0.73, y: 0.64, width: 0.10, height: 0.06 },
  { name: '강동구', x: 0.85, y: 0.55, width: 0.10, height: 0.06 },
  { name: '강북구', x: 0.52, y: 0.22, width: 0.10, height: 0.06 },
  { name: '강서구', x: 0.08, y: 0.42, width: 0.10, height: 0.06 },
  { name: '관악구', x: 0.48, y: 0.78, width: 0.10, height: 0.06 },
  { name: '광진구', x: 0.68, y: 0.38, width: 0.10, height: 0.06 },
  { name: '구로구', x: 0.25, y: 0.68, width: 0.10, height: 0.06 },
  { name: '금천구', x: 0.35, y: 0.82, width: 0.10, height: 0.06 },
  { name: '노원구', x: 0.68, y: 0.12, width: 0.10, height: 0.06 },
  { name: '도봉구', x: 0.60, y: 0.08, width: 0.10, height: 0.06 },
  { name: '동대문구', x: 0.62, y: 0.32, width: 0.12, height: 0.06 },
  { name: '동작구', x: 0.52, y: 0.68, width: 0.10, height: 0.06 },
  { name: '마포구', x: 0.32, y: 0.42, width: 0.10, height: 0.06 },
  { name: '서대문구', x: 0.38, y: 0.35, width: 0.12, height: 0.06 },
  { name: '서초구', x: 0.60, y: 0.70, width: 0.10, height: 0.06 },
  { name: '성동구', x: 0.58, y: 0.45, width: 0.10, height: 0.06 },
  { name: '성북구', x: 0.55, y: 0.28, width: 0.10, height: 0.06 },
  { name: '송파구', x: 0.78, y: 0.55, width: 0.10, height: 0.06 },
  { name: '양천구', x: 0.18, y: 0.52, width: 0.10, height: 0.06 },
  { name: '영등포구', x: 0.35, y: 0.58, width: 0.12, height: 0.06 },
  { name: '용산구', x: 0.48, y: 0.52, width: 0.10, height: 0.06 },
  { name: '은평구', x: 0.32, y: 0.25, width: 0.10, height: 0.06 },
  { name: '종로구', x: 0.45, y: 0.38, width: 0.10, height: 0.06 },
  { name: '중구', x: 0.52, y: 0.48, width: 0.08, height: 0.05 },
  { name: '중랑구', x: 0.72, y: 0.28, width: 0.10, height: 0.06 },
]
