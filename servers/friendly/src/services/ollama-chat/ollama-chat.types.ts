/**
 * Ollama Chat 서비스 타입 정의
 */

/**
 * 메시지 역할
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * 채팅 메시지
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

/**
 * 채팅 옵션
 */
export interface ChatOptions {
  temperature?: number;
  top_p?: number;
  num_ctx?: number;
  num_predict?: number;
  format?: 'json';
}

/**
 * Cloud Ollama Chat 설정
 */
export interface CloudOllamaChatConfig {
  host: string;
  model: string;
  apiKey: string;
  timeout?: number;
}

/**
 * Local Ollama Chat 설정
 */
export interface LocalOllamaChatConfig {
  url: string;
  model: string;
  timeout?: number;
}

/**
 * Unified Ollama Chat 설정 (Cloud + Local 통합)
 */
export interface UnifiedOllamaChatConfig {
  cloud?: CloudOllamaChatConfig;
  local?: LocalOllamaChatConfig;
  /** 우선 사용할 서비스 ('cloud' | 'local'), 기본값: 'cloud' */
  prefer?: 'cloud' | 'local';
}

/**
 * 웹 검색 결과 항목
 */
export interface WebSearchResultItem {
  title?: string;
  url?: string;
  snippet?: string;
  description?: string;
}

/**
 * 웹 검색 결과
 */
export interface WebSearchResult {
  results: WebSearchResultItem[];
}

/**
 * 웹 페치 결과
 */
export interface WebFetchResult {
  url: string;
  content: string;
  title?: string;
}
