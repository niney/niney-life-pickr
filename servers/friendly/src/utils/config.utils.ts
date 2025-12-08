/**
 * 공통 설정 로더 유틸리티
 * base.yml에서 설정을 읽어오는 공통 함수
 */

import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'

// 캐싱된 설정
let cachedConfig: Record<string, any> | null = null
let cachedConfigPath: string | null = null

/**
 * base.yml 파일 경로 탐색
 */
function findConfigPath(): string | null {
  const possiblePaths = [
    path.join(process.cwd(), 'config', 'base.yml'),
    path.join(__dirname, '../../../../config/base.yml'),
    path.join(__dirname, '../../../../../config/base.yml'),
  ]

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p
    }
  }

  return null
}

/**
 * base.yml 전체 설정 로드 (캐싱)
 */
export function loadBaseConfig(): Record<string, any> | null {
  // 이미 로드된 설정이 있으면 반환
  if (cachedConfig !== null) {
    return cachedConfig
  }

  try {
    const configPath = findConfigPath()

    if (!configPath) {
      console.warn('⚠️  base.yml 파일을 찾을 수 없습니다.')
      return null
    }

    const fileContents = fs.readFileSync(configPath, 'utf8')
    cachedConfig = yaml.load(fileContents) as Record<string, any>
    cachedConfigPath = configPath

    return cachedConfig
  } catch (error) {
    console.error('❌ base.yml 로드 중 오류 발생:', error)
    return null
  }
}

/**
 * 특정 섹션의 설정 로드
 * @param section - 설정 섹션 이름 (예: 'ollama', 'vworld')
 */
export function loadConfigSection<T>(section: string): T | null {
  const config = loadBaseConfig()

  if (!config) {
    return null
  }

  if (!config[section]) {
    console.warn(`⚠️  base.yml에 ${section} 설정이 없습니다.`)
    return null
  }

  return config[section] as T
}

/**
 * 설정 캐시 초기화 (테스트용)
 */
export function clearConfigCache(): void {
  cachedConfig = null
  cachedConfigPath = null
}

/**
 * 현재 로드된 설정 파일 경로 반환
 */
export function getConfigPath(): string | null {
  if (cachedConfigPath === null) {
    loadBaseConfig()
  }
  return cachedConfigPath
}
