/**
 * Ollama 서비스 타입 정의
 */

/**
 * 공통 생성 옵션
 */
export interface GenerateOptions {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  num_ctx?: number;
  num_predict?: number;
}

/**
 * 기본 Ollama 설정 (공통 부분)
 */
export interface BaseOllamaConfig {
  model: string;
  timeout?: number;
}

/**
 * Local Ollama 설정
 */
export interface LocalOllamaConfig extends BaseOllamaConfig {
  url: string;
}

/**
 * Cloud Ollama 설정
 */
export interface CloudOllamaConfig extends BaseOllamaConfig {
  host: string;
  parallelSize?: number;
  apiKey?: string;
}

/**
 * base.yml에서 로드되는 전체 Ollama 설정
 */
export interface OllamaYamlConfig {
  local: {
    url: string;
    model: string;
    timeout: number;
  };
  cloud: {
    host: string;
    model: string;
    timeout: number;
    parallelSize: number;
    apiKey: string;
  };
}
