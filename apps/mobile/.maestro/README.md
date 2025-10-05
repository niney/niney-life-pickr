# Maestro E2E Tests

React Native 모바일 앱을 위한 Maestro E2E 테스트입니다.

## Prerequisites

Maestro CLI 설치:
```bash
# macOS/Linux
curl -Ls "https://get.maestro.mobile.dev" | bash

# Windows (WSL2 필요)
# WSL2에서 위 명령어 실행
```

## Running Tests

### 전체 테스트 실행
```bash
# apps/mobile 디렉토리에서
npm run test:e2e

# 또는 직접 maestro 명령어 사용
maestro test .maestro
```

### 특정 테스트 실행
```bash
# Smoke test
npm run test:e2e:smoke
# 또는
maestro test .maestro/smoke.yaml

# Login test
npm run test:e2e:login
# 또는
maestro test .maestro/login.yaml
```

### 앱과 함께 테스트 실행
```bash
# Android
npm run android
# 별도 터미널에서
maestro test .maestro

# iOS
npm run ios
# 별도 터미널에서
maestro test .maestro
```

### Studio 모드 (Interactive)
```bash
maestro studio
```

## Test Files

- `config.yaml` - Maestro 설정 파일 (앱 ID, 환경 변수)
- `smoke.yaml` - 기본 앱 실행 테스트
- `login.yaml` - 로그인 플로우 테스트

## Environment Variables

테스트 계정 정보는 `config.yaml`에 정의되어 있습니다:
- `TEST_EMAIL`: niney@ks.com
- `TEST_PASSWORD`: tester

## Troubleshooting

### 앱이 실행되지 않을 때
1. 에뮬레이터/시뮬레이터가 실행 중인지 확인
2. 앱이 설치되어 있는지 확인
3. `appId`가 올바른지 확인 (Android: `com.nineylifepickr`)

### 요소를 찾지 못할 때
- `maestro studio`로 인터랙티브하게 디버깅
- 화면의 실제 텍스트/ID를 확인
- `assertVisible` 타임아웃 조정

## Documentation

- [Maestro Docs](https://maestro.mobile.dev/)
- [Maestro CLI Reference](https://maestro.mobile.dev/reference/commands)
