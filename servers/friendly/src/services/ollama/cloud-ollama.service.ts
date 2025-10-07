/**
 * Cloud Ollama 서비스 추상 클래스
 * 외부 Cloud Ollama API와 통신 (병렬 처리 지원, fetch 사용)
 */

import { BaseOllamaService } from './base-ollama.service';
import type { CloudOllamaConfig, GenerateOptions } from './ollama.types';

export abstract class BaseCloudOllamaService extends BaseOllamaService {
  protected host: string;
  protected apiKey: string;
  protected parallelSize: number;

  constructor(config: CloudOllamaConfig) {
    super(config.model, config.timeout);
    this.host = config.host;
    this.apiKey = config.apiKey!; // createCloudConfig에서 검증됨
    this.parallelSize = config.parallelSize ?? 3;
  }

  /**
   * Cloud Ollama 서버 상태 확인
   */
  async checkStatus(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(this.host, {
        headers: this.getHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log('✅ Cloud Ollama 서버 연결됨');
        return true;
      }

      console.error(`❌ Cloud Ollama 서버 응답 오류: ${response.status}`);
      return false;

    } catch (error) {
      console.error('❌ Cloud Ollama 서버 연결 실패:', this.host);
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

      const response = await fetch(`${this.host}/api/generate`, {
        method: 'POST',
        headers: this.getHeaders(),
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
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Cloud Ollama API 오류: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.response || '';

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`요청 시간 초과 (${this.timeout / 1000}초)`);
      }
      throw new Error(`Cloud Ollama 생성 오류: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 병렬로 여러 프롬프트 처리
   * 
   * @param prompts - 처리할 프롬프트 배열
   * @param options - 생성 옵션
   * @param parallelSize - 동시 처리 크기 (기본값: 생성자에서 설정한 값)
   * @returns 생성된 응답 배열 (실패 시 빈 문자열)
   */
  async generateBatch(
    prompts: string[],
    options?: GenerateOptions,
    parallelSize?: number
  ): Promise<string[]> {
    const batchSize = parallelSize ?? this.parallelSize;
    const results: string[] = [];
    const totalPrompts = prompts.length;

    console.log(`\n🚀 Cloud 병렬 처리 시작`);
    console.log(`   총 요청: ${totalPrompts}개`);
    console.log(`   동시 처리: ${batchSize}개`);
    console.log(`   모델: ${this.model}\n`);

    const startTime = Date.now();

    // 배치 단위로 처리
    for (let i = 0; i < totalPrompts; i += batchSize) {
      const batch = prompts.slice(i, Math.min(i + batchSize, totalPrompts));
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(totalPrompts / batchSize);
      const batchStart = Date.now();

      console.log(`[배치 ${batchNumber}/${totalBatches}] ${batch.length}개 요청 병렬 처리 중...`);

      // 병렬로 API 호출
      const batchPromises = batch.map(prompt => this.generate(prompt, options));
      const batchSettledResults = await Promise.allSettled(batchPromises);

      // 결과 처리
      let successCount = 0;
      for (const result of batchSettledResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          successCount++;
        } else {
          console.error(`  ⚠️ 요청 실패:`, result.reason?.message || result.reason);
          results.push('');
        }
      }

      const batchTime = Date.now() - batchStart;
      console.log(`  ✅ 배치 완료: ${(batchTime / 1000).toFixed(2)}초 (${successCount}/${batch.length} 성공)`);
    }

    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / totalPrompts;
    const successCount = results.filter(r => r !== '').length;

    console.log(`\n✅ Cloud 병렬 처리 완료!`);
    console.log(`   총 요청 수: ${totalPrompts}개`);
    console.log(`   성공: ${successCount}개, 실패: ${totalPrompts - successCount}개`);
    console.log(`   총 소요 시간: ${(totalTime / 1000).toFixed(2)}초`);
    console.log(`   평균 처리 시간: ${(avgTime / 1000).toFixed(2)}초/요청`);
    console.log(`   병렬 효율성: ${((avgTime * totalPrompts) / totalTime).toFixed(1)}x\n`);

    return results;
  }

  /**
   * HTTP 헤더 생성
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }
}
