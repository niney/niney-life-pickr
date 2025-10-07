/**
 * Ollama 서비스 간단 테스트 스크립트
 * 
 * 실행 방법:
 * npx ts-node src/services/ollama/test-ollama.ts
 */

import { createLocalConfig, createCloudConfig, printOllamaConfig } from './ollama.config';
import { BaseLocalOllamaService } from './local-ollama.service';
import { BaseCloudOllamaService } from './cloud-ollama.service';

/**
 * 간단한 테스트 서비스
 */
class TestLocalService extends BaseLocalOllamaService {
  async simpleTest(): Promise<void> {
    console.log('\n🧪 Local Ollama 간단 테스트\n');
    
    const prompt = 'Say "Hello from Local Ollama!" in JSON format: {"message": "..."}';
    const response = await this.generate(prompt, {
      temperature: 0.5,
      num_ctx: 512,
    });

    console.log('📥 Raw Response:', response);
    
    const parsed = this.parseJsonResponse<{ message: string }>(response);
    console.log('📦 Parsed Response:', parsed);
  }
}

class TestCloudService extends BaseCloudOllamaService {
  async simpleTest(): Promise<void> {
    console.log('\n🧪 Cloud Ollama 간단 테스트\n');
    
    const prompt = 'Say "Hello from Cloud Ollama!" in JSON format: {"message": "..."}';
    const response = await this.generate(prompt, {
      temperature: 0.5,
      num_ctx: 512,
    });

    console.log('📥 Raw Response:', response);
    
    const parsed = this.parseJsonResponse<{ message: string }>(response);
    console.log('📦 Parsed Response:', parsed);
  }

  async batchTest(): Promise<void> {
    console.log('\n🧪 Cloud Ollama 배치 테스트\n');
    
    const prompts = [
      'Say "Test 1" in JSON: {"message": "..."}',
      'Say "Test 2" in JSON: {"message": "..."}',
      'Say "Test 3" in JSON: {"message": "..."}',
    ];

    const responses = await this.generateBatch(prompts, {
      temperature: 0.5,
      num_ctx: 512,
    }, 2); // 2개씩 병렬 처리

    responses.forEach((response, index) => {
      console.log(`\n[${index + 1}] Raw:`, response.substring(0, 100));
      const parsed = this.parseJsonResponse<{ message: string }>(response);
      console.log(`[${index + 1}] Parsed:`, parsed);
    });
  }
}

/**
 * 메인 테스트 함수
 */
async function main() {
  console.log('='.repeat(60));
  console.log('🚀 Ollama 서비스 테스트 시작');
  console.log('='.repeat(60));

  // 설정 확인
  console.log('\n📋 설정 정보 확인\n');
  
  const localConfig = createLocalConfig();
  printOllamaConfig('local', localConfig);

  const cloudConfig = createCloudConfig();
  if (cloudConfig) {
    printOllamaConfig('cloud', cloudConfig);
  } else {
    console.log('⚠️  Cloud 설정 없음 (API 키 필요)\n');
  }

  // Local 테스트
  console.log('\n' + '='.repeat(60));
  console.log('📍 Local Ollama 테스트');
  console.log('='.repeat(60));

  const localService = new TestLocalService(localConfig);
  const localStatus = await localService.checkStatus();

  if (localStatus) {
    try {
      await localService.simpleTest();
    } catch (error) {
      console.error('\n❌ Local 테스트 실패:', error instanceof Error ? error.message : error);
    }
  } else {
    console.log('\n⚠️  Local Ollama 서버가 준비되지 않아 테스트를 건너뜁니다.\n');
  }

  // Cloud 테스트
  if (cloudConfig) {
    console.log('\n' + '='.repeat(60));
    console.log('☁️  Cloud Ollama 테스트');
    console.log('='.repeat(60));

    const cloudService = new TestCloudService(cloudConfig);
    const cloudStatus = await cloudService.checkStatus();

    if (cloudStatus) {
      try {
        await cloudService.simpleTest();
        await cloudService.batchTest();
      } catch (error) {
        console.error('\n❌ Cloud 테스트 실패:', error instanceof Error ? error.message : error);
      }
    } else {
      console.log('\n⚠️  Cloud Ollama 서버가 준비되지 않아 테스트를 건너뜁니다.\n');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ 테스트 완료');
  console.log('='.repeat(60) + '\n');
}

// 실행
main().catch(error => {
  console.error('\n💥 치명적 오류:', error);
  process.exit(1);
});
