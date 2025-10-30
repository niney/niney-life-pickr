export interface District {
  name: string
  x: number      // 비율 (0~1)
  y: number      // 비율 (0~1)
  width: number  // 비율 (0~1)
  height: number // 비율 (0~1)
}

export const SEOUL_DISTRICTS: District[] = [
  { name: '강남구', x: 0.79, y: 0.67, width: 0.10, height: 0.06 },
  { name: '강동구', x: 0.90, y: 0.53, width: 0.10, height: 0.06 },
  { name: '강북구', x: 0.54, y: 0.20, width: 0.10, height: 0.06 },
  { name: '강서구', x: 0.10, y: 0.42, width: 0.10, height: 0.06 },
  { name: '관악구', x: 0.50, y: 0.76, width: 0.10, height: 0.06 },
  { name: '광진구', x: 0.82, y: 0.45, width: 0.10, height: 0.06 },
  { name: '구로구', x: 0.20, y: 0.68, width: 0.10, height: 0.06 },
  { name: '금천구', x: 0.37, y: 0.82, width: 0.10, height: 0.06 },
  { name: '노원구', x: 0.77, y: 0.18, width: 0.10, height: 0.06 },
  { name: '도봉구', x: 0.62, y: 0.14, width: 0.10, height: 0.06 },
  { name: '동대문구', x: 0.68, y: 0.32, width: 0.12, height: 0.06 },
  { name: '동작구', x: 0.50, y: 0.65, width: 0.10, height: 0.06 },
  { name: '마포구', x: 0.30, y: 0.42, width: 0.10, height: 0.06 },
  { name: '서대문구', x: 0.33, y: 0.34, width: 0.12, height: 0.06 },
  { name: '서초구', x: 0.62, y: 0.70, width: 0.10, height: 0.06 },
  { name: '성동구', x: 0.72, y: 0.39, width: 0.10, height: 0.06 },
  { name: '성북구', x: 0.57, y: 0.27, width: 0.10, height: 0.06 },
  { name: '송파구', x: 0.85, y: 0.60, width: 0.10, height: 0.06 },
  { name: '양천구', x: 0.20, y: 0.52, width: 0.10, height: 0.06 },
  { name: '영등포구', x: 0.37, y: 0.58, width: 0.12, height: 0.06 },
  { name: '용산구', x: 0.50, y: 0.49, width: 0.10, height: 0.06 },
  { name: '은평구', x: 0.34, y: 0.25, width: 0.10, height: 0.06 },
  { name: '종로구', x: 0.51, y: 0.34, width: 0.10, height: 0.06 },
  { name: '중구', x: 0.54, y: 0.41, width: 0.08, height: 0.05 },
  { name: '중랑구', x: 0.83, y: 0.28, width: 0.10, height: 0.06 },
]
