/**
 * VWorld Geocoding 유틸리티
 * 주소를 좌표(위도/경도)로 변환
 * 백엔드 프록시 API를 통해 CORS 우회
 */

export interface GeocodeResult {
  lat: number
  lng: number
}

interface BackendGeocodeResponse {
  result: boolean
  data: {
    lat: number
    lng: number
  } | null
  message: string
  timestamp: string
}

/**
 * 백엔드 프록시를 통해 주소를 좌표로 변환
 * @param address 검색할 주소
 * @returns 좌표 정보 또는 null
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!address) {
    return null
  }

  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'
    const url = `${apiUrl}/api/vworld/geocode?address=${encodeURIComponent(address)}`

    const response = await fetch(url)

    if (!response.ok) {
      console.warn('Geocoding API 응답 오류:', response.status)
      return null
    }

    const data: BackendGeocodeResponse = await response.json()

    if (data.result && data.data) {
      return {
        lat: data.data.lat,
        lng: data.data.lng,
      }
    }

    console.warn('Geocoding 실패:', data.message)
    return null
  } catch (error) {
    console.error('Geocoding 오류:', error)
    return null
  }
}
