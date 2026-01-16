/**
 * 카테고리 병합 서비스
 * 여러 LLM 요청에서 나온 다른 분류 결과를 하나로 통합
 */

import { createUnifiedChatService } from '../ollama-chat/ollama-chat.factory';
import { UnifiedOllamaChatService } from '../ollama-chat/unified-ollama-chat.service';
import {
  CATEGORY_MERGE_SYSTEM_PROMPT,
  createBatchMergePrompt,
} from './category-merge.prompts';
import type { CategoryPath, ClassifyResponse } from './food-category.types';

/**
 * 병합 결과
 */
export interface MergeResult {
  success: boolean;
  merged: CategoryPath[];
  errors?: string[];
}

/**
 * 병합 옵션
 */
export interface MergeOptions {
  /** 한 번에 처리할 항목 수 (기본: 30) */
  batchSize?: number;
  /** 진행률 콜백 */
  onProgress?: (completed: number, total: number) => void;
}

/**
 * 항목별 경로 수집 결과
 */
interface ItemPaths {
  item: string;
  paths: string[];
}

const PATH_DELIMITER = ' > ';

/**
 * 카테고리 병합 서비스
 */
export class CategoryMergeService {
  private chatService: UnifiedOllamaChatService;
  private defaultBatchSize: number;

  constructor(options?: { batchSize?: number }) {
    this.chatService = createUnifiedChatService({ prefer: 'cloud' });
    this.defaultBatchSize = options?.batchSize ?? 30;
  }

  /**
   * 서비스 초기화
   */
  async init(): Promise<boolean> {
    try {
      await this.chatService.ensureReady();
      console.log(`✅ CategoryMergeService 초기화 완료 [${this.chatService.getActiveType()}]`);
      return true;
    } catch (error) {
      console.error('❌ CategoryMergeService 초기화 실패:', error);
      return false;
    }
  }

  /**
   * 여러 LLM 응답 결과를 병합
   * 
   * @example
   * const result1 = { "감자전": "음식 > 반찬 > 전", "육전": "음식 > 반찬 > 전" };
   * const result2 = { "감자전": "음식 > 전통육류요리", "삼겹살": "음식 > 구이" };
   * await service.mergeResults([result1, result2]);
   * // → 감자전: 두 경로 병합, 육전/삼겹살: 그대로 사용
   */
  async mergeResults(
    results: ClassifyResponse[],
    options?: MergeOptions
  ): Promise<MergeResult> {
    const batchSize = options?.batchSize ?? this.defaultBatchSize;

    // 1. 항목별로 경로 수집
    const itemPathsMap = new Map<string, Set<string>>();

    for (const result of results) {
      for (const [item, path] of Object.entries(result)) {
        if (!itemPathsMap.has(item)) {
          itemPathsMap.set(item, new Set());
        }
        itemPathsMap.get(item)!.add(path);
      }
    }

    // 2. 병합 필요 여부 분류
    const noMergeNeeded: CategoryPath[] = [];
    const needsMerge: ItemPaths[] = [];

    for (const [item, pathsSet] of itemPathsMap) {
      const paths = Array.from(pathsSet);
      if (paths.length === 1) {
        // 경로가 하나뿐이면 그대로 사용
        noMergeNeeded.push(this.pathToCategory(item, paths[0]));
      } else {
        // 여러 경로가 있으면 병합 필요
        needsMerge.push({ item, paths });
      }
    }

    console.log(`  📊 병합 분류: 단일 경로 ${noMergeNeeded.length}개, 병합 필요 ${needsMerge.length}개`);

    // 3. 병합이 필요 없으면 바로 반환
    if (needsMerge.length === 0) {
      console.log(`  ✅ 병합 필요 항목 없음, 바로 완료`);
      options?.onProgress?.(noMergeNeeded.length, noMergeNeeded.length);
      return {
        success: true,
        merged: noMergeNeeded,
      };
    }

    // 4. 배치 분할 처리
    const totalBatches = Math.ceil(needsMerge.length / batchSize);
    console.log(`  🔀 ${needsMerge.length}개 항목을 ${totalBatches}개 배치로 분할 (배치당 ${batchSize}개)`);

    const allMerged: CategoryPath[] = [...noMergeNeeded];
    const errors: string[] = [];
    let completed = noMergeNeeded.length;
    let batchIndex = 0;

    for (let i = 0; i < needsMerge.length; i += batchSize) {
      const batch = needsMerge.slice(i, i + batchSize);
      batchIndex++;
      console.log(`  📦 배치 ${batchIndex}/${totalBatches} 처리 중... (${batch.length}개 항목)`);

      try {
        const startTime = Date.now();
        const batchResult = await this.mergeBatch(batch);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        allMerged.push(...batchResult.merged);
        if (batchResult.errors) {
          errors.push(...batchResult.errors);
          console.log(`  ⚠️  배치 ${batchIndex} 완료: ${batchResult.merged.length}개 병합, ${batchResult.errors.length}개 오류 (${elapsed}초)`);
        } else {
          console.log(`  ✅ 배치 ${batchIndex} 완료: ${batchResult.merged.length}개 병합 (${elapsed}초)`);
        }
      } catch (error) {
        console.error(`  ❌ 배치 ${batchIndex} 실패:`, error);
        // 배치 실패 시 첫번째 경로 사용
        batch.forEach(({ item, paths }) => {
          allMerged.push(this.pathToCategory(item, paths[0]));
          errors.push(`${item}: 병합 실패, 첫번째 경로 사용`);
        });
      }

      completed += batch.length;
      const progress = ((completed / (noMergeNeeded.length + needsMerge.length)) * 100).toFixed(1);
      console.log(`  📈 진행률: ${completed}/${noMergeNeeded.length + needsMerge.length} (${progress}%)`);
      options?.onProgress?.(completed, noMergeNeeded.length + needsMerge.length);
    }

    console.log(`  🏁 병합 완료: 총 ${allMerged.length}개, 오류 ${errors.length}개`);

    return {
      success: errors.length === 0,
      merged: allMerged,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * 배치 병합 (내부 사용)
   */
  private async mergeBatch(items: ItemPaths[]): Promise<MergeResult> {
    const userPrompt = createBatchMergePrompt(items);
    const response = await this.chatService.ask(CATEGORY_MERGE_SYSTEM_PROMPT, userPrompt);

    const parsed = this.parseResponse(response);
    const merged: CategoryPath[] = [];
    const errors: string[] = [];

    for (const { item, paths } of items) {
      const mergedPath = parsed[item];
      if (mergedPath && typeof mergedPath === 'string') {
        merged.push(this.pathToCategory(item, mergedPath));
      } else {
        // 응답 없으면 첫번째 경로 사용
        merged.push(this.pathToCategory(item, paths[0]));
        errors.push(`${item}: 응답 없음, 첫번째 경로 사용`);
      }
    }

    return {
      success: errors.length === 0,
      merged,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * 응답 파싱
   */
  private parseResponse(response: string): ClassifyResponse {
    if (typeof response === 'string') {
      const cleaned = response
        .replace(/^```(?:json)?\n?/i, '')
        .replace(/\n?```$/i, '')
        .trim();
      return JSON.parse(cleaned);
    }
    return response as ClassifyResponse;
  }

  /**
   * 경로 문자열을 CategoryPath로 변환
   */
  private pathToCategory(item: string, path: string): CategoryPath {
    return {
      item,
      path,
      levels: path.split(PATH_DELIMITER),
    };
  }
}
