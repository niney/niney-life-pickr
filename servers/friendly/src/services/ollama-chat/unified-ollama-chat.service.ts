/**
 * 통합 Ollama Chat 서비스
 * Cloud/Local 서비스 통합 관리 및 자동 fallback 지원
 */

import { CloudOllamaChatService } from './cloud-ollama-chat.service';
import { LocalOllamaChatService } from './local-ollama-chat.service';
import type {
  ChatMessage,
  ChatOptions,
  UnifiedOllamaChatConfig,
  BatchChatRequest,
  BatchChatResult,
  BatchOptions,
  BatchAskRequest,
} from './ollama-chat.types';

type ServiceType = 'cloud' | 'local';

/**
 * 통합 Ollama Chat 서비스
 */
export class UnifiedOllamaChatService {
  private cloudService: CloudOllamaChatService | null = null;
  private localService: LocalOllamaChatService | null = null;
  private activeService: CloudOllamaChatService | LocalOllamaChatService | null = null;
  private activeType: ServiceType | null = null;
  private prefer: ServiceType;

  constructor(config: UnifiedOllamaChatConfig) {
    this.prefer = config.prefer ?? 'cloud';

    if (config.cloud) {
      this.cloudService = new CloudOllamaChatService(config.cloud);
    }
    if (config.local) {
      this.localService = new LocalOllamaChatService(config.local);
    }

    if (!this.cloudService && !this.localService) {
      throw new Error('Cloud 또는 Local 설정 중 하나는 필요합니다');
    }
  }

  /**
   * 서비스 준비 (prefer 순서로 시도, 실패 시 fallback)
   */
  async ensureReady(): Promise<void> {
    const primary = this.prefer === 'cloud' ? this.cloudService : this.localService;
    const secondary = this.prefer === 'cloud' ? this.localService : this.cloudService;
    const primaryType = this.prefer;
    const secondaryType = this.prefer === 'cloud' ? 'local' : 'cloud';

    // 1차 시도
    if (primary) {
      const isReady = await primary.checkStatus();
      if (isReady) {
        this.activeService = primary;
        this.activeType = primaryType;
        console.log(`✅ Ollama Chat 서비스 준비 완료 [${primaryType}]`);
        return;
      }
      console.warn(`⚠️  ${primaryType} 서비스 연결 실패, fallback 시도...`);
    }

    // 2차 시도 (fallback)
    if (secondary) {
      const isReady = await secondary.checkStatus();
      if (isReady) {
        this.activeService = secondary;
        this.activeType = secondaryType;
        console.log(`✅ Ollama Chat 서비스 준비 완료 [${secondaryType}] (fallback)`);
        return;
      }
    }

    throw new Error('❌ Ollama Chat 서비스 사용 불가 (Cloud/Local 모두 실패)');
  }

  /**
   * 현재 활성화된 서비스 타입
   */
  getActiveType(): ServiceType | null {
    return this.activeType;
  }

  /**
   * Cloud 서비스로 전환
   */
  async switchToCloud(): Promise<boolean> {
    if (!this.cloudService) {
      console.error('❌ Cloud 서비스가 설정되지 않았습니다');
      return false;
    }
    const isReady = await this.cloudService.checkStatus();
    if (isReady) {
      this.activeService = this.cloudService;
      this.activeType = 'cloud';
      console.log('✅ Cloud 서비스로 전환됨');
      return true;
    }
    console.error('❌ Cloud 서비스 연결 실패');
    return false;
  }

  /**
   * Local 서비스로 전환
   */
  async switchToLocal(): Promise<boolean> {
    if (!this.localService) {
      console.error('❌ Local 서비스가 설정되지 않았습니다');
      return false;
    }
    const isReady = await this.localService.checkStatus();
    if (isReady) {
      this.activeService = this.localService;
      this.activeType = 'local';
      console.log('✅ Local 서비스로 전환됨');
      return true;
    }
    console.error('❌ Local 서비스 연결 실패');
    return false;
  }

  /**
   * 채팅 메시지 전송
   */
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    if (!this.activeService) {
      throw new Error('❌ 서비스가 초기화되지 않았습니다. ensureReady()를 먼저 호출하세요.');
    }
    return this.activeService.chat(messages, options);
  }

  /**
   * 시스템 프롬프트와 함께 단일 질문
   */
  async ask(
    systemPrompt: string,
    userMessage: string,
    options?: ChatOptions
  ): Promise<string> {
    return this.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      options
    );
  }

  /**
   * 사용 가능한 모델 목록 (활성 서비스 기준)
   */
  async listModels(): Promise<string[]> {
    if (!this.activeService) {
      return [];
    }
    return this.activeService.listModels();
  }

  /**
   * 배치 채팅 (활성 서비스에 위임)
   * - Cloud: 병렬 처리
   * - Local: 순차 처리
   * @template T - 응답 타입 (parseJson: true 시 사용)
   */
  async chatBatch<T = string>(
    requests: BatchChatRequest[],
    options?: BatchOptions
  ): Promise<BatchChatResult<T>[]> {
    if (!this.activeService) {
      throw new Error('❌ 서비스가 초기화되지 않았습니다. ensureReady()를 먼저 호출하세요.');
    }
    return this.activeService.chatBatch<T>(requests, options);
  }

  /**
   * 시스템 프롬프트와 함께 배치 Ask (활성 서비스에 위임)
   * @template T - 응답 타입 (parseJson: true 시 사용)
   */
  async askBatch<T = string>(
    systemPrompt: string,
    requests: BatchAskRequest[],
    options?: BatchOptions
  ): Promise<BatchChatResult<T>[]> {
    if (!this.activeService) {
      throw new Error('❌ 서비스가 초기화되지 않았습니다. ensureReady()를 먼저 호출하세요.');
    }
    return this.activeService.askBatch<T>(systemPrompt, requests, options);
  }
}
