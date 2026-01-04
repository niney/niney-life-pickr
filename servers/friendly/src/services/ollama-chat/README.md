# Ollama Chat 서비스

`/api/chat` 기반 OpenAI 호환 채팅 서비스

## 구조

```
ollama-chat/
├── base-ollama-chat.service.ts    # 추상 베이스 클래스
├── cloud-ollama-chat.service.ts   # Cloud 채팅 서비스
├── cloud-ollama-web.service.ts    # Cloud 웹 검색/페치 서비스
├── local-ollama-chat.service.ts   # Local 채팅 서비스
├── unified-ollama-chat.service.ts # Cloud+Local 통합 서비스
├── ollama-chat.factory.ts         # 팩토리 함수
└── ollama-chat.types.ts           # 타입 정의
```

## 빠른 시작

### 1. Cloud 채팅

```typescript
import { createCloudChatService } from './ollama-chat.factory';

const cloud = createCloudChatService();
await cloud.checkStatus();

const response = await cloud.chat([
  { role: 'system', content: 'JSON으로 응답하세요.' },
  { role: 'user', content: '안녕?' },
], { format: 'json' });
```

### 2. Local 채팅

```typescript
import { createLocalChatService } from './ollama-chat.factory';

const local = createLocalChatService();
await local.checkStatus();

const response = await local.chat([
  { role: 'user', content: '1+1은?' },
]);
```

### 3. Unified (Cloud + Local 자동 전환)

```typescript
import { createUnifiedChatService } from './ollama-chat.factory';

// Cloud 우선, 실패 시 Local로 fallback
const unified = createUnifiedChatService({ prefer: 'cloud' });
await unified.ensureReady();

console.log(unified.getActiveType()); // 'cloud' 또는 'local'

// 간단한 질문
const answer = await unified.ask(
  '당신은 친절한 AI입니다.',
  '오늘 기분이 어때?'
);

// 수동 전환
await unified.switchToLocal();
await unified.switchToCloud();
```

### 4. 웹 검색 (Cloud 전용)

```typescript
import { createCloudWebService } from './ollama-chat.factory';

const web = createCloudWebService();

// 웹 검색
const results = await web.webSearch('서울 날씨', { maxResults: 5 });

// 검색 + 채팅 통합
const answer = await web.chatWithSearch(
  '서울 날씨',
  '오늘 날씨 알려줘',
  { format: 'json' }
);

// URL 페치
const page = await web.webFetch('https://example.com');
```

## 주요 메서드

| 서비스 | 메서드 | 설명 |
|--------|--------|------|
| 공통 | `checkStatus()` | 서버 연결 확인 |
| 공통 | `chat(messages, options)` | 채팅 메시지 전송 |
| 공통 | `listModels()` | 사용 가능한 모델 목록 |
| Unified | `ensureReady()` | 서비스 준비 (자동 fallback) |
| Unified | `ask(system, user)` | 시스템 프롬프트 + 질문 |
| Unified | `switchToCloud/Local()` | 서비스 전환 |
| Web | `webSearch(query)` | 웹 검색 |
| Web | `webFetch(url)` | URL 콘텐츠 페치 |
| Web | `chatWithSearch()` | 검색 결과 기반 채팅 |

## ChatOptions

```typescript
{
  temperature?: number;    // 창의성 (0~1)
  top_p?: number;         // 토큰 샘플링
  num_ctx?: number;       // 컨텍스트 크기 (기본: 2048)
  num_predict?: number;   // 최대 토큰 수
  format?: 'json';        // JSON 응답 강제
}
```

## 테스트

```bash
# 전체 테스트
ts-node src/tests/ollama-chat.ts all

# 개별 테스트
ts-node src/tests/ollama-chat.ts local
ts-node src/tests/ollama-chat.ts cloud
ts-node src/tests/ollama-chat.ts unified
ts-node src/tests/ollama-chat.ts websearch
```
