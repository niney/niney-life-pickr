# Configuration Files

## 🔐 보안 설정

이 디렉토리의 `base.yml` 파일은 **민감한 정보(API 키 등)** 를 포함하므로 Git에서 추적하지 않습니다.

## 📝 설정 파일 생성 방법

### 1. base.yml 생성

프로젝트를 처음 clone한 경우, `base.example.yml`을 복사하여 `base.yml`을 생성하세요:

**Windows (PowerShell):**
```powershell
Copy-Item config\base.example.yml config\base.yml
```

**Linux / macOS:**
```bash
cp config/base.example.yml config/base.yml
```

### 2. API 키 설정

`config/base.yml` 파일을 열고 Cloud Ollama API 키를 입력하세요:

```yaml
ollama:
  cloud:
    apiKey: "your-actual-api-key-here"  # ← 여기에 실제 API 키 입력
```

## 📋 파일 설명

### base.example.yml
- 설정 파일 템플릿
- Git에 추적됨
- API 키 등 민감한 정보는 빈 문자열

### base.yml
- 실제 설정 파일
- **Git에 추적 안 됨** (`.gitignore`에 등록됨)
- 민감한 정보(API 키 등) 포함

### production.yml
- 프로덕션 환경 설정 (오버라이드)

### test.yml
- 테스트 환경 설정 (오버라이드)

## ⚠️ 주의사항

1. **절대로 `base.yml`을 Git에 커밋하지 마세요!**
2. API 키는 안전하게 보관하세요.
3. 팀원과 공유할 때는 별도의 안전한 채널을 사용하세요.

## 🔄 설정 우선순위

```
기본값 (코드 내장) < base.yml < 생성자 파라미터
```

자세한 내용은 `servers/friendly/src/services/ollama/README.md`를 참고하세요.
