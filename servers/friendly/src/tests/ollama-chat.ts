/**
 * Ollama Chat 서비스 기본 테스트
 */

import {
  createCloudChatService,
  createCloudWebService,
  createLocalChatService,
  createUnifiedChatService,
} from '../services/ollama-chat/ollama-chat.factory';

/**
 * 테스트: Local Ollama 채팅 기능
 */
async function testLocalChat() {
  console.log('\n========================================');
  console.log('🧪 테스트: Local Ollama Chat 기능');
  console.log('========================================\n');

  try {
    const localService = createLocalChatService();

    // 0. 서버 상태 확인
    console.log('0. Local 서버 상태 확인...');
    const isReady = await localService.checkStatus();
    if (!isReady) {
      console.log('   ❌ Local Ollama 서버 사용 불가, 테스트 스킵\n');
      return;
    }
    console.log('   ✅ Local Ollama 서버 연결됨\n');

    // 1. 모델 목록 조회
    console.log('1. 모델 목록 조회...');
    const models = await localService.listModels();
    console.log(`   📦 사용 가능한 모델: ${models.join(', ')}\n`);

    // 2. 채팅 테스트
    console.log('2. 채팅 테스트...');
    const startTime = Date.now();

    const response = await localService.chat([
      { role: 'system', content: 'JSON 형식으로만 응답하세요.' },
      { role: 'user', content: '"hello"를 한국어로 번역해서 "translation" 키로 답해주세요.' },
    ], { format: 'json' });

    const elapsed = Date.now() - startTime;
    console.log(`   ⏱️  소요 시간: ${(elapsed / 1000).toFixed(2)}초`);
    console.log(`   📤 응답:\n   ${response}\n`);

    // 3. 멀티턴 대화 테스트
    console.log('3. 멀티턴 대화 테스트...');
    const multiStartTime = Date.now();

    const multiResponse = await localService.chat([
      { role: 'system', content: 'JSON 형식으로 응답하세요.' },
      { role: 'user', content: '1+1은?' },
      { role: 'assistant', content: '{"answer": 2}' },
      { role: 'user', content: '거기에 3을 더하면?' },
    ], { format: 'json' });

    const multiElapsed = Date.now() - multiStartTime;
    console.log(`   ⏱️  소요 시간: ${(multiElapsed / 1000).toFixed(2)}초`);
    console.log(`   📤 응답:\n   ${multiResponse}\n`);

    console.log('✅ Local 테스트 완료!\n');

  } catch (error) {
    console.error('❌ Local 테스트 실패:', error);
  }
}

/**
 * 테스트: Cloud 기본 채팅 기능
 */
async function testCloudChat() {
  console.log('\n========================================');
  console.log('🧪 테스트: Cloud Ollama Chat 기능');
  console.log('========================================\n');

  // 팩토리로 서비스 생성
  const cloudService = createCloudChatService();

  try {
    // 0. 모델 목록 조회 테스트
    console.log('0. 모델 목록 조회 테스트...');
    const models = await cloudService.listModels();
    if (models.length > 0) {
      console.log(`   ✅ 사용 가능한 모델: ${models.join(', ')}\n`);
    } else {
      console.log('   ⚠️  모델 목록 API 지원 안됨 (Cloud에서는 정상)\n');
    }

    // 1. 서버 상태 확인
    console.log('1. Cloud 서버 상태 확인...');
    const isReady = await cloudService.checkStatus();
    if (!isReady) {
      console.log('   ❌ Cloud Ollama 서버 사용 불가, 테스트 스킵\n');
      return;
    }

    // 2. 간단한 질문
    console.log('2. 시스템 프롬프트 + 질문 테스트...');
    const startTime = Date.now();

    const response = await cloudService.chat(
      [
        { role: 'system', content: '당신은 JSON 형식으로만 응답하는 AI입니다.' },
        { role: 'user', content: '"hello"를 한국어로 번역해서 "translation" 키로 답해주세요.' },
      ],
      { format: 'json' }
    );

    const elapsed = Date.now() - startTime;
    console.log(`   ⏱️  소요 시간: ${(elapsed / 1000).toFixed(2)}초`);
    console.log(`   📤 응답:\n   ${response}\n`);

    // 3. 멀티턴 대화 테스트
    console.log('3. 멀티턴 대화 테스트...');
    const chatResponse = await cloudService.chat([
      { role: 'system', content: 'JSON 형식으로 응답하세요.' },
      { role: 'user', content: '1+1은?' },
      { role: 'assistant', content: '{"answer": 2}' },
      { role: 'user', content: '거기에 3을 더하면?' },
    ], { format: 'json' });

    console.log(`   📤 응답:\n   ${chatResponse}\n`);

    console.log('✅ Cloud 테스트 완료!\n');

  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  }
}

/**
 * 테스트: Web Search 기능 (CloudOllamaWebService 사용)
 */
async function testWebSearch() {
  console.log('\n========================================');
  console.log('🧪 테스트: Cloud Ollama Web 서비스');
  console.log('========================================\n');

  try {
    const webService = createCloudWebService();

    // 0. 서버 상태 확인
    console.log('0. Cloud 서버 상태 확인...');
    const isReady = await webService.checkStatus();
    if (!isReady) {
      console.log('   ❌ Cloud 서버 사용 불가, 테스트 스킵\n');
      return;
    }

    // 1. 웹 검색 테스트
    console.log('1. 웹 검색 테스트 (webSearch)...');
    const searchQuery = '서울 오늘 날씨';
    console.log(`   🔍 검색어: "${searchQuery}"`);

    const searchResult = await webService.webSearch(searchQuery, { maxResults: 3 });

    console.log(`   ✅ 검색 결과 ${searchResult.results.length}개 반환`);
    searchResult.results.slice(0, 2).forEach((r, i) => {
      console.log(`   [${i + 1}] ${r.title}`);
      console.log(`       ${r.url}`);
    });
    console.log('');

    // 2. 웹 검색 결과로 채팅 (chatWithSearch)
    console.log('2. 웹 검색 + 채팅 통합 (chatWithSearch)...');
    const startTime = Date.now();

    const chatResponse = await webService.chatWithSearch(
      '서울 날씨',
      '서울 오늘 날씨는 어때? JSON으로 "weather" 키에 답해줘.',
      { format: 'json', maxResults: 3 }
    );

    const elapsed = Date.now() - startTime;
    console.log(`   ⏱️  소요 시간: ${(elapsed / 1000).toFixed(2)}초`);
    console.log(`   📤 응답: ${chatResponse}\n`);

    // 3. 웹 페이지 페치 테스트
    console.log('3. 웹 페이지 페치 테스트 (webFetch)...');
    const testUrl = 'https://www.naver.com';
    console.log(`   🌐 URL: ${testUrl}`);

    const fetchResult = await webService.webFetch(testUrl);
    console.log(`   ✅ 페이지 제목: ${fetchResult.title || 'N/A'}`);
    console.log(`   📄 콘텐츠 길이: ${fetchResult.content.length}자\n`);

    console.log('✅ Web 서비스 테스트 완료!');

  } catch (error) {
    console.error('❌ Web 서비스 테스트 실패:', error);
  }
}

/**
 * 테스트: Unified 서비스 (Cloud + Local 통합)
 */
async function testUnifiedChat() {
  console.log('\n========================================');
  console.log('🧪 테스트: Unified Ollama Chat (Cloud + Local)');
  console.log('========================================\n');

  try {
    // 1. Cloud 우선 모드
    console.log('1. Cloud 우선 모드로 Unified 서비스 생성...');
    const unifiedCloud = createUnifiedChatService({ prefer: 'cloud' });
    await unifiedCloud.ensureReady();
    console.log(`   📍 활성 서비스: ${unifiedCloud.getActiveType()}\n`);

    // 2. 채팅 테스트
    console.log('2. 채팅 테스트 (ask 메서드)...');
    const response = await unifiedCloud.ask(
      'JSON 형식으로만 응답하세요.',
      '"world"를 한국어로 번역해서 "translation" 키로 답해주세요.',
      { format: 'json' }
    );
    console.log(`   📤 응답: ${response}\n`);

    // 3. 서비스 전환 테스트
    console.log('3. Local로 전환 테스트...');
    const switchedToLocal = await unifiedCloud.switchToLocal();
    if (switchedToLocal) {
      console.log(`   📍 활성 서비스: ${unifiedCloud.getActiveType()}`);
      const localResponse = await unifiedCloud.ask(
        'JSON 형식으로만 응답하세요.',
        '2+2는?',
        { format: 'json' }
      );
      console.log(`   📤 Local 응답: ${localResponse}\n`);
    } else {
      console.log('   ⚠️  Local 전환 실패 (서버 미실행)\n');
    }

    // 4. Local 우선 모드
    console.log('4. Local 우선 모드로 Unified 서비스 생성...');
    const unifiedLocal = createUnifiedChatService({ prefer: 'local' });
    await unifiedLocal.ensureReady();
    console.log(`   📍 활성 서비스: ${unifiedLocal.getActiveType()}\n`);

    // 5. 모델 목록
    console.log('5. 활성 서비스 모델 목록...');
    const models = await unifiedLocal.listModels();
    console.log(`   📦 사용 가능한 모델: ${models.slice(0, 5).join(', ')}${models.length > 5 ? '...' : ''}\n`);

    console.log('✅ Unified 테스트 완료!\n');

  } catch (error) {
    console.error('❌ Unified 테스트 실패:', error);
  }
}

// 실행
async function main() {
  const args = process.argv.slice(2);
  const target = args[0]?.toLowerCase();

  if (!target || target === 'all') {
    // 전체 테스트
    await testLocalChat();
    await testCloudChat();
    await testUnifiedChat();
    await testWebSearch();
  } else if (target === 'local') {
    await testLocalChat();
  } else if (target === 'cloud') {
    await testCloudChat();
    await testWebSearch();
  } else if (target === 'unified') {
    await testUnifiedChat();
  } else if (target === 'websearch' || target === 'search') {
    await testWebSearch();
  } else {
    console.log('사용법: ts-node ollama-chat.ts [local|cloud|unified|websearch|all]');
    console.log('  local     - Local Ollama 테스트');
    console.log('  cloud     - Cloud Ollama 테스트');
    console.log('  unified   - Unified (Cloud+Local) 테스트');
    console.log('  websearch - Web Search 테스트');
    console.log('  all       - 전체 테스트 (기본)');
  }
}

main();