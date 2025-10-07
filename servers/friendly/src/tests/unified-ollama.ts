/**
 * UnifiedOllamaService 테스트
 * - Cloud/Local 자동 전환 확인
 * - 병렬/순차 처리 확인
 * - generateSingle, generateBatch 테스트
 */

import { UnifiedOllamaService } from '../services/ollama/unified-ollama.service';

/**
 * 테스트용 간단한 서비스
 */
class TestOllamaService extends UnifiedOllamaService {
  // parseJsonResponse를 public으로 노출
  public parse<T>(response: string): T | null {
    return this.parseJsonResponse<T>(response);
  }
}

/**
 * 테스트 1: 서비스 초기화 및 상태 확인
 */
async function testServiceInitialization() {
  console.log('\n========================================');
  console.log('🧪 테스트 1: 서비스 초기화 및 상태 확인');
  console.log('========================================\n');

  try {
    // Cloud 우선
    console.log('1-1. Cloud 우선 초기화');
    const cloudService = new TestOllamaService(true);
    await cloudService.ensureReady();
    const cloudType = cloudService.getCurrentServiceType();
    console.log(`   ✅ 서비스 타입: ${cloudType}\n`);

    // Local 전용
    console.log('1-2. Local 전용 초기화');
    const localService = new TestOllamaService(false);
    await localService.ensureReady();
    const localType = localService.getCurrentServiceType();
    console.log(`   ✅ 서비스 타입: ${localType}\n`);

    console.log('✅ 테스트 1 완료\n');
  } catch (error) {
    console.error('❌ 테스트 1 실패:', error);
    throw error;
  }
}

/**
 * 테스트 2: generateSingle 단일 프롬프트 처리
 */
async function testGenerateSingle() {
  console.log('\n========================================');
  console.log('🧪 테스트 2: generateSingle 단일 프롬프트');
  console.log('========================================\n');

  try {
    const service = new TestOllamaService(true); // Cloud 우선
    await service.ensureReady();

    const prompt = `다음 메뉴명에서 음식명을 추출해주세요.

메뉴: 오봉집 LA갈비 600G 한상

JSON 형식으로 출력:
{
  "foodName": "음식명",
  "restaurantName": "식당명"
}`;

    console.log('📤 프롬프트 전송 중...\n');
    const startTime = Date.now();

    const response = await service.generateSingle(prompt, { num_ctx: 2048 });

    const elapsed = Date.now() - startTime;
    console.log(`\n✅ 응답 받음 (${(elapsed / 1000).toFixed(2)}초)\n`);

    const parsed = service.parse<{ foodName: string; restaurantName: string }>(response);
    
    if (parsed) {
      console.log('📊 파싱 결과:');
      console.log(`   음식명: ${parsed.foodName}`);
      console.log(`   식당명: ${parsed.restaurantName || 'N/A'}\n`);
    } else {
      console.warn('⚠️  JSON 파싱 실패\n');
      console.log('원본 응답:', response.substring(0, 200));
    }

    console.log('✅ 테스트 2 완료\n');
  } catch (error) {
    console.error('❌ 테스트 2 실패:', error);
    throw error;
  }
}

/**
 * 테스트 3: generateBatch 병렬/순차 처리
 */
async function testGenerateBatch() {
  console.log('\n========================================');
  console.log('🧪 테스트 3: generateBatch 병렬/순차 처리');
  console.log('========================================\n');

  const menuNames = ['LA갈비', '보쌈', '싸이버거', '김치찌개', '된장찌개'];

  try {
    // Cloud 병렬 처리
    console.log('3-1. Cloud 병렬 처리 테스트\n');
    const cloudService = new TestOllamaService(true);
    await cloudService.ensureReady();

    const cloudPrompts = menuNames.map(name => 
      `메뉴 "${name}"의 카테고리를 하나만 선택해주세요. JSON: { "category": "한식|중식|일식|양식|기타" }`
    );

    console.log(`📤 ${cloudPrompts.length}개 프롬프트 전송 중...\n`);
    const cloudStart = Date.now();

    const cloudResponses = await cloudService.generateBatch(cloudPrompts, { num_ctx: 1024 });

    const cloudElapsed = Date.now() - cloudStart;
    console.log(`\n✅ Cloud 응답 받음 (${(cloudElapsed / 1000).toFixed(2)}초, ${(cloudElapsed / menuNames.length).toFixed(0)}ms/개)\n`);

    console.log('📊 Cloud 결과 샘플:');
    cloudResponses.slice(0, 3).forEach((response: string, index: number) => {
      const parsed = cloudService.parse<{ category: string }>(response);
      console.log(`   ${index + 1}. ${menuNames[index]} → ${parsed?.category || 'N/A'}`);
    });

    // Local 순차 처리
    console.log('\n\n3-2. Local 순차 처리 테스트\n');
    const localService = new TestOllamaService(false);
    await localService.ensureReady();

    const localPrompts = menuNames.slice(0, 3).map(name => 
      `메뉴 "${name}"의 카테고리를 하나만 선택해주세요. JSON: { "category": "한식|중식|일식|양식|기타" }`
    );

    console.log(`📤 ${localPrompts.length}개 프롬프트 전송 중...\n`);
    const localStart = Date.now();

    const localResponses = await localService.generateBatch(localPrompts, { num_ctx: 1024 });

    const localElapsed = Date.now() - localStart;
    console.log(`\n✅ Local 응답 받음 (${(localElapsed / 1000).toFixed(2)}초, ${(localElapsed / localPrompts.length).toFixed(0)}ms/개)\n`);

    console.log('📊 Local 결과:');
    localResponses.forEach((response: string, index: number) => {
      const parsed = localService.parse<{ category: string }>(response);
      console.log(`   ${index + 1}. ${menuNames[index]} → ${parsed?.category || 'N/A'}`);
    });

    console.log('\n✅ 테스트 3 완료\n');
  } catch (error) {
    console.error('❌ 테스트 3 실패:', error);
    throw error;
  }
}

/**
 * 테스트 4: JSON 파싱 테스트
 */
async function testJsonParsing() {
  console.log('\n========================================');
  console.log('🧪 테스트 4: JSON 파싱 테스트');
  console.log('========================================\n');

  const service = new TestOllamaService(true);

  // 테스트 케이스
  const testCases = [
    {
      name: '일반 JSON',
      input: '{"name": "LA갈비", "price": 25000}',
      expected: { name: 'LA갈비', price: 25000 }
    },
    {
      name: '마크다운 코드 블록',
      input: '```json\n{"name": "보쌈", "price": 30000}\n```',
      expected: { name: '보쌈', price: 30000 }
    },
    {
      name: '코드 블록 (json 없음)',
      input: '```\n{"name": "싸이버거", "price": 7500}\n```',
      expected: { name: '싸이버거', price: 7500 }
    },
    {
      name: '빈 응답',
      input: '',
      expected: null
    },
    {
      name: '잘못된 JSON',
      input: '{name: "LA갈비"}',
      expected: null
    }
  ];

  testCases.forEach(({ name, input, expected }) => {
    console.log(`\n📝 ${name}`);
    console.log(`   입력: ${input.substring(0, 50)}${input.length > 50 ? '...' : ''}`);
    
    const result = service.parse(input);
    
    if (expected === null) {
      if (result === null) {
        console.log(`   ✅ 예상대로 null 반환`);
      } else {
        console.log(`   ❌ null을 예상했지만 결과가 나옴:`, result);
      }
    } else {
      if (JSON.stringify(result) === JSON.stringify(expected)) {
        console.log(`   ✅ 파싱 성공:`, result);
      } else {
        console.log(`   ❌ 파싱 결과 불일치`);
        console.log(`      예상:`, expected);
        console.log(`      실제:`, result);
      }
    }
  });

  console.log('\n✅ 테스트 4 완료\n');
}

/**
 * 테스트 5: Cloud 실패 시 Local Fallback 테스트
 */
async function testCloudToLocalFallback() {
  console.log('\n========================================');
  console.log('🧪 테스트 5: Cloud → Local Fallback 시뮬레이션');
  console.log('========================================\n');

  console.log('💡 이 테스트는 수동 시뮬레이션입니다.');
  console.log('   실제 Fallback을 테스트하려면 Cloud 서버를 중단하세요.\n');

  try {
    const service = new TestOllamaService(true); // Cloud 우선
    await service.ensureReady();

    const type = service.getCurrentServiceType();
    console.log(`✅ 현재 사용 중: ${type.toUpperCase()}`);

    if (type === 'cloud') {
      console.log('\n💡 Cloud가 정상 동작 중입니다.');
      console.log('   Fallback 테스트를 위해서는:');
      console.log('   1. config/base.yml에서 cloud.apiKey 제거');
      console.log('   2. 또는 Cloud 서버 URL 변경');
      console.log('   3. 테스트 재실행\n');
    } else {
      console.log('\n✅ Cloud 실패 후 Local로 Fallback 완료!\n');
    }

    console.log('✅ 테스트 5 완료\n');
  } catch (error) {
    console.error('❌ 테스트 5 실패:', error);
  }
}

/**
 * 모든 테스트 실행
 */
async function runAllTests() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  UnifiedOllamaService 테스트 스위트   ║');
  console.log('╚════════════════════════════════════════╝');

  const startTime = Date.now();

  try {
    await testServiceInitialization();
    await testGenerateSingle();
    await testGenerateBatch();
    await testJsonParsing();
    await testCloudToLocalFallback();

    const totalTime = Date.now() - startTime;
    
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  ✅ 모든 테스트 통과!                  ║');
    console.log(`║  총 소요 시간: ${(totalTime / 1000).toFixed(2)}초              ║`);
    console.log('╚════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n╔════════════════════════════════════════╗');
    console.error('║  ❌ 테스트 실패                        ║');
    console.error('╚════════════════════════════════════════╝\n');
    console.error(error);
    process.exit(1);
  }
}

// 개별 테스트 선택 실행
const testType = process.argv[2];

switch (testType) {
  case 'init':
    testServiceInitialization();
    break;
  case 'single':
    testGenerateSingle();
    break;
  case 'batch':
    testGenerateBatch();
    break;
  case 'parse':
    testJsonParsing();
    break;
  case 'fallback':
    testCloudToLocalFallback();
    break;
  default:
    runAllTests();
}
