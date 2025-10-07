/**
 * 통합 메뉴 정규화 서비스 테스트
 * Cloud 우선 → Local fallback 자동 전환 확인
 */

import { normalizeMenuItems } from '../services/menu-normalization.service';
import type { MenuItem } from '../types/crawler.types';

/**
 * 테스트 메뉴 데이터
 */
const testMenuItems: MenuItem[] = [
  { name: '오봉집 LA갈비 600G 한상(특선)', price: '45000' },
  { name: '보쌈(대)', price: '38000' },
  { name: '맘스터치 싸이버거 세트', price: '7500' },
  { name: 'BBQ황금올리브치킨(순살)', price: '19000' },
  { name: '김치찌개', price: '8000' },
  { name: '점심특선 된장찌개정식', price: '9000' },
  { name: '불고기 200g', price: '15000' },
  { name: '추천메뉴 갈비탕', price: '12000' },
];

/**
 * Cloud 우선 테스트 (실패 시 자동 Local 전환)
 */
async function testCloudWithFallback() {
  console.log('\n========================================');
  console.log('🧪 테스트 1: Cloud 우선 (실패 시 Local)');
  console.log('========================================\n');

  try {
    const result = await normalizeMenuItems(testMenuItems, true); // useCloud=true

    console.log('\n📊 정규화 결과:');
    result.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.name}`);
      console.log(`   → ${item.normalizedName}`);
    });

    console.log('\n✅ Cloud 우선 테스트 완료\n');
    return result;

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error);
    throw error;
  }
}

/**
 * Local 전용 테스트
 */
async function testLocalOnly() {
  console.log('\n========================================');
  console.log('🧪 테스트 2: Local 전용');
  console.log('========================================\n');

  try {
    const result = await normalizeMenuItems(testMenuItems, false); // useCloud=false

    console.log('\n📊 정규화 결과:');
    result.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.name}`);
      console.log(`   → ${item.normalizedName}`);
    });

    console.log('\n✅ Local 전용 테스트 완료\n');
    return result;

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error);
    throw error;
  }
}

/**
 * 대용량 메뉴 병렬 처리 테스트
 */
async function testLargeBatch() {
  console.log('\n========================================');
  console.log('🧪 테스트 3: 대용량 병렬 처리 (20개)');
  console.log('========================================\n');

  // 테스트 메뉴를 20개로 확장
  const largeMenuItems: MenuItem[] = [
    ...testMenuItems,
    { name: '제주 흑돼지 구이', price: '28000' },
    { name: '물회(광어)', price: '15000' },
    { name: '참치회 특(중)', price: '50000' },
    { name: '우삼겹 200g', price: '18000' },
    { name: '냉면', price: '9000' },
    { name: '육개장', price: '10000' },
    { name: '순대국밥', price: '8500' },
    { name: '삼계탕', price: '15000' },
    { name: '아메리카노(HOT)', price: '4500' },
    { name: '카페라떼(ICED)', price: '5500' },
    { name: '생과일주스(딸기)', price: '7000' },
    { name: '치즈케이크 1조각', price: '6000' },
  ];

  try {
    console.log(`📦 메뉴 개수: ${largeMenuItems.length}개`);
    const result = await normalizeMenuItems(largeMenuItems, true); // Cloud 병렬 처리

    console.log('\n📊 정규화 결과 (샘플 5개):');
    result.slice(0, 5).forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.name}`);
      console.log(`   → ${item.normalizedName}`);
    });

    console.log('\n✅ 대용량 병렬 처리 테스트 완료\n');
    return result;

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error);
    throw error;
  }
}

/**
 * 모든 테스트 실행
 */
async function runAllTests() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  통합 메뉴 정규화 서비스 테스트        ║');
  console.log('╚════════════════════════════════════════╝');

  const startTime = Date.now();

  try {
    // 테스트 1: Cloud 우선 (자동 fallback)
    await testCloudWithFallback();

    // 테스트 2: Local 전용
    await testLocalOnly();

    // 테스트 3: 대용량 병렬 처리
    await testLargeBatch();

    const totalTime = Date.now() - startTime;
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  ✅ 모든 테스트 통과!                  ║');
    console.log(`║  총 소요 시간: ${(totalTime / 1000).toFixed(2)}초              ║`);
    console.log('╚════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error);
    process.exit(1);
  }
}

// 개별 테스트 선택 실행
const testType = process.argv[2];

switch (testType) {
  case 'cloud':
    testCloudWithFallback();
    break;
  case 'local':
    testLocalOnly();
    break;
  case 'large':
    testLargeBatch();
    break;
  default:
    runAllTests();
}
