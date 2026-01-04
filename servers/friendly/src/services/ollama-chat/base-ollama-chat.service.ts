/**
 * Ollama Chat 서비스 추상 클래스
 */

import type { ChatMessage, ChatOptions } from './ollama-chat.types';

export abstract class BaseOllamaChatService {
  protected model: string;
  protected timeout: number;

  constructor(model: string, timeout: number = 60000) {
    this.model = model;
    this.timeout = timeout;
  }

  /**
   * 서버 상태 확인
   */
  abstract checkStatus(): Promise<boolean>;

  /**
   * 채팅 메시지 전송
   */
  abstract chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;

  /**
   * JSON 응답 파싱
   */
  protected parseJsonResponse<T>(response: string): T | null {
    if (!response || response.trim() === '') {
      return null;
    }

    try {
      // 마크다운 코드 블록 제거
      let clean = response.trim();
      if (clean.startsWith('```')) {
        clean = clean.replace(/^```(json)?\s*/gi, '').replace(/```\s*$/gi, '').trim();
      }
      return JSON.parse(clean) as T;
    } catch {
      // 중첩 JSON 찾기
      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]) as T;
        } catch {
          return null;
        }
      }
      return null;
    }
  }
}
