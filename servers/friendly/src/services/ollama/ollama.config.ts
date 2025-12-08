/**
 * Ollama 설정 로더
 * 공통 config 유틸을 사용하여 base.yml에서 설정 로드
 * 우선순위: 기본값 < base.yml < 생성자 파라미터
 */

import { loadConfigSection } from '../../utils/config.utils';
import type { OllamaYamlConfig, LocalOllamaConfig, CloudOllamaConfig } from './ollama.types';

/**
 * 기본 설정값
 */
const DEFAULT_LOCAL_CONFIG = {
  url: 'http://localhost:11434',
  model: 'gemma3:27b',
  timeout: 60000,
};

const DEFAULT_CLOUD_CONFIG = {
  host: 'https://ollama.com',
  model: 'gpt-oss:20b',
  timeout: 60000,
  parallelSize: 10,
  apiKey: '',
};

/**
 * base.yml에서 Ollama 설정 로드
 */
export function loadOllamaYamlConfig(): OllamaYamlConfig | null {
  return loadConfigSection<OllamaYamlConfig>('ollama');
}

/**
 * Local Ollama 설정 생성
 * 우선순위: 기본값 < base.yml < overrides
 * 
 * @param overrides - 직접 설정한 값 (최우선)
 * @returns LocalOllamaConfig
 */
export function createLocalConfig(overrides?: Partial<LocalOllamaConfig>): LocalOllamaConfig {
  const yamlConfig = loadOllamaYamlConfig();

  // 우선순위에 따라 병합: 기본값 < yaml < overrides
  return {
    url: overrides?.url ?? yamlConfig?.local?.url ?? DEFAULT_LOCAL_CONFIG.url,
    model: overrides?.model ?? yamlConfig?.local?.model ?? DEFAULT_LOCAL_CONFIG.model,
    timeout: overrides?.timeout ?? yamlConfig?.local?.timeout ?? DEFAULT_LOCAL_CONFIG.timeout,
  };
}

/**
 * Cloud Ollama 설정 생성
 * 우선순위: 기본값 < base.yml < overrides
 * 
 * @param overrides - 직접 설정한 값 (최우선)
 * @returns CloudOllamaConfig | null (API 키가 없으면 null)
 */
export function createCloudConfig(overrides?: Partial<CloudOllamaConfig>): CloudOllamaConfig | null {
  const yamlConfig = loadOllamaYamlConfig();

  // API 키 우선순위: overrides > yaml > 환경변수 > 기본값
  const apiKey = overrides?.apiKey ?? 
                 yamlConfig?.cloud?.apiKey ?? 
                 process.env.OLLAMA_CLOUD_API_KEY ?? 
                 DEFAULT_CLOUD_CONFIG.apiKey;

  // API 키가 없으면 null 반환
  if (!apiKey || apiKey.trim() === '') {
    console.warn('⚠️  Cloud Ollama API 키가 없습니다.');
    return null;
  }

  // 우선순위에 따라 병합: 기본값 < yaml < overrides
  return {
    host: overrides?.host ?? yamlConfig?.cloud?.host ?? DEFAULT_CLOUD_CONFIG.host,
    model: overrides?.model ?? yamlConfig?.cloud?.model ?? DEFAULT_CLOUD_CONFIG.model,
    timeout: overrides?.timeout ?? yamlConfig?.cloud?.timeout ?? DEFAULT_CLOUD_CONFIG.timeout,
    parallelSize: overrides?.parallelSize ?? yamlConfig?.cloud?.parallelSize ?? DEFAULT_CLOUD_CONFIG.parallelSize,
    apiKey,
  };
}

/**
 * 설정 정보 출력 (디버깅용)
 */
export function printOllamaConfig(type: 'local' | 'cloud', config: LocalOllamaConfig | CloudOllamaConfig): void {
  console.log(`\n📋 ${type === 'local' ? 'Local' : 'Cloud'} Ollama 설정:`);
  console.log(`  - Model: ${config.model}`);
  console.log(`  - Timeout: ${config.timeout}ms`);
  
  if (type === 'local') {
    console.log(`  - URL: ${(config as LocalOllamaConfig).url}`);
  } else {
    const cloudConfig = config as CloudOllamaConfig;
    console.log(`  - Host: ${cloudConfig.host}`);
    console.log(`  - Parallel Size: ${cloudConfig.parallelSize}`);
    console.log(`  - API Key: ${cloudConfig.apiKey ? '***설정됨***' : '없음'}`);
  }
  console.log('');
}
