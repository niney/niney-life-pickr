/**
 * Local Ollama 서비스 추상 클래스
 * 로컬에서 실행 중인 Ollama 서버와 통신 (fetch 사용)
 */

import { BaseOllamaService } from './base-ollama.service';
import type { LocalOllamaConfig, GenerateOptions } from './ollama.types';

export abstract class BaseLocalOllamaService extends BaseOllamaService {
  protected ollamaUrl: string;

  constructor(config: LocalOllamaConfig) {
    super(config.model, config.timeout);
    this.ollamaUrl = config.url;
  }

  /**
   * Ollama 서버 연결 및 모델 확인
   */
  async checkStatus(): Promise<boolean> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/tags`);

      if (response.ok) {
        const data = await response.json();
        const availableModels = data.models?.map((model: any) => model.name) || [];

        console.log('✅ Local Ollama 서버 연결됨');
        console.log('📦 사용 가능한 모델:', availableModels);

        if (!availableModels.includes(this.model)) {
          console.warn(`⚠️  ${this.model} 모델이 설치되지 않았습니다.`);
          console.warn(`💡 설치 명령어: ollama pull ${this.model}`);
          return false;
        }

        console.log(`✅ ${this.model} 모델 사용 가능`);
        return true;
      }

      console.error(`❌ Ollama 서버 응답 오류: ${response.status}`);
      return false;

    } catch (error) {
      console.error('❌ Local Ollama 서버에 연결할 수 없습니다:', this.ollamaUrl);
      console.error('💡 Ollama가 실행 중인지 확인하세요: ollama serve');
      if (error instanceof Error) {
        console.error('   상세:', error.message);
      }
      return false;
    }
  }

  /**
   * 프롬프트 생성
   */
  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          format: 'json',
          options: {
            temperature: options?.temperature,
            top_p: options?.top_p,
            num_ctx: options?.num_ctx ?? 2048,
            num_predict: options?.num_predict,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Local Ollama API 오류: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.response || '';

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`요청 시간 초과 (${this.timeout / 1000}초)`);
      }
      throw new Error(`Local Ollama 생성 오류: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
