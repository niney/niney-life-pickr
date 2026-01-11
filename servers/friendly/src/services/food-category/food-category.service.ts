/**
 * 음식 카테고리 분류 서비스
 * Ollama Chat을 활용한 LLM 기반 분류
 */

import { createUnifiedChatService } from '../ollama-chat/ollama-chat.factory';
import { UnifiedOllamaChatService } from '../ollama-chat/unified-ollama-chat.service';
import { FOOD_CATEGORY_SYSTEM_PROMPT, createUserPrompt } from './food-category.prompts';
import foodCategoryRepository from '../../db/repositories/food-category.repository';
import type {
  CategoryPath,
  ClassifyResult,
  ClassifyOptions,
  CategoryTreeNode,
  ClassifyResponse,
  ClassifyAndSaveResult,
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
  private modelName: string | undefined;
  private preferType: 'cloud' | 'local';

  /** Cloud 기본 모델 */
  private static readonly DEFAULT_CLOUD_MODEL = 'gpt-oss:120b-cloud';

  constructor(options?: { batchSize?: number; model?: string; prefer?: 'cloud' | 'local' }) {
    this.preferType = options?.prefer ?? 'cloud';
    
    // model 미지정 시: cloud는 기본 모델, local은 config 기본값
    const cloudOverride = { model: options?.model ?? FoodCategoryService.DEFAULT_CLOUD_MODEL };
    const localOverride = options?.model ? { model: options.model } : undefined;
    
    this.chatService = createUnifiedChatService({
      prefer: this.preferType,
      cloudOverrides: cloudOverride,
      localOverrides: localOverride,
    });
    this.defaultBatchSize = options?.batchSize ?? 20;
    this.modelName = options?.model ?? (this.preferType === 'cloud' ? FoodCategoryService.DEFAULT_CLOUD_MODEL : undefined);
  }

  /**
   * 서비스 초기화 (Ollama 연결 확인)
   */
  async init(): Promise<boolean> {
    try {
      await this.chatService.ensureReady();
      const modelInfo = this.modelName ? `, model: ${this.modelName}` : '';
      console.log(`✅ FoodCategoryService 초기화 완료 [${this.chatService.getActiveType()}${modelInfo}]`);
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
   * 여러 항목 분류 (병렬 배치 처리)
   */
  async classify(items: string[], options?: ClassifyOptions): Promise<ClassifyResult> {
    const batchSize = options?.batchSize ?? this.defaultBatchSize;
    const startTime = Date.now();
    
    console.log(`🔄 분류 시작: ${items.length}개 항목, 배치 크기=${batchSize}`);
    
    // 배치 분할
    const batches: string[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    console.log(`📦 ${batches.length}개 배치로 분할됨`);
    batches.forEach((batch, idx) => {
      const preview = batch.length <= 5 
        ? batch.join(', ')
        : `${batch.slice(0, 3).join(', ')} ... ${batch.slice(-2).join(', ')}`;
      console.log(`   배치[${idx}] (${batch.length}개): ${preview}`);
    });

    // 각 배치를 askBatch 요청으로 변환
    const batchRequests = batches.map((batch, idx) => ({
      id: `batch-${idx}`,
      userMessage: createUserPrompt(batch),
      options: { format: 'json' as const },
    }));

    // 병렬 배치 처리
    console.log(`🚀 ${batchRequests.length}개 배치 병렬 요청 시작...`);
    let completed = 0;
    const batchResults = await this.chatService.askBatch<ClassifyResponse>(
      FOOD_CATEGORY_SYSTEM_PROMPT,
      batchRequests,
      {
        parseJson: true,
        onProgress: (done, _total) => {
          // 배치 단위 진행률을 항목 단위로 변환
          const batchIdx = done - 1;
          if (batchIdx >= 0 && batchIdx < batches.length) {
            completed += batches[batchIdx].length;
            options?.onProgress?.(completed, items.length);
          }
        },
      }
    );

    const llmTime = Date.now() - startTime;
    console.log(`✅ LLM 병렬 처리 완료: ${(llmTime / 1000).toFixed(2)}초`);

    // 결과 변환
    const allCategories: CategoryPath[] = [];
    const errors: string[] = [];

    batchResults.forEach((result, idx) => {
      const batch = batches[idx];
      
      if (result.success && result.response) {
        const parsed = result.response;
        for (const item of batch) {
          const path = parsed[item];
          if (path && typeof path === 'string') {
            allCategories.push(this.pathToCategory(item, path));
          } else {
            allCategories.push(this.createFallbackCategory(item));
            errors.push(`${item}: 응답 없음`);
          }
        }
      } else {
        // 배치 실패 시 기타로 분류
        batch.forEach((item) => {
          allCategories.push(this.createFallbackCategory(item));
          errors.push(`${item}: ${result.error || '분류 실패'}`);
        });
      }
    });

    const totalTime = Date.now() - startTime;
    const successCount = allCategories.length - errors.length;
    console.log(`🏁 분류 완료: 성공=${successCount}, 실패=${errors.length}, 총 ${(totalTime / 1000).toFixed(2)}초`);
    if (errors.length > 0) {
      console.warn(`⚠️ 분류 실패 항목: ${errors.slice(0, 5).join(', ')}${errors.length > 5 ? ` 외 ${errors.length - 5}개` : ''}`);
    }

    return {
      success: errors.length === 0,
      categories: allCategories,
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

  /**
   * 분류 후 DB 저장 (중복 허용)
   */
  async classifyAndSave(
    restaurantId: number,
    items: string[],
    options?: ClassifyOptions
  ): Promise<ClassifyAndSaveResult> {
    console.log(`\n📝 classifyAndSave 시작: 레스토랑=${restaurantId}, 항목=${items.length}개`);
    
    // 1. LLM으로 분류
    const classifyResult = await this.classify(items, options);

    // 2. DB 저장용 데이터 변환
    const inputs = classifyResult.categories.map((cat) => ({
      restaurant_id: restaurantId,
      name: cat.item,
      category_path: cat.path,
    }));

    // 3. DB 저장 (중복 허용)
    const dbStats = await foodCategoryRepository.bulkInsert(inputs);
    console.log(`💾 DB 저장 완료: ${dbStats.inserted}개 삽입`);

    return {
      success: classifyResult.success,
      categories: classifyResult.categories,
      dbStats,
      errors: classifyResult.errors,
    };
  }

  /**
   * 레스토랑의 저장된 카테고리 조회
   */
  async getSavedCategories(restaurantId: number): Promise<CategoryPath[]> {
    const rows = await foodCategoryRepository.findByRestaurantId(restaurantId);
    return rows.map((row) => ({
      item: row.name,
      path: row.category_path,
      levels: row.category_path.split(PATH_DELIMITER),
    }));
  }

  /**
   * 카테고리 통계 조회
   */
  async getCategoryStats(): Promise<Array<{ category_path: string; count: number }>> {
    return foodCategoryRepository.getCategoryStats();
  }
}
