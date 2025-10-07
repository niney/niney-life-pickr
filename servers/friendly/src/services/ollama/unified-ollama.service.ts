/**
 * 통합 Ollama 서비스
 * Cloud 우선 시도 → 실패 시 Local로 자동 fallback
 * 병렬 처리 기본 지원 (Local은 순차 처리로 변환)
 */

import { BaseLocalOllamaService } from './local-ollama.service';
import { BaseCloudOllamaService } from './cloud-ollama.service';
import { createLocalConfig, createCloudConfig } from './ollama.config';
import type { GenerateOptions, LocalOllamaConfig, CloudOllamaConfig } from './ollama.types';

/**
 * 기본 Local Ollama 구현체 (상속만)
 */
class DefaultLocalOllamaService extends BaseLocalOllamaService {
  // 상속만 받음 (추가 기능 없음)
}

/**
 * 기본 Cloud Ollama 구현체 (상속만)
 */
class DefaultCloudOllamaService extends BaseCloudOllamaService {
  // 상속만 받음 (추가 기능 없음)
}

/**
 * 통합 Ollama 서비스 클래스
 * - Cloud 사용 가능하면 Cloud (병렬 처리)
 * - Cloud 실패 시 Local로 fallback (순차 처리)
 * - 사용하는 쪽은 프롬프트만 만들면 됨
 * - 기본 구현 제공 (커스터마이징 필요 시 오버라이드)
 */
export class UnifiedOllamaService {
  private cloudService: BaseCloudOllamaService | null = null;
  private localService: BaseLocalOllamaService | null = null;
  private useCloud: boolean;
  private isCloudAvailable: boolean = false;

  /**
   * @param useCloud - Cloud 사용 시도 여부 (기본: false)
   */
  constructor(useCloud: boolean = false) {
    this.useCloud = useCloud;
    this.initialize();
  }

  /**
   * Cloud/Local 서비스 초기화
   */
  private initialize() {
    if (this.useCloud) {
      const cloudConfig = createCloudConfig();
      if (cloudConfig) {
        this.cloudService = this.createCloudService(cloudConfig);
        console.log('🌥️  Cloud Ollama 서비스 초기화 시도');
      } else {
        console.warn('⚠️  Cloud 설정 없음, Local로 대체');
      }
    }

    // Local은 항상 fallback으로 준비
    const localConfig = createLocalConfig();
    this.localService = this.createLocalService(localConfig);
  }

  /**
   * Cloud 서비스 생성 (기본 구현, 필요 시 오버라이드)
   */
  protected createCloudService(config: CloudOllamaConfig): BaseCloudOllamaService {
    return new DefaultCloudOllamaService(config);
  }

  /**
   * Local 서비스 생성 (기본 구현, 필요 시 오버라이드)
   */
  protected createLocalService(config: LocalOllamaConfig): BaseLocalOllamaService {
    return new DefaultLocalOllamaService(config);
  }

  /**
   * 서비스 상태 확인 및 준비
   */
  async ensureReady(): Promise<void> {
    // Cloud 시도
    if (this.cloudService) {
      this.isCloudAvailable = await this.cloudService.checkStatus();
      if (this.isCloudAvailable) {
        console.log('✅ Cloud Ollama 사용 준비 완료');
        return;
      }
      console.warn('⚠️  Cloud Ollama 사용 불가, Local로 전환');
    }

    // Local fallback
    if (this.localService) {
      const isLocalReady = await this.localService.checkStatus();
      if (isLocalReady) {
        console.log('✅ Local Ollama 사용 준비 완료');
        return;
      }
      throw new Error('❌ Ollama 서비스를 사용할 수 없습니다 (Cloud/Local 모두 실패)');
    }

    throw new Error('❌ Ollama 서비스가 초기화되지 않았습니다');
  }

  /**
   * 단일 프롬프트 처리
   * - Cloud 가능하면 Cloud
   * - Cloud 실패하면 Local
   */
  async generateSingle(prompt: string, options?: GenerateOptions): Promise<string> {
    // Cloud 시도
    if (this.isCloudAvailable && this.cloudService) {
      try {
        return await this.cloudService.generate(prompt, options);
      } catch (error) {
        console.warn('⚠️  Cloud 요청 실패, Local로 재시도:', error instanceof Error ? error.message : error);
        this.isCloudAvailable = false; // Cloud 비활성화
      }
    }

    // Local fallback
    if (this.localService) {
      return await this.localService.generate(prompt, options);
    }

    throw new Error('❌ 사용 가능한 Ollama 서비스가 없습니다');
  }

  /**
   * 병렬 프롬프트 처리 (기본 메서드)
   * - Cloud: 진짜 병렬 처리 (generateBatch)
   * - Local: 순차 처리로 변환 (단일 generate 반복)
   * 
   * @param prompts - 프롬프트 배열
   * @param options - 생성 옵션
   * @returns 응답 배열 (prompts와 같은 순서)
   */
  async generateBatch(prompts: string[], options?: GenerateOptions): Promise<string[]> {
    if (prompts.length === 0) {
      return [];
    }

    console.log(`🔄 ${prompts.length}개 프롬프트 처리 시작...`);
    const startTime = Date.now();

    let results: string[];

    // Cloud: 병렬 처리
    if (this.isCloudAvailable && this.cloudService) {
      try {
        console.log('🌥️  Cloud 병렬 처리 모드');
        results = await this.cloudService.generateBatch(prompts, options);
      } catch (error) {
        console.warn('⚠️  Cloud 병렬 처리 실패, Local 순차 처리로 전환:', error instanceof Error ? error.message : error);
        this.isCloudAvailable = false;
        results = await this.generateBatchLocal(prompts, options);
      }
    } 
    // Local: 순차 처리
    else if (this.localService) {
      console.log('💻 Local 순차 처리 모드 (병렬 불가)');
      results = await this.generateBatchLocal(prompts, options);
    } else {
      throw new Error('❌ 사용 가능한 Ollama 서비스가 없습니다');
    }

    const elapsed = Date.now() - startTime;
    console.log(`✅ 배치 처리 완료 (${(elapsed / 1000).toFixed(2)}초, ${(elapsed / prompts.length).toFixed(0)}ms/개)`);

    return results;
  }

  /**
   * Local에서 순차 처리 (병렬 불가하므로)
   */
  private async generateBatchLocal(prompts: string[], options?: GenerateOptions): Promise<string[]> {
    if (!this.localService) {
      throw new Error('❌ Local Ollama 서비스가 없습니다');
    }

    const results: string[] = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < prompts.length; i++) {
      try {
        console.log(`  [${i + 1}/${prompts.length}] 처리 중...`);
        const result = await this.localService.generate(prompts[i], options);
        results.push(result);
        successCount++;
      } catch (error) {
        console.error(`  ❌ [${i + 1}/${prompts.length}] 실패:`, error instanceof Error ? error.message : error);
        results.push(''); // 빈 응답으로 처리
        failCount++;
      }
    }

    console.log(`  ✅ 성공: ${successCount}, ❌ 실패: ${failCount}`);
    return results;
  }

  /**
   * 현재 사용 중인 서비스 타입 확인
   */
  getCurrentServiceType(): 'cloud' | 'local' | 'none' {
    if (this.isCloudAvailable && this.cloudService) {
      return 'cloud';
    }
    if (this.localService) {
      return 'local';
    }
    return 'none';
  }

  /**
   * JSON 응답 파싱 (공통 유틸리티)
   */
  protected parseJsonResponse<T>(response: string): T | null {
    if (!response || response.trim() === '') {
      console.warn('⚠️  빈 응답 받음');
      return null;
    }

    try {
      // 마크다운 코드 블록 제거
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json') || cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse
          .replace(/^```(json)?\s*/gi, '')
          .replace(/```\s*$/gi, '')
          .trim();
      }

      // JSON 파싱 시도
      try {
        return JSON.parse(cleanResponse) as T;
      } catch (firstError) {
        // 중첩된 JSON 문자열 처리
        try {
          const unescaped = JSON.parse(cleanResponse) as string;
          if (typeof unescaped === 'string') {
            return JSON.parse(unescaped) as T;
          }
        } catch {
          // 중첩 처리 실패, 첫 번째 에러 throw
        }
        throw firstError;
      }
    } catch (error) {
      console.error('❌ JSON 파싱 실패:', error instanceof Error ? error.message : error);
      console.error('   원본 응답:', response.substring(0, 200));
      return null;
    }
  }
}
