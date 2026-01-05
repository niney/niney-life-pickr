/**
 * Local Ollama Chat 서비스
 * 로컬 Ollama 서버와 통신 (ollama 라이브러리 사용)
 */

import { Ollama } from 'ollama';
import { BaseOllamaChatService } from './base-ollama-chat.service';
import type {
  ChatMessage,
  ChatOptions,
  LocalOllamaChatConfig,
  BatchChatRequest,
  BatchChatResult,
  BatchOptions,
} from './ollama-chat.types';

export class LocalOllamaChatService extends BaseOllamaChatService {
  private client: Ollama;

  constructor(config: LocalOllamaChatConfig) {
    super(config.model, config.timeout ?? 60000);
    this.client = new Ollama({
      host: config.url,
    });
  }

  /**
   * 서버 상태 확인 (연결 가능 여부만 확인)
   */
  async checkStatus(): Promise<boolean> {
    try {
      await this.client.list();
      console.log(`✅ Local Ollama 연결됨 (모델: ${this.model})`);
      return true;
    } catch {
      console.error('❌ Local Ollama 서버 연결 실패');
      console.error('💡 Ollama가 실행 중인지 확인하세요: ollama serve');
      return false;
    }
  }

  /**
   * 채팅 메시지 전송
   */
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    try {
      const response = await this.client.chat({
        model: this.model,
        messages,
        stream: false,
        format: options?.format,
        options: {
          temperature: options?.temperature,
          top_p: options?.top_p,
          num_ctx: options?.num_ctx ?? 2048,
          num_predict: options?.num_predict,
        },
      });

      return response.message?.content || '';
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Local Chat 오류: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 사용 가능한 모델 목록 조회
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.list();
      return response.models?.map((m) => m.name) || [];
    } catch {
      return [];
    }
  }

  /**
   * 배치 채팅 (순차 처리)
   */
  async chatBatch(
    requests: BatchChatRequest[],
    options?: BatchOptions
  ): Promise<BatchChatResult[]> {
    const results: BatchChatResult[] = [];

    for (let i = 0; i < requests.length; i++) {
      const req = requests[i];
      try {
        const response = await this.chat(req.messages, req.options);
        results.push({
          id: req.id,
          success: true,
          response,
        });
      } catch (error) {
        results.push({
          id: req.id,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      options?.onProgress?.(i + 1, requests.length);
    }

    return results;
  }
}
