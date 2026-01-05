/**
 * 음식 카테고리 분류 서비스
 * Ollama Chat을 활용한 LLM 기반 분류
 */

import { createUnifiedChatService } from '../ollama-chat/ollama-chat.factory';
import { UnifiedOllamaChatService } from '../ollama-chat/unified-ollama-chat.service';
import { FOOD_CATEGORY_SYSTEM_PROMPT, createUserPrompt } from './food-category.prompts';
import type {
  CategoryPath,
  ClassifyResult,
  ClassifyOptions,
  CategoryTreeNode,
  ClassifyResponse,
} from './food-category.types';

/**
 * 카테고리 경로 구분자
 */
const PATH_DELIMITER = ' > ';

/**
 * 음식 카테고리 분류 서비스
 */
export class FoodCategoryService {
  private chatService: UnifiedOllamaChatService;
  private defaultBatchSize: number;

  constructor(options?: { batchSize?: number }) {
    this.chatService = createUnifiedChatService({ prefer: 'cloud' });
    this.defaultBatchSize = options?.batchSize ?? 50;
  }

  /**
   * 서비스 초기화 (Ollama 연결 확인)
   */
  async init(): Promise<boolean> {
    try {
      await this.chatService.ensureReady();
      console.log(`✅ FoodCategoryService 초기화 완료 [${this.chatService.getActiveType()}]`);
      return true;
    } catch (error) {
      console.error('❌ FoodCategoryService 초기화 실패:', error);
      return false;
    }
  }

  /**
   * 단일 항목 분류
   */
  async classifySingle(item: string): Promise<CategoryPath | null> {
    const result = await this.classify([item]);
    return result.categories[0] ?? null;
  }

  /**
   * 여러 항목 분류
   */
  async classify(items: string[], options?: ClassifyOptions): Promise<ClassifyResult> {
    const batchSize = options?.batchSize ?? this.defaultBatchSize;
    const allCategories: CategoryPath[] = [];
    const errors: string[] = [];
    let completed = 0;

    // 배치 분할 처리
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      try {
        const batchResult = await this.classifyBatch(batch);
        allCategories.push(...batchResult.categories);
        if (batchResult.errors) {
          errors.push(...batchResult.errors);
        }
      } catch (error) {
        // 배치 전체 실패 시 개별 항목을 기타로 분류
        batch.forEach((item) => {
          allCategories.push(this.createFallbackCategory(item));
          errors.push(`${item}: 분류 실패`);
        });
      }

      completed += batch.length;
      options?.onProgress?.(completed, items.length);
    }

    return {
      success: errors.length === 0,
      categories: allCategories,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * 배치 분류 (내부 사용)
   */
  private async classifyBatch(items: string[]): Promise<ClassifyResult> {
    const userPrompt = createUserPrompt(items);

    const response = await this.chatService.ask(
      FOOD_CATEGORY_SYSTEM_PROMPT,
      userPrompt
    );

    // 응답 파싱 (이미 JSON이거나 문자열)
    let parsed: ClassifyResponse;
    if (typeof response === 'string') {
      // 마크다운 코드블록 제거
      const cleaned = response
        .replace(/^```(?:json)?\n?/i, '')
        .replace(/\n?```$/i, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } else {
      parsed = response as ClassifyResponse;
    }

    const categories: CategoryPath[] = [];
    const errors: string[] = [];

    // 응답 변환
    for (const item of items) {
      const path = parsed[item];
      if (path && typeof path === 'string') {
        categories.push(this.pathToCategory(item, path));
      } else {
        // 응답에 없는 항목은 기타로 분류
        categories.push(this.createFallbackCategory(item));
        errors.push(`${item}: 응답 없음`);
      }
    }

    return {
      success: errors.length === 0,
      categories,
      errors: errors.length > 0 ? errors : undefined,
    };
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

  /**
   * 분류 실패 시 기본 카테고리 생성
   */
  private createFallbackCategory(item: string): CategoryPath {
    return {
      item,
      path: '음식 > 기타',
      levels: ['음식', '기타'],
    };
  }

  /**
   * 분류 결과를 트리 구조로 변환
   */
  buildTree(categories: CategoryPath[]): CategoryTreeNode {
    const root: CategoryTreeNode = {
      name: '음식',
      children: new Map(),
      items: [],
    };

    for (const category of categories) {
      let current = root;

      // 첫 번째 레벨(음식)은 스킵
      for (let i = 1; i < category.levels.length; i++) {
        const levelName = category.levels[i];

        if (!current.children.has(levelName)) {
          current.children.set(levelName, {
            name: levelName,
            children: new Map(),
            items: [],
          });
        }

        current = current.children.get(levelName)!;
      }

      // 리프 노드에 항목 추가
      current.items.push(category.item);
    }

    return root;
  }

  /**
   * 트리를 보기 좋게 출력
   */
  printTree(node: CategoryTreeNode, indent: string = ''): void {
    console.log(`${indent}📂 ${node.name}`);

    // 하위 카테고리 출력
    for (const [, child] of node.children) {
      this.printTree(child, indent + '  ');
    }

    // 항목 출력
    for (const item of node.items) {
      console.log(`${indent}  📄 ${item}`);
    }
  }

  /**
   * 트리를 JSON으로 변환 (Map → Object)
   */
  treeToJson(node: CategoryTreeNode): object {
    const children: Record<string, object> = {};
    for (const [key, child] of node.children) {
      children[key] = this.treeToJson(child);
    }

    return {
      name: node.name,
      children,
      items: node.items,
    };
  }
}
