/**
 * Cloud Ollama Chat 서비스
 * ollama 라이브러리 사용 (OpenAI 호환 방식)
 */

import { Ollama } from 'ollama';
import { BaseOllamaChatService } from './base-ollama-chat.service';
import { globalCloudOllamaMutex } from '../ollama/mutex';
import type {
  ChatMessage,
  ChatOptions,
  CloudOllamaChatConfig,
  BatchChatRequest,
  BatchChatResult,
  BatchOptions,
  BatchAskRequest,
} from './ollama-chat.types';

export class CloudOllamaChatService extends BaseOllamaChatService {
  protected client: Ollama;
  protected parallelSize: number;

  constructor(config: CloudOllamaChatConfig) {
    super(config.model, config.timeout ?? 60000);
    this.client = new Ollama({
      host: config.host,
      headers: { Authorization: `Bearer ${config.apiKey}` },
    });
    this.parallelSize = config.parallelSize ?? 15;
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
    // format 기본값: 'json' ('text' 명시 시 텍스트 응답)
    const format = options?.format === 'text' ? undefined : 'json';

    try {
      const response = await this.client.chat({
        model: this.model,
        messages,
        stream: false,
        format,
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
   * 
   * ⚠️ 배치 단위로 전역 뮤텍스를 사용하여 공평한 실행 보장
   * - 각 배치마다 락을 획득/해제하여 여러 요청이 번갈아가며 처리
   * - 배치 내에서는 병렬 실행 (concurrency만큼 동시 처리)
   * - API rate limit 준수 및 리소스 과부하 방지
   * 
   * @template T - 응답 타입 (parseJson: true 시 사용)
   */
  async chatBatch<T = string>(
    requests: BatchChatRequest[],
    options?: BatchOptions
  ): Promise<BatchChatResult<T>[]> {
    const concurrency = options?.concurrency ?? this.parallelSize;
    const results: BatchChatResult<T>[] = [];
    let completed = 0;
    const totalBatches = Math.ceil(requests.length / concurrency);

    // 배치 단위로 처리 (각 배치마다 락 획득/해제)
    for (let i = 0; i < requests.length; i += concurrency) {
      const chunk = requests.slice(i, i + concurrency);
      const batchNumber = Math.floor(i / concurrency) + 1;

      // 배치 시작 전 뮤텍스 대기 상태 확인
      if (globalCloudOllamaMutex.isLocked()) {
        const queueLength = globalCloudOllamaMutex.getQueueLength();
        console.log(`[배치 ${batchNumber}/${totalBatches}] ⏳ 다른 배치 대기 중... (대기 순번: ${queueLength + 1})`);
      }

      // 배치 단위로 뮤텍스 획득
      await globalCloudOllamaMutex.acquire();

      try {
        const chunkResults = await Promise.all(
          chunk.map(async (req) => {
            try {
              const rawResponse = await this.chat(req.messages, req.options);
              completed++;
              options?.onProgress?.(completed, requests.length);

              // JSON 파싱 옵션 (기본: true)
              const shouldParse = options?.parseJson !== false;
              const response = shouldParse
                ? this.parseJsonResponse<T>(rawResponse) ?? (rawResponse as unknown as T)
                : (rawResponse as unknown as T);

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
      } finally {
        // 배치 완료 후 뮤텍스 해제 (다른 요청의 배치가 실행될 수 있음)
        globalCloudOllamaMutex.release();
      }
    }

    return results;
  }

  /**
   * 시스템 프롬프트와 함께 배치 Ask (병렬 처리)
   * 
   * @template T - 응답 타입 (parseJson: true 시 사용)
   * @param systemPrompt - 공통 시스템 프롬프트
   * @param requests - 사용자 메시지 배열 (id, userMessage)
   * @param options - 배치 옵션
   */
  async askBatch<T = string>(
    systemPrompt: string,
    requests: BatchAskRequest[],
    options?: BatchOptions
  ): Promise<BatchChatResult<T>[]> {
    // BatchAskRequest를 BatchChatRequest로 변환
    const chatRequests: BatchChatRequest[] = requests.map((req) => ({
      id: req.id,
      messages: [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: req.userMessage },
      ],
      options: req.options,
    }));

    return this.chatBatch<T>(chatRequests, options);
  }
}
