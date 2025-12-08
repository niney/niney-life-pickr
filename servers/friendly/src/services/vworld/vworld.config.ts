/**
 * VWorld 설정 로더
 * 공통 config 유틸을 사용하여 base.yml에서 설정 로드
 * 우선순위: 기본값 < base.yml < 환경변수
 */

import { loadConfigSection } from '../../utils/config.utils'

/**
 * VWorld 설정 타입
 */
export interface VWorldConfig {
  apiKey: string
  geocodeUrl: string
  wmtsUrl: string
}

interface VWorldYamlConfig {
  apiKey?: string
  geocodeUrl?: string
  wmtsUrl?: string
}

/**
 * 기본 설정값
 */
const DEFAULT_CONFIG: VWorldConfig = {
  apiKey: '',
  geocodeUrl: 'https://api.vworld.kr/req/address',
  wmtsUrl: 'https://api.vworld.kr/req/wmts/1.0.0',
}

/**
 * VWorld 설정 생성
 * 우선순위: 기본값 < base.yml < 환경변수
 *
 * @returns VWorldConfig | null (API 키가 없으면 null)
 */
export function createVWorldConfig(): VWorldConfig | null {
  const yamlConfig = loadConfigSection<VWorldYamlConfig>('vworld')

  // API 키 우선순위: yaml > 환경변수 > 기본값
  const apiKey = yamlConfig?.apiKey ??
                 process.env.VWORLD_API_KEY ??
                 DEFAULT_CONFIG.apiKey

  // API 키가 없으면 null 반환
  if (!apiKey || apiKey.trim() === '') {
    console.warn('⚠️  VWorld API 키가 없습니다.')
    return null
  }

  // 우선순위에 따라 병합: 기본값 < yaml
  return {
    apiKey,
    geocodeUrl: yamlConfig?.geocodeUrl ?? DEFAULT_CONFIG.geocodeUrl,
    wmtsUrl: yamlConfig?.wmtsUrl ?? DEFAULT_CONFIG.wmtsUrl,
  }
}

/**
 * 설정 정보 출력 (디버깅용)
 */
export function printVWorldConfig(config: VWorldConfig): void {
  console.log('\n📋 VWorld 설정:')
  console.log(`  - Geocode URL: ${config.geocodeUrl}`)
  console.log(`  - WMTS URL: ${config.wmtsUrl}`)
  console.log(`  - API Key: ${config.apiKey ? '***설정됨***' : '없음'}`)
  console.log('')
}
