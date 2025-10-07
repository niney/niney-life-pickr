/**
 * Ollama 서비스 최상위 추상 클래스
 * Local과 Cloud 공통 기능 제공
 */

import type { GenerateOptions } from './ollama.types';

export abstract class BaseOllamaService {
  protected model: string;
  protected timeout: number;

  constructor(model: string, timeout: number = 60000) {
    this.model = model;
    this.timeout = timeout;
  }

  /**
   * Ollama 서버 상태 확인 (각 구현체에서 구현)
   */
  abstract checkStatus(): Promise<boolean>;

  /**
   * 프롬프트 생성 (각 구현체에서 구현)
   */
  abstract generate(prompt: string, options?: GenerateOptions): Promise<string>;

  /**
   * JSON 응답에서 마크다운 코드 블록 제거
   */
  protected cleanJsonResponse(response: string): string {
    let cleanResponse = response.trim();
    
    if (cleanResponse.startsWith('```json') || cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse
        .replace(/^```(json)?\s*/gi, '')
        .replace(/```\s*$/gi, '')
        .trim();
    }
    
    return cleanResponse;
  }

  /**
   * JSON 응답 파싱 (중첩 JSON 처리 포함)
   */
  protected parseJsonResponse<T>(response: string): T | null {
    if (!response || response.trim() === '') {
      console.warn('⚠️  빈 응답 받음');
      return null;
    }

    try {
      const cleanResponse = this.cleanJsonResponse(response);
      return JSON.parse(cleanResponse) as T;
    } catch (error) {
      console.warn('⚠️  JSON 파싱 실패, 중첩 JSON 검색 시도');

      // 중첩된 JSON 객체 찾기
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]) as T;
        } catch {
          console.error('❌ 중첩 JSON 파싱 실패');
        }
      }

      return null;
    }
  }
}
