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
 * Local Ollama 설정
 */
export interface LocalOllamaConfig {
  url: string;
  model: string;
  timeout?: number;
}

/**
 * Cloud Ollama 설정
 */
export interface CloudOllamaConfig {
  host: string;
  model: string;
  timeout?: number;
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
