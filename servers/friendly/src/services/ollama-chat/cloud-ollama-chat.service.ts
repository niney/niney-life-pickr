/**
 * Cloud Ollama Chat 서비스
 * ollama 라이브러리 사용 (OpenAI 호환 방식)
 */

import { Ollama } from 'ollama';
import { BaseOllamaChatService } from './base-ollama-chat.service';
import type {
  ChatMessage,
  ChatOptions,
  CloudOllamaChatConfig,
  BatchChatRequest,
  BatchChatResult,
  BatchOptions,
} from './ollama-chat.types';

export class CloudOllamaChatService extends BaseOllamaChatService {
  protected client: Ollama;

  constructor(config: CloudOllamaChatConfig) {
    super(config.model, config.timeout ?? 60000);
    this.client = new Ollama({
      host: config.host,
      headers: { Authorization: `Bearer ${config.apiKey}` },
    });
  }

  /**
   * 서버 상태 확인
   */
  async checkStatus(): Promise<boolean> {
    try {
      await this.client.list();
      console.log(`✅ Cloud Ollama 연결됨 (모델: ${this.model})`);
      return true;
    } catch {
      console.error('❌ Cloud Ollama 서버 연결 실패');
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
        throw new Error(`Chat 오류: ${error.message}`);
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
   * 배치 채팅 (병렬 처리)
   */
  async chatBatch(
    requests: BatchChatRequest[],
    options?: BatchOptions
  ): Promise<BatchChatResult[]> {
    const concurrency = options?.concurrency ?? 15;
    const results: BatchChatResult[] = [];
    let completed = 0;

    // 동시성 제어를 위한 청크 처리
    for (let i = 0; i < requests.length; i += concurrency) {
      const chunk = requests.slice(i, i + concurrency);

      const chunkResults = await Promise.all(
        chunk.map(async (req) => {
          try {
            const response = await this.chat(req.messages, req.options);
            completed++;
            options?.onProgress?.(completed, requests.length);
            return {
              id: req.id,
              success: true,
              response,
            };
          } catch (error) {
            completed++;
            options?.onProgress?.(completed, requests.length);
            return {
              id: req.id,
              success: false,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        })
      );

      results.push(...chunkResults);
    }

    return results;
  }
}
