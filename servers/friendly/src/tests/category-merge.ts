/**
 * 카테고리 병합 서비스 테스트
 */

import { CategoryMergeService } from '../services/food-category';

async function testCategoryMerge() {
  console.log('\n========================================');
  console.log('🧪 테스트: 카테고리 병합 서비스');
  console.log('========================================\n');

  const service = new CategoryMergeService();

  // 1. 초기화
  console.log('1. 서비스 초기화...');
  const isReady = await service.init();
  if (!isReady) {
    console.log('   ❌ 서비스 초기화 실패, 테스트 종료\n');
    return;
  }
  console.log('');

  // 2. 여러 LLM 응답 병합 (mergeResults)
  console.log('2. 여러 LLM 응답 병합 (mergeResults)...');
  
  const llmResult1 = {
    '감자전': '음식 > 반찬 > 전',
    '육전': '음식 > 반찬 > 전',
    '배추김치': '음식 > 반찬 > 김치',
  };

  const llmResult2 = {
    '감자전': '음식 > 반찬 > 전통육류요리',
    '육전': '음식 > 반찬 > 전',
    '삼겹살': '음식 > 구이',
  };

  console.log('   📥 첫번째 LLM 응답:');
  console.log(`      ${JSON.stringify(llmResult1, null, 2).replace(/\n/g, '\n      ')}`);
  console.log('   📥 두번째 LLM 응답:');
  console.log(`      ${JSON.stringify(llmResult2, null, 2).replace(/\n/g, '\n      ')}`);
  console.log('');

  const startTime = Date.now();
  const result = await service.mergeResults([llmResult1, llmResult2], {
    onProgress: (done, total) => console.log(`   📊 진행: ${done}/${total}`),
  });
  const elapsed = Date.now() - startTime;

  console.log(`\n   ⏱️  소요 시간: ${(elapsed / 1000).toFixed(2)}초`);
  console.log(`   ✅ 성공: ${result.success}`);
  console.log('\n   📋 병합 결과:');
  result.merged.forEach((cat) => {
    console.log(`      ${cat.item} → ${cat.path}`);
  });

  if (result.errors && result.errors.length > 0) {
    console.log('\n   ⚠️  오류:');
    result.errors.forEach((err) => console.log(`      - ${err}`));
  }
  console.log('');

  console.log('✅ 병합 테스트 완료!\n');
}

// 실행
testCategoryMerge();
