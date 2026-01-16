/**
 * Food Category 정규화 서비스
 * food_categories 테이블의 데이터를 정규화하여 food_categories_normalized에 저장
 */

import foodCategoryRepository from '../../db/repositories/food-category.repository';
import foodCategoryNormalizedRepository from '../../db/repositories/food-category-normalized.repository';
import { CategoryMergeService } from './category-merge.service';
import type { ClassifyResponse } from './food-category.types';
import type { FoodCategoryNormalizedInput } from '../../types/db.types';

/** name/path 페어 타입 */
interface NamePath {
  name: string;
  path: string;
}

/** name/paths 그룹 타입 */
interface NamePaths {
  name: string;
  paths: string[];
}

/** name/paths/count 그룹 타입 */
interface NamePathGroup {
  name: string;
  paths: string[];
  count: number;
}

/**
 * 정규화 결과
 */
export interface NormalizeResult {
  success: boolean;
  /** 중복 없이 복사된 항목 수 */
  uniqueCopied: number;
  /** LLM 병합 후 저장된 항목 수 */
  merged: number;
  /** 원본 테이블에 업데이트된 행 수 */
  originalUpdated: number;
  /** 총 정규화된 항목 수 */
  total: number;
  /** 에러 목록 */
  errors?: string[];
}

/**
 * 정규화 옵션
 */
export interface NormalizeOptions {
  /** 진행률 콜백 */
  onProgress?: (phase: string, completed: number, total: number) => void;
}

/**
 * Food Category 정규화 서비스
 */
export class FoodCategoryNormalizeService {
  private mergeService: CategoryMergeService;

  constructor() {
    this.mergeService = new CategoryMergeService();
  }

  /**
   * 서비스 초기화
   */
  async init(): Promise<boolean> {
    try {
      await this.mergeService.init();
      console.log('✅ FoodCategoryNormalizeService 초기화 완료');
      return true;
    } catch (error) {
      console.error('❌ FoodCategoryNormalizeService 초기화 실패:', error);
      return false;
    }
  }

  /**
   * 정규화 실행
   * 1. 기존 정규화 데이터 전체 삭제
   * 2. 중복 없는 데이터 → 정규화 테이블에 직접 복사
   * 3. 중복 데이터 (같은 name, 다른 category_path) → LLM 병합 후 저장
   */
  async normalize(options?: NormalizeOptions): Promise<NormalizeResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    console.log('\n🔄 Food Category 정규화 시작...');

    // 1. 기존 정규화 데이터 전체 삭제
    const deletedCount = await foodCategoryNormalizedRepository.truncate();
    console.log(`🗑️ 기존 정규화 데이터 삭제: ${deletedCount}개`);

    // 2. 중복 없는 데이터 조회
    const uniqueNames = await foodCategoryRepository.getUniqueNames();
    console.log(`📋 중복 없는 항목: ${uniqueNames.length}개`);
    options?.onProgress?.('unique', 0, uniqueNames.length);

    // 3. 중복 없는 데이터 복사
    const uniqueInputs: FoodCategoryNormalizedInput[] = uniqueNames.map((item: NamePath) => ({
      name: item.name,
      category_path: item.path,
      source_count: 1,
    }));

    const uniqueResult = await foodCategoryNormalizedRepository.bulkInsert(uniqueInputs);
    console.log(`✅ 중복 없는 항목 복사 완료: ${uniqueResult.inserted}개 삽입`);
    options?.onProgress?.('unique', uniqueNames.length, uniqueNames.length);

    // 4. 중복 데이터 조회
    const duplicateNames = await foodCategoryRepository.getDuplicateNames();
    console.log(`📋 중복 있는 항목: ${duplicateNames.length}개`);

    if (duplicateNames.length === 0) {
      const totalTime = Date.now() - startTime;
      console.log(`🏁 정규화 완료: ${(totalTime / 1000).toFixed(2)}초`);
      
      return {
        success: true,
        uniqueCopied: uniqueResult.inserted,
        merged: 0,
        originalUpdated: 0,
        total: uniqueResult.inserted,
      };
    }

    // 5. 중복 데이터를 ClassifyResponse 형식으로 변환
    // 각 path를 별도 결과로 만들어서 merge 서비스에 전달
    const mergeInput: ClassifyResponse[] = [];
    for (const dup of duplicateNames as NamePaths[]) {
      for (const path of dup.paths) {
        // 같은 항목이 여러 결과에 나올 수 있도록 각 path별로 객체 생성
        mergeInput.push({ [dup.name]: path });
      }
    }

    console.log(`🔀 ${duplicateNames.length}개 항목 병합 시작...`);
    options?.onProgress?.('merge', 0, duplicateNames.length);

    // 6. LLM 병합 실행
    const mergeResult = await this.mergeService.mergeResults(mergeInput, {
      onProgress: (completed, total) => {
        options?.onProgress?.('merge', completed, total);
      },
    });

    if (mergeResult.errors) {
      errors.push(...mergeResult.errors);
    }

    // 7. 병합 결과 저장
    const dupList = duplicateNames as NamePaths[];
    const dupMap = new Map(dupList.map((d) => [d.name, d.paths.length]));
    const mergeInputs: FoodCategoryNormalizedInput[] = mergeResult.merged.map((cat) => ({
      name: cat.item,
      category_path: cat.path,
      source_count: dupMap.get(cat.item) ?? 1,
    }));

    const mergedResult = await foodCategoryNormalizedRepository.bulkInsert(mergeInputs);
    console.log(`✅ 병합 결과 저장 완료: ${mergedResult.inserted}개 삽입`);

    // 8. 원본 food_categories 테이블에도 병합된 category_path 업데이트
    const updateInputs = mergeResult.merged.map((cat) => ({
      name: cat.item,
      categoryPath: cat.path,
    }));
    const updatedRows = await foodCategoryRepository.bulkUpdateCategoryPathByName(updateInputs);
    console.log(`✅ 원본 테이블 업데이트 완료: ${updatedRows}개 행 업데이트`);

    const totalTime = Date.now() - startTime;
    const totalNormalized = await foodCategoryNormalizedRepository.count();
    console.log(`🏁 정규화 완료: 총 ${totalNormalized}개, ${(totalTime / 1000).toFixed(2)}초`);

    return {
      success: errors.length === 0,
      uniqueCopied: uniqueResult.inserted,
      merged: mergedResult.inserted,
      originalUpdated: updatedRows,
      total: totalNormalized,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * 정규화 통계 조회
   */
  async getStats(): Promise<{
    totalNormalized: number;
    totalOriginal: number;
    duplicateCount: number;
    categoryStats: Array<{ category_path: string; count: number }>;
  }> {
    const [totalNormalized, nameGroups, categoryStats] = await Promise.all([
      foodCategoryNormalizedRepository.count(),
      foodCategoryRepository.getNamePathGroups(),
      foodCategoryNormalizedRepository.getCategoryStats(),
    ]);

    const duplicateCount = nameGroups.filter((g: NamePathGroup) => g.count > 1).length;

    return {
      totalNormalized,
      totalOriginal: nameGroups.length,
      duplicateCount,
      categoryStats,
    };
  }
}

export default new FoodCategoryNormalizeService();
