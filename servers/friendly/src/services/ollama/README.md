# 통합 Ollama 서비스 가이드# Ollama Service



> Cloud/Local Ollama를 자동으로 관리하는 통합 서비스Local 및 Cloud Ollama API를 사용하기 위한 추상 서비스 클래스입니다.



## 📋 목차## 📁 파일 구조



- [개요](#개요)```

- [핵심 개념](#핵심-개념)services/ollama/

- [사용법](#사용법)├── ollama.types.ts              # 타입 정의

- [병렬 처리](#병렬-처리)├── ollama.config.ts             # 설정 로더 (base.yml)

- [예제: 메뉴 정규화](#예제-메뉴-정규화)├── base-ollama.service.ts       # 최상위 추상 클래스

- [API](#api)├── local-ollama.service.ts      # Local Ollama 추상 클래스

- [FAQ](#faq)├── cloud-ollama.service.ts      # Cloud Ollama 추상 클래스

├── example.service.ts           # 사용 예시 (Recipe 서비스)

---└── README.md                    # 이 파일

```

## 개요

## 🎯 특징

### 🎯 목적

- ✅ **fetch 사용**: Node.js 내장 API, 추가 의존성 없음

AI 서비스 구현 시 **프롬프트 생성과 응답 파싱에만 집중**할 수 있도록, Cloud/Local 선택, Fallback, 병렬 처리를 자동화합니다.- ✅ **3단계 우선순위**: 기본값 < `base.yml` < 생성자 파라미터

- ✅ **Local/Cloud 지원**: 상황에 맞게 선택 가능

### ✨ 주요 기능- ✅ **병렬 처리**: Cloud에서 여러 요청 동시 처리

- ✅ **타입 안정성**: TypeScript 완벽 지원

- **자동 Fallback**: Cloud 실패 시 자동 Local 전환 (설정/연결/런타임)- ✅ **에러 처리**: 타임아웃, 연결 실패 등 처리

- **병렬 처리**: Cloud는 Promise.all 병렬, Local은 순차 처리로 자동 변환

- **간단한 사용**: `useCloud` 값 하나로 모든 것 자동 처리## ⚙️ 설정 방법

- **기본 구현**: 커스터마이징 불필요 (필요 시 오버라이드 가능)

### 1. base.yml 설정

### 📦 파일 구조

`config/base.yml` 파일에 다음 설정 추가:

```

ollama/\`\`\`yaml

├── unified-ollama.service.ts      ← 통합 서비스 (핵심)ollama:

├── base-ollama.service.ts         ← 최상위 추상 클래스  # Local Ollama (self-hosted)

├── local-ollama.service.ts        ← Local Ollama  local:

├── cloud-ollama.service.ts        ← Cloud Ollama    url: "http://localhost:11434"

├── ollama.config.ts               ← 설정 로더    model: "gemma3:27b"

├── ollama.types.ts                ← 타입 정의    timeout: 60000

└── README.md                      ← 이 문서  

```  # Cloud Ollama (external API)

  cloud:

---    host: "https://ollama.com"

    model: "gpt-oss:20b"

## 핵심 개념    timeout: 60000

    parallelSize: 10

### 1. 병렬 처리 방식    apiKey: "your-api-key-here"  # Cloud API 키

\`\`\`

**메뉴당 1개 프롬프트** → Cloud는 동시 전송, Local은 순차 전송

### 2. 설정 우선순위

```typescript

// ❌ 잘못: 한 프롬프트에 모든 메뉴설정은 다음 우선순위로 적용됩니다:

const prompt = `메뉴1, 메뉴2, 메뉴3...`;

await generateSingle(prompt);```

기본값 < base.yml < 생성자 파라미터

// ✅ 올바름: 메뉴당 1 프롬프트```

const prompts = ["메뉴1 프롬프트", "메뉴2 프롬프트", "메뉴3 프롬프트"];

await generateBatch(prompts); // Cloud: 동시, Local: 순차#### 기본값

```

\`\`\`typescript

### 2. 자동 Fallback (3단계)// Local

{

```  url: 'http://localhost:11434',

1단계: 설정 확인    Cloud 설정 없음 → Local  model: 'llama2',

2단계: 연결 확인    Cloud 연결 실패 → Local  timeout: 60000

3단계: 런타임       Cloud 요청 실패 → Local 재시도}

```

// Cloud

### 3. 아키텍처{

  host: 'https://ollama.com',

```  model: 'gpt-oss:20b',

UnifiedOllamaService  timeout: 60000,

├── Cloud 사용 가능? → cloudService.generateBatch() (병렬)  parallelSize: 3,

└── Cloud 불가/실패 → generateBatchLocal() (순차)  apiKey: ''

}

MenuNormalizationService extends UnifiedOllamaService\`\`\`

└── 프롬프트 생성 + 응답 파싱만 구현

```#### base.yml 설정



---위 "1. base.yml 설정" 참조



## 사용법#### 생성자 파라미터 (최우선)



### 방법 1: 헬퍼 함수 (가장 간단)\`\`\`typescript

const service = createRecipeService(false, {

```typescript  url: 'http://192.168.1.100:11434',

import { normalizeMenuItems } from '../menu-normalization.service';  model: 'llama3:8b',

  timeout: 30000

// Cloud 우선 (실패 시 자동 Local)});

const result = await normalizeMenuItems(menuItems, true);\`\`\`



// Local 전용## 🚀 사용 방법

const result = await normalizeMenuItems(menuItems, false);

```### 1. 서비스 클래스 생성



### 방법 2: 서비스 직접 사용원하는 기능을 가진 서비스 클래스를 만듭니다:



```typescript\`\`\`typescript

import { createMenuNormalizationService } from '../menu-normalization.service';import { BaseLocalOllamaService } from './local-ollama.service';

import { BaseCloudOllamaService } from './cloud-ollama.service';

const service = createMenuNormalizationService(true); // Cloud 우선

await service.ensureReady(); // 서비스 준비 확인// Local용 서비스

class MyLocalService extends BaseLocalOllamaService {

console.log(`사용 중: ${service.getCurrentServiceType()}`); // 'cloud' | 'local'  async doSomething(input: string): Promise<Result> {

    const prompt = `Process this: ${input}`;

const result = await service.addNormalizedNames(menuItems);    const response = await this.generate(prompt);

```    return this.parseJsonResponse<Result>(response)!;

  }

### 방법 3: 새 서비스 구현}



```typescript// Cloud용 서비스 (병렬 처리 가능)

import { UnifiedOllamaService } from './ollama/unified-ollama.service';class MyCloudService extends BaseCloudOllamaService {

  async doSomething(input: string): Promise<Result> {

class MyService extends UnifiedOllamaService {    const prompt = `Process this: ${input}`;

  async processData(items: string[]): Promise<any[]> {    const response = await this.generate(prompt);

    await this.ensureReady();    return this.parseJsonResponse<Result>(response)!;

      }

    // 1. 각 아이템당 프롬프트 1개 생성

    const prompts = items.map(item => this.createPrompt(item));  async doManyThings(inputs: string[]): Promise<Result[]> {

        const prompts = inputs.map(input => `Process this: ${input}`);

    // 2. 병렬/순차 자동 처리    const responses = await this.generateBatch(prompts);

    const responses = await this.generateBatch(prompts, { num_ctx: 2048 });    return responses.map(r => this.parseJsonResponse<Result>(r)!);

      }

    // 3. 응답 파싱}

    return responses.map((res, i) => \`\`\`

      this.parseJsonResponse(res) || this.fallback(items[i])

    );### 2. 팩토리 함수 사용

  }

  \`\`\`typescript

  private createPrompt(item: string): string {import { createLocalConfig, createCloudConfig } from './ollama.config';

    return `${item}을 분석해주세요. JSON으로 출력하세요.`;

  }function createMyService(useCloud: boolean = false) {

}  if (useCloud) {

```    const config = createCloudConfig();

    if (!config) {

---      console.error('Cloud 설정 실패 (API 키 없음)');

      return null;

## 병렬 처리    }

    return new MyCloudService(config);

### Cloud (8개 메뉴 예시)  }

  

```  const config = createLocalConfig();

8개 프롬프트 생성  return new MyLocalService(config);

  ↓}

Promise.allSettled() - 3개씩 배치

  ├─ Batch 1: [p1, p2, p3] → 1.2초// 사용

  ├─ Batch 2: [p4, p5, p6] → 1.1초const service = createMyService(false); // Local 사용

  └─ Batch 3: [p7, p8]     → 0.8초const service = createMyService(true);  // Cloud 사용

  ↓\`\`\`

총 소요: ~3초 (5배 빠름)

```### 3. 실제 사용 예시



### Local (8개 메뉴 예시)\`\`\`typescript

async function main() {

```  const service = createMyService(false);

8개 프롬프트 생성  

  ↓  if (!service) {

for loop - 하나씩 순차    console.error('서비스 생성 실패');

  ├─ [1/8] p1 → 2.1초    return;

  ├─ [2/8] p2 → 2.3초  }

  ...

  └─ [8/8] p8 → 2.1초  // 상태 확인

  ↓  const isReady = await service.checkStatus();

총 소요: ~17초  if (!isReady) {

```    console.error('Ollama 서버가 준비되지 않았습니다');

    return;

### 성능 비교  }



| 메뉴 | Cloud | Local | 효율성 |  // 사용

|------|-------|-------|--------|  const result = await service.doSomething('hello');

| 8개  | 3초   | 17초  | **5.7배** |  console.log(result);

| 20개 | 8초   | 42초  | **5.3배** |}

| 50개 | 20초  | 105초 | **5.3배** |\`\`\`



---## 📝 전체 예시



## 예제: 메뉴 정규화자세한 사용 예시는 `example.service.ts` 파일을 참고하세요:



### 전체 코드- Local Ollama 사용법

- Cloud Ollama 사용법

```typescript- 병렬 처리 사용법

import { UnifiedOllamaService } from './ollama/unified-ollama.service';- 커스텀 설정 사용법



// 1. 프롬프트 생성 함수## 🔧 API 참고

function createPrompt(menuName: string): string {

  return `다음 메뉴명에서 음식명과 메뉴명을 추출해주세요.### BaseOllamaService (추상 클래스)



메뉴: ${menuName}공통 메서드:



JSON 형식:- `abstract checkStatus(): Promise<boolean>` - 서버 상태 확인

{- `abstract generate(prompt: string, options?: GenerateOptions): Promise<string>` - 프롬프트 생성

  "foodName": "음식명",- `protected cleanJsonResponse(response: string): string` - JSON 응답 정리

  "menuName": "메뉴명"- `protected parseJsonResponse<T>(response: string): T | null` - JSON 파싱

}`;

}### BaseLocalOllamaService



// 2. 서비스 클래스Local Ollama 서버와 통신:

class MenuNormalizationService extends UnifiedOllamaService {

  async normalizeMenuBatch(menuNames: string[]) {- `/api/tags` - 모델 목록 확인

    // 각 메뉴당 프롬프트 생성- `/api/generate` - 프롬프트 생성

    const prompts = menuNames.map(name => createPrompt(name));

    ### BaseCloudOllamaService

    // 병렬/순차 자동 처리

    const responses = await this.generateBatch(prompts, { num_ctx: 2048 });Cloud Ollama API와 통신:

    

    // 응답 파싱- `checkStatus()` - 서버 상태 확인

    return responses.map((res, i) => {- `generate()` - 단일 프롬프트 생성

      const parsed = this.parseJsonResponse(res);- `generateBatch()` - 여러 프롬프트 병렬 처리 (⚡ 성능 향상)

      return parsed || { 

        foodName: menuNames[i], ### GenerateOptions

        menuName: menuNames[i] 

      };\`\`\`typescript

    });interface GenerateOptions {

  }  temperature?: number;      // 0.0 ~ 1.0 (창의성)

}  top_p?: number;           // 0.0 ~ 1.0 (다양성)

  max_tokens?: number;      // 최대 토큰 수

// 3. 사용  num_ctx?: number;         // 컨텍스트 크기 (기본: 2048)

const service = new MenuNormalizationService(true); // Cloud 우선  num_predict?: number;     // 예측 토큰 수

await service.ensureReady();}

const results = await service.normalizeMenuBatch(["LA갈비", "보쌈"]);\`\`\`

```

## 🛠️ 트러블슈팅

### 로그 출력

### Local Ollama 연결 실패

**Cloud 성공**:

```\`\`\`bash

🌥️  Cloud Ollama 서비스 초기화 시도# Ollama 실행 확인

✅ Cloud Ollama 사용 준비 완료ollama serve

🤖 CLOUD AI로 8개 메뉴 정규화 중...

🔄 8개 프롬프트 처리 시작...# 모델 설치 확인

🌥️  Cloud 병렬 처리 모드ollama list



[배치 1/3] 3개 요청 병렬 처리 중...# 모델 다운로드

  ✅ 배치 완료: 1.20초 (3/3 성공)ollama pull llama2

[배치 2/3] 3개 요청 병렬 처리 중...ollama pull gemma3:27b

  ✅ 배치 완료: 1.15초 (3/3 성공)\`\`\`

[배치 3/3] 2개 요청 병렬 처리 중...

  ✅ 배치 완료: 0.82초 (2/2 성공)### Cloud Ollama API 키 오류



✅ Cloud 병렬 처리 완료! (3.17초)1. `base.yml`에 API 키 설정 확인

✅ 메뉴 정규화 완료 (3.25초)2. 또는 환경 변수 설정:

```   \`\`\`bash

   export OLLAMA_CLOUD_API_KEY="your-api-key"

**Cloud 실패 → Local**:   \`\`\`

```

🌥️  Cloud Ollama 서비스 초기화 시도### 타임아웃 오류

❌ Cloud Ollama 서버 연결 실패

⚠️  Cloud Ollama 사용 불가, Local로 전환`base.yml` 또는 생성자 파라미터에서 `timeout` 값 증가:

✅ Local Ollama 사용 준비 완료

\`\`\`typescript

🤖 LOCAL AI로 8개 메뉴 정규화 중...const service = createMyService(false, {

💻 Local 순차 처리 모드  timeout: 120000  // 2분

  [1/8] 처리 중...});

  [2/8] 처리 중...\`\`\`

  ...

✅ 메뉴 정규화 완료 (16.83초)## 📚 참고 자료

```

- [Ollama 공식 문서](https://github.com/ollama/ollama)

---- [Ollama API 문서](https://github.com/ollama/ollama/blob/main/docs/api.md)


## API

### UnifiedOllamaService

#### Constructor
```typescript
new UnifiedOllamaService(useCloud?: boolean)
```
- `useCloud`: Cloud 사용 시도 (기본: false)

#### Methods

```typescript
// 서비스 준비
await service.ensureReady(): Promise<void>

// 단일 프롬프트
await service.generateSingle(prompt, options?): Promise<string>

// 병렬 프롬프트 (Cloud: 병렬, Local: 순차)
await service.generateBatch(prompts, options?): Promise<string[]>

// 현재 서비스 타입
service.getCurrentServiceType(): 'cloud' | 'local' | 'none'

// JSON 파싱
service.parseJsonResponse<T>(response): T | null
```

### GenerateOptions

```typescript
{
  num_ctx: 2048        // 컨텍스트 크기 (권장)
  temperature?: 0.3    // 온도 (선택적)
  top_p?: number
  num_predict?: number
}
```

---

## FAQ

### Q: Cloud/Local 구분이 필요한가요?
필요 없습니다. `useCloud` 값만 주면 자동 처리됩니다.

### Q: 커스터마이징이 필요한가요?
대부분 필요 없습니다. 특별한 경우에만 오버라이드하세요.

### Q: 한 프롬프트에 여러 메뉴를 넣으면 안 되나요?
권장하지 않습니다:
- ❌ 한 프롬프트 실패 시 전체 실패
- ❌ Cloud 병렬 처리 불가
- ❌ 에러 추적 어려움

### Q: Local이 병렬 불가능한 이유는?
Local Ollama는 단일 스레드라 병렬 요청 시 오히려 느려집니다.

### Q: 병렬 크기 조절은?
`config/base.yml`에서 설정:
```yaml
ollama:
  cloud:
    parallelSize: 5  # 기본: 3
```

### Q: 테스트는?
```bash
npm run test:unified-menu        # 전체
npm run test:unified-menu cloud  # Cloud
npm run test:unified-menu local  # Local
npm run test:unified-menu large  # 대용량
```

---

## 설정 (config/base.yml)

```yaml
ollama:
  local:
    url: "http://localhost:11434"
    model: "gemma3:27b"
    timeout: 60000
  
  cloud:
    host: "https://api.ollama.com"
    model: "gpt-oss:20b"
    timeout: 60000
    parallelSize: 3
    apiKey: "your-api-key"
```

---

## 요약

| 항목 | 값 |
|------|-----|
| **자동 Fallback** | Cloud → Local (3단계) |
| **병렬 처리** | Cloud 병렬, Local 순차 |
| **프롬프트 방식** | 메뉴당 1개 프롬프트 |
| **설정** | `{ num_ctx: 2048 }` |
| **성능 (8개)** | Cloud 3초, Local 17초 |
| **코드 간결성** | Import 1개, 오버라이드 0개 |

---

**📝 업데이트**: 2025-10-07  
**📧 문의**: GitHub Issues
