/**
 * 음식 카테고리 분류 서비스 테스트
 */

import { FoodCategoryService } from '../services/food-category';

async function testFoodCategory() {
  console.log('\n========================================');
  console.log('🧪 테스트: 음식 카테고리 분류 서비스');
  console.log('========================================\n');

  const service = new FoodCategoryService();

  // 1. 초기화
  console.log('1. 서비스 초기화...');
  const isReady = await service.init();
  if (!isReady) {
    console.log('   ❌ 서비스 초기화 실패, 테스트 종료\n');
    return;
  }
  console.log('');

  // 2. 단일 항목 분류
  console.log('2. 단일 항목 분류...');
  const singleResult = await service.classifySingle('김치찌개');
  if (singleResult) {
    console.log(`   📄 ${singleResult.item}`);
    console.log(`   📍 ${singleResult.path}`);
    console.log(`   📊 레벨: [${singleResult.levels.join(', ')}]`);
  }
  console.log('');

  // 3. 여러 항목 분류
  console.log('3. 여러 항목 분류...');
  const items = [
    '감자전',
    '육전',
    '배추김치',
    '깍두기',
    '된장찌개',
    '삼겹살',
    '불고기',
    '비빔밥',
    '막걸리',
    '소주',
    '고추장',
    '간장',
    '오늘의 메뉴',
    '스페셜 세트',
  ];

  const startTime = Date.now();
  const result = await service.classify(items, {
    onProgress: (done, total) => console.log(`   📊 진행: ${done}/${total}`),
  });
  const elapsed = Date.now() - startTime;

  console.log(`\n   ⏱️  소요 시간: ${(elapsed / 1000).toFixed(2)}초`);
  console.log(`   ✅ 성공: ${result.success}`);
  console.log('\n   📋 분류 결과:');
  result.categories.forEach((cat) => {
    console.log(`      ${cat.item} → ${cat.path}`);
  });

  if (result.errors && result.errors.length > 0) {
    console.log('\n   ⚠️  오류:');
    result.errors.forEach((err) => console.log(`      - ${err}`));
  }
  console.log('');

  // 4. 트리 구조 출력
  console.log('4. 트리 구조로 변환...');
  const tree = service.buildTree(result.categories);
  console.log('');
  service.printTree(tree);
  console.log('');

  // 5. JSON 변환
  console.log('5. JSON으로 변환...');
  const treeJson = service.treeToJson(tree);
  console.log(JSON.stringify(treeJson, null, 2));
  console.log('');

  console.log('✅ 분류 테스트 완료!\n');
}

// 실행
testFoodCategory();
