/**
 * Food Category 정규화 테스트
 */

import db from '../db/database';
import { FoodCategoryRepository } from '../db/repositories/food-category.repository';
import { FoodCategoryNormalizedRepository } from '../db/repositories/food-category-normalized.repository';
import { FoodCategoryNormalizeService } from '../services/food-category/food-category-normalize.service';

const foodCategoryRepository = new FoodCategoryRepository();
const foodCategoryNormalizedRepository = new FoodCategoryNormalizedRepository();
const foodCategoryNormalizeService = new FoodCategoryNormalizeService();

async function main() {
  console.log('========================================');
  console.log('🧪 테스트: Food Category 정규화');
  console.log('========================================\n');

  // DB 연결
  await db.connect();

  // 1. 원본 데이터 통계 조회
  console.log('1. 원본 데이터 분석...');
  const nameGroups = await foodCategoryRepository.getNamePathGroups();
  const uniqueNames = await foodCategoryRepository.getUniqueNames();
  const duplicateNames = await foodCategoryRepository.getDuplicateNames();

  console.log(`   📊 전체 고유 메뉴명: ${nameGroups.length}개`);
  console.log(`   ✅ 중복 없는 항목: ${uniqueNames.length}개`);
  console.log(`   ⚠️  중복 있는 항목: ${duplicateNames.length}개`);

  if (duplicateNames.length > 0) {
    console.log('\n   중복 예시 (최대 5개):');
    duplicateNames.slice(0, 5).forEach((item: { name: string; paths: string[] }) => {
      console.log(`     - ${item.name}: ${item.paths.length}개 경로`);
      item.paths.forEach((p: string) => console.log(`       └ ${p}`));
    });
  }

  // 2. 정규화 실행
  console.log('\n2. 정규화 실행...');
  const initialized = await foodCategoryNormalizeService.init();
  if (!initialized) {
    console.error('❌ 서비스 초기화 실패');
    process.exit(1);
  }

  const result = await foodCategoryNormalizeService.normalize({ truncate: true });
  console.log('\n   📋 정규화 결과:');
  console.log(`     - 중복 없이 복사: ${result.uniqueCopied}개`);
  console.log(`     - LLM 병합: ${result.merged}개`);
  console.log(`     - 총 정규화: ${result.total}개`);
  console.log(`     - 성공 여부: ${result.success ? '✅' : '❌'}`);
  if (result.errors && result.errors.length > 0) {
    console.log(`     - 에러: ${result.errors.slice(0, 3).join(', ')}`);
  }

  // 3. 정규화 통계 확인
  console.log('\n3. 정규화 통계 조회...');
  const stats = await foodCategoryNormalizeService.getStats();
  console.log(`   📊 정규화 항목: ${stats.totalNormalized}개`);
  console.log(`   📊 원본 고유 메뉴: ${stats.totalOriginal}개`);
  console.log(`   📊 중복 있던 항목: ${stats.duplicateCount}개`);

  if (stats.categoryStats.length > 0) {
    console.log('\n   카테고리별 통계 (상위 10개):');
    stats.categoryStats.slice(0, 10).forEach(({ category_path, count }) => {
      console.log(`     - ${category_path}: ${count}개`);
    });
  }

  // 4. 정규화된 데이터 샘플 조회
  console.log('\n4. 정규화된 데이터 샘플...');
  const normalized = await foodCategoryNormalizedRepository.findAll();
  console.log(`   총 ${normalized.length}개 레코드\n`);

  if (normalized.length > 0) {
    console.log('   샘플 (최대 10개):');
    normalized.slice(0, 10).forEach((item) => {
      const sourceInfo = item.source_count > 1 ? ` (병합: ${item.source_count}개 경로)` : '';
      console.log(`     - ${item.name} → ${item.category_path}${sourceInfo}`);
    });
  }

  console.log('\n✅ 테스트 완료!');
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ 테스트 실패:', error);
  process.exit(1);
});
