# Ollama Service

Local 및 Cloud Ollama API를 사용하기 위한 추상 서비스 클래스입니다.

## 📁 파일 구조

```
services/ollama/
├── ollama.types.ts              # 타입 정의
├── ollama.config.ts             # 설정 로더 (base.yml)
├── base-ollama.service.ts       # 최상위 추상 클래스
├── local-ollama.service.ts      # Local Ollama 추상 클래스
├── cloud-ollama.service.ts      # Cloud Ollama 추상 클래스
├── example.service.ts           # 사용 예시 (Recipe 서비스)
└── README.md                    # 이 파일
```

## 🎯 특징

- ✅ **fetch 사용**: Node.js 내장 API, 추가 의존성 없음
- ✅ **3단계 우선순위**: 기본값 < `base.yml` < 생성자 파라미터
- ✅ **Local/Cloud 지원**: 상황에 맞게 선택 가능
- ✅ **병렬 처리**: Cloud에서 여러 요청 동시 처리
- ✅ **타입 안정성**: TypeScript 완벽 지원
- ✅ **에러 처리**: 타임아웃, 연결 실패 등 처리

## ⚙️ 설정 방법

### 1. base.yml 설정

`config/base.yml` 파일에 다음 설정 추가:

\`\`\`yaml
ollama:
  # Local Ollama (self-hosted)
  local:
    url: "http://localhost:11434"
    model: "gemma3:27b"
    timeout: 60000
  
  # Cloud Ollama (external API)
  cloud:
    host: "https://ollama.com"
    model: "gpt-oss:20b"
    timeout: 60000
    parallelSize: 10
    apiKey: "your-api-key-here"  # Cloud API 키
\`\`\`

### 2. 설정 우선순위

설정은 다음 우선순위로 적용됩니다:

```
기본값 < base.yml < 생성자 파라미터
```

#### 기본값

\`\`\`typescript
// Local
{
  url: 'http://localhost:11434',
  model: 'llama2',
  timeout: 60000
}

// Cloud
{
  host: 'https://ollama.com',
  model: 'gpt-oss:20b',
  timeout: 60000,
  parallelSize: 3,
  apiKey: ''
}
\`\`\`

#### base.yml 설정

위 "1. base.yml 설정" 참조

#### 생성자 파라미터 (최우선)

\`\`\`typescript
const service = createRecipeService(false, {
  url: 'http://192.168.1.100:11434',
  model: 'llama3:8b',
  timeout: 30000
});
\`\`\`

## 🚀 사용 방법

### 1. 서비스 클래스 생성

원하는 기능을 가진 서비스 클래스를 만듭니다:

\`\`\`typescript
import { BaseLocalOllamaService } from './local-ollama.service';
import { BaseCloudOllamaService } from './cloud-ollama.service';

// Local용 서비스
class MyLocalService extends BaseLocalOllamaService {
  async doSomething(input: string): Promise<Result> {
    const prompt = `Process this: ${input}`;
    const response = await this.generate(prompt);
    return this.parseJsonResponse<Result>(response)!;
  }
}

// Cloud용 서비스 (병렬 처리 가능)
class MyCloudService extends BaseCloudOllamaService {
  async doSomething(input: string): Promise<Result> {
    const prompt = `Process this: ${input}`;
    const response = await this.generate(prompt);
    return this.parseJsonResponse<Result>(response)!;
  }

  async doManyThings(inputs: string[]): Promise<Result[]> {
    const prompts = inputs.map(input => `Process this: ${input}`);
    const responses = await this.generateBatch(prompts);
    return responses.map(r => this.parseJsonResponse<Result>(r)!);
  }
}
\`\`\`

### 2. 팩토리 함수 사용

\`\`\`typescript
import { createLocalConfig, createCloudConfig } from './ollama.config';

function createMyService(useCloud: boolean = false) {
  if (useCloud) {
    const config = createCloudConfig();
    if (!config) {
      console.error('Cloud 설정 실패 (API 키 없음)');
      return null;
    }
    return new MyCloudService(config);
  }
  
  const config = createLocalConfig();
  return new MyLocalService(config);
}

// 사용
const service = createMyService(false); // Local 사용
const service = createMyService(true);  // Cloud 사용
\`\`\`

### 3. 실제 사용 예시

\`\`\`typescript
async function main() {
  const service = createMyService(false);
  
  if (!service) {
    console.error('서비스 생성 실패');
    return;
  }

  // 상태 확인
  const isReady = await service.checkStatus();
  if (!isReady) {
    console.error('Ollama 서버가 준비되지 않았습니다');
    return;
  }

  // 사용
  const result = await service.doSomething('hello');
  console.log(result);
}
\`\`\`

## 📝 전체 예시

자세한 사용 예시는 `example.service.ts` 파일을 참고하세요:

- Local Ollama 사용법
- Cloud Ollama 사용법
- 병렬 처리 사용법
- 커스텀 설정 사용법

## 🔧 API 참고

### BaseOllamaService (추상 클래스)

공통 메서드:

- `abstract checkStatus(): Promise<boolean>` - 서버 상태 확인
- `abstract generate(prompt: string, options?: GenerateOptions): Promise<string>` - 프롬프트 생성
- `protected cleanJsonResponse(response: string): string` - JSON 응답 정리
- `protected parseJsonResponse<T>(response: string): T | null` - JSON 파싱

### BaseLocalOllamaService

Local Ollama 서버와 통신:

- `/api/tags` - 모델 목록 확인
- `/api/generate` - 프롬프트 생성

### BaseCloudOllamaService

Cloud Ollama API와 통신:

- `checkStatus()` - 서버 상태 확인
- `generate()` - 단일 프롬프트 생성
- `generateBatch()` - 여러 프롬프트 병렬 처리 (⚡ 성능 향상)

### GenerateOptions

\`\`\`typescript
interface GenerateOptions {
  temperature?: number;      // 0.0 ~ 1.0 (창의성)
  top_p?: number;           // 0.0 ~ 1.0 (다양성)
  max_tokens?: number;      // 최대 토큰 수
  num_ctx?: number;         // 컨텍스트 크기 (기본: 2048)
  num_predict?: number;     // 예측 토큰 수
}
\`\`\`

## 🛠️ 트러블슈팅

### Local Ollama 연결 실패

\`\`\`bash
# Ollama 실행 확인
ollama serve

# 모델 설치 확인
ollama list

# 모델 다운로드
ollama pull llama2
ollama pull gemma3:27b
\`\`\`

### Cloud Ollama API 키 오류

1. `base.yml`에 API 키 설정 확인
2. 또는 환경 변수 설정:
   \`\`\`bash
   export OLLAMA_CLOUD_API_KEY="your-api-key"
   \`\`\`

### 타임아웃 오류

`base.yml` 또는 생성자 파라미터에서 `timeout` 값 증가:

\`\`\`typescript
const service = createMyService(false, {
  timeout: 120000  // 2분
});
\`\`\`

## 📚 참고 자료

- [Ollama 공식 문서](https://github.com/ollama/ollama)
- [Ollama API 문서](https://github.com/ollama/ollama/blob/main/docs/api.md)
