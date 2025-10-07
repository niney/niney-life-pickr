/**
 * 메뉴 정규화 테스트 예시
 */

import { normalizeMenuItems } from '../services/menu-normalization.service';
import type { MenuItem } from '../types/crawler.types';

async function testMenuNormalization() {
  console.log('🧪 메뉴 정규화 테스트\n');

  const testMenuItems: MenuItem[] = [
    {
      name: '오봉집 LA갈비 600G 한상(특선)',
      description: '특선 메뉴',
      price: '45000원'
    },
    {
      name: '김치찌개',
      price: '8000원'
    },
    {
      name: '맘스터치 싸이버거 세트',
      description: '버거 + 음료 + 감자튀김',
      price: '9500원'
    },
    {
      name: '점심특선 보쌈(대)',
      description: '4-5인분',
      price: '35000원'
    },
    {
      name: 'BBQ 황금올리브 치킨(순살)',
      description: '인기 메뉴',
      price: '19000원'
    }
  ];

  console.log('📝 원본 메뉴:');
  testMenuItems.forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.name} (${item.price})`);
  });

  console.log('\n🤖 AI 정규화 시작...\n');

  const normalizedMenuItems = await normalizeMenuItems(testMenuItems, false); // false = Local Ollama

  console.log('\n✅ 정규화 결과:');
  normalizedMenuItems.forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.name}`);
    console.log(`     → normalized: ${item.normalizedName || '(없음)'}`);
  });

  console.log('\n📊 정규화 통계:');
  const normalized = normalizedMenuItems.filter(item => item.normalizedName);
  console.log(`  - 총 메뉴: ${testMenuItems.length}개`);
  console.log(`  - 정규화 성공: ${normalized.length}개`);
  console.log(`  - 정규화 실패: ${testMenuItems.length - normalized.length}개`);

  // normalizedName 파싱 예시
  console.log('\n🔍 정규화 결과 파싱:');
  normalizedMenuItems.forEach((item, i) => {
    if (item.normalizedName) {
      const parts = item.normalizedName.split('|');
      if (parts.length === 2) {
        console.log(`  ${i + 1}. 음식명: "${parts[0]}", 메뉴명: "${parts[1]}"`);
      } else {
        console.log(`  ${i + 1}. 음식명/메뉴명: "${parts[0]}" (동일)`);
      }
    }
  });
}

// 실행
if (require.main === module) {
  testMenuNormalization()
    .then(() => {
      console.log('\n✅ 테스트 완료');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ 테스트 실패:', error);
      process.exit(1);
    });
}

export default testMenuNormalization;
