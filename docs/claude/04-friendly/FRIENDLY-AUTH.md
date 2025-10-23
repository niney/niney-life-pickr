# FRIENDLY-AUTH.md

> **Last Updated**: 2025-10-23 23:05
> **Purpose**: Authentication system (register, login, user management)

---

## Quick Reference

**File**: `src/routes/auth.routes.ts`
**Tag**: `auth`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | Login with email/password |
| `/api/auth/users` | GET | List all users (test endpoint) |

### Authentication Flow Diagram

#### Registration Flow
```
Client              Auth Route          UserService         Database
  │                     │                     │                 │
  │ POST /register      │                     │                 │
  ├────────────────────>│                     │                 │
  │  {email, username,  │                     │                 │
  │   password}         │                     │                 │
  │                     │ validate(TypeBox)   │                 │
  │                     ├──────────┐          │                 │
  │                     │          │          │                 │
  │                     │<─────────┘          │                 │
  │                     │                     │                 │
  │                     │ createUser()        │                 │
  │                     ├────────────────────>│                 │
  │                     │                     │ Check unique    │
  │                     │                     ├────────────────>│
  │                     │                     │<────────────────┤
  │                     │                     │                 │
  │                     │                     │ bcrypt.hash()   │
  │                     │                     ├────┐            │
  │                     │                     │    │ 10 rounds  │
  │                     │                     │<───┘            │
  │                     │                     │                 │
  │                     │                     │ INSERT user     │
  │                     │                     ├────────────────>│
  │                     │                     │<────────────────┤
  │                     │  user (no password) │                 │
  │                     │<────────────────────┤                 │
  │  200 OK             │                     │                 │
  │  {user object}      │                     │                 │
  │<────────────────────┤                     │                 │
```

#### Login Flow
```
Client              Auth Route          UserService         Database       Storage
  │                     │                     │                 │              │
  │ POST /login         │                     │                 │              │
  ├────────────────────>│                     │                 │              │
  │  {email, password}  │                     │                 │              │
  │                     │ validate(TypeBox)   │                 │              │
  │                     ├──────────┐          │                 │              │
  │                     │<─────────┘          │                 │              │
  │                     │                     │                 │              │
  │                     │ validateCredentials()│                 │              │
  │                     ├────────────────────>│                 │              │
  │                     │                     │ SELECT user     │              │
  │                     │                     ├────────────────>│              │
  │                     │                     │<────────────────┤              │
  │                     │                     │                 │              │
  │                     │                     │ bcrypt.compare()│              │
  │                     │                     ├─────┐           │              │
  │                     │                     │     │ Match?    │              │
  │                     │                     │<────┘           │              │
  │                     │                     │                 │              │
  │                     │                     │ UPDATE last_login             │
  │                     │                     ├────────────────>│              │
  │                     │                     │<────────────────┤              │
  │                     │  user               │                 │              │
  │                     │<────────────────────┤                 │              │
  │  200 OK             │                     │                 │              │
  │  {user object}      │                     │                 │              │
  │<────────────────────┤                     │                 │              │
  │                     │                     │                 │              │
  │ storage.setUserInfo()│                     │                 │              │
  ├─────────────────────────────────────────────────────────────────────────>│
  │                     │                     │                 │              │
```

> **IMPORTANT**: 현재 시스템은 **stateless 인증** (세션 없음)을 사용합니다. 클라이언트가 user 정보를 로컬 스토리지에 저장하고, 매 API 호출 시 포함합니다. 향후 JWT 토큰 기반 인증으로 업그레이드 예정입니다 (sessions 테이블 준비 완료).

---

## 1. Register

**Endpoint**: `POST /api/auth/register`

**Body**:
```typescript
{
  email: string;      // Valid email format
  username: string;   // 3-20 characters
  password: string;   // 6+ characters
}
```

**Validation**:
- Email must be valid format and unique
- Username must be unique, 3-20 chars
- Password minimum 6 characters

**Process**:
1. Validate input with TypeBox schema
2. Check email/username uniqueness
3. Hash password with bcrypt (10 rounds)
4. Insert into `users` table
5. Return user object (password excluded)

**Example (curl)**:
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "user123",
    "password": "password123"
  }'
```

**Response**:
```json
{
  "result": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "username": "user123",
      "provider": "local",
      "is_active": 1
    }
  }
}
```

---

## 2. Login

**Endpoint**: `POST /api/auth/login`

**Body**:
```typescript
{
  email: string;
  password: string;
}
```

**Process**:
1. Find user by email (case-insensitive: `LOWER(email)`)
2. Verify password with bcrypt.compare()
3. Update `last_login` timestamp
4. Return user object

**Example (curl)**:
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Response**: Same as register

**Future**: Will return JWT token in `data.token`

---

## 3. List Users

**Endpoint**: `GET /api/auth/users`

**Purpose**: Test endpoint to view all registered users

**Response**:
```json
{
  "result": true,
  "message": "Users retrieved successfully",
  "data": {
    "users": [...],
    "count": 5
  }
}
```

---

## 4. Security Considerations

### 4.1 Password Security

#### 4.1.1 Hashing Algorithm
- **Algorithm**: bcrypt
- **Cost Factor**: 10 rounds (2^10 = 1024 iterations)
- **Salt**: Automatically generated per password

**Why bcrypt?**:
- ✅ Slow by design (prevents brute force)
- ✅ Built-in salt
- ✅ Adaptive (can increase cost factor)

**Code**:
```typescript
// Hash
const hash = await bcrypt.hash(password, 10)

// Verify
const isValid = await bcrypt.compare(password, hash)
```

> **IMPORTANT**: **절대 비밀번호를 평문으로 저장하지 마세요**. bcrypt cost factor를 10 이상으로 유지하세요 (보안 vs 성능 균형).

---

#### 4.1.2 Password Requirements

**Current**:
- Minimum length: 6 characters
- No complexity requirements

**Recommended (Future)**:
- Minimum length: 8-12 characters
- At least 1 uppercase, 1 lowercase, 1 digit
- Common password blacklist (password123, qwerty 등)

---

### 4.2 SQL Injection Prevention

**Pattern**: Parameterized Queries

**✅ Secure**:
```typescript
await db.run(
  'SELECT * FROM users WHERE email = ?',
  [email]
)
```

**❌ Vulnerable**:
```typescript
await db.run(
  `SELECT * FROM users WHERE email = '${email}'`
)
// → SQL Injection 취약점!
```

**적용 상태**: ✅ 모든 DB 쿼리가 parameterized queries 사용

---

### 4.3 Cross-Site Scripting (XSS) Prevention

#### 4.3.1 Helmet Middleware

**설정** (server.ts):
```typescript
import helmet from '@fastify/helmet'

app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  }
})
```

**효과**:
- ✅ X-XSS-Protection header
- ✅ Content-Security-Policy header
- ✅ X-Frame-Options header (Clickjacking 방지)

---

#### 4.3.2 Input Validation

**TypeBox Schema Validation**:
```typescript
const RegisterSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  username: Type.String({ minLength: 3, maxLength: 20 }),
  password: Type.String({ minLength: 6 })
})
```

**효과**:
- ✅ 타입 검증
- ✅ 길이 제한
- ✅ 이메일 형식 검증

---

### 4.4 Cross-Origin Resource Sharing (CORS)

**설정** (server.ts):
```typescript
import cors from '@fastify/cors'

app.register(cors, {
  origin: [
    'http://localhost:3000',  // Web dev
    'http://localhost:19006', // Mobile dev
    process.env.PRODUCTION_URL
  ],
  credentials: true
})
```

**효과**:
- ✅ 허용된 origin만 API 접근 가능
- ✅ Credentials (cookies) 전송 허용

> **WARNING**: Production 배포 시 반드시 `origin`을 실제 도메인으로 제한하세요. `origin: '*'`는 모든 도메인을 허용하므로 위험합니다.

---

### 4.5 Rate Limiting (Future)

**문제**: 무차별 대입 공격 (Brute Force)

**해결**:
```typescript
import rateLimit from '@fastify/rate-limit'

app.register(rateLimit, {
  max: 5,  // 5 requests
  timeWindow: '1 minute'  // per minute
})

// Login endpoint에만 적용
app.post('/api/auth/login', {
  config: {
    rateLimit: {
      max: 5,
      timeWindow: '15 minutes'
    }
  }
}, async (request, reply) => { ... })
```

**효과**:
- ✅ 계정당 15분에 5번만 로그인 시도 허용
- ✅ Brute force 공격 방지

**현재 상태**: ❌ 미적용 (향후 구현 예정)

---

### 4.6 JWT Token Security (Future)

**Current**: Stateless (no token)

**Future Plan**:
1. Login 성공 → JWT 발급
2. `data.token` 필드로 반환
3. Client → `Authorization: Bearer <token>` 헤더로 전송
4. Server → JWT 검증 미들웨어

**JWT Payload**:
```json
{
  "userId": 1,
  "email": "user@example.com",
  "iat": 1234567890,
  "exp": 1234654290
}
```

**Secret Key**: 환경 변수로 관리 (`JWT_SECRET`)

---

### 4.7 HTTPS (Production)

> **IMPORTANT**: Production 환경에서는 **반드시 HTTPS를 사용**하세요. HTTP는 중간자 공격(MITM)에 취약합니다.

**설정**:
- Reverse Proxy (Nginx, Caddy) 사용
- SSL/TLS 인증서 (Let's Encrypt 무료)
- HTTP → HTTPS 리다이렉트

---

### 4.8 Environment Variables

**Sensitive Data**:
```bash
# .env (Git에 커밋하지 않음!)
DATABASE_PATH=./data/niney.db
JWT_SECRET=your-super-secret-key-change-this
BCRYPT_ROUNDS=10
```

**Loading** (server.ts):
```typescript
import dotenv from 'dotenv'
dotenv.config()

const jwtSecret = process.env.JWT_SECRET || 'default-dev-secret'
```

> **WARNING**: `.env` 파일을 **절대 Git에 커밋하지 마세요**. `.gitignore`에 추가하세요.

---

### 4.9 Security Checklist

#### Development
- [x] bcrypt 10 rounds 이상
- [x] Parameterized queries
- [x] TypeBox 입력 검증
- [x] Helmet 미들웨어
- [x] CORS 설정
- [ ] Rate limiting (향후)
- [ ] JWT 토큰 (향후)

#### Production
- [ ] HTTPS 강제
- [ ] 환경 변수 보안 관리
- [ ] Rate limiting 적용
- [ ] 에러 메시지 일반화 (정보 노출 방지)
- [ ] 로그 모니터링 (의심 활동 탐지)

---

## 5. Common Vulnerabilities

### 5.1 Timing Attacks

**문제**: 비밀번호 비교 시 실패 위치에 따라 시간 차이

**해결**: bcrypt.compare()는 constant-time 비교 사용 (✅ 안전)

---

### 5.2 User Enumeration

**문제**: "이메일이 존재하지 않습니다" vs "비밀번호가 틀렸습니다"

**해결**:
```typescript
// ✅ 일반화된 메시지
return reply.status(401).send({
  result: false,
  message: 'Invalid credentials'
})
```

**적용 상태**: ✅ auth.routes.ts에 적용됨

---

### 5.3 Session Fixation

**현재 상태**: Stateless (세션 없음) → 해당 없음

**Future (JWT)**: JWT는 서버에 저장되지 않으므로 Session Fixation 위험 없음

---

## 6. Related Documentation

- **[PERFORMANCE.md](../00-core/PERFORMANCE.md)** - 성능 최적화 (bcrypt rounds vs 성능)
- **[DEVELOPMENT.md](../00-core/DEVELOPMENT.md)** - 환경 변수 설정
- **[DATABASE.md](../00-core/DATABASE.md)** - SQL Injection 방지

---

**See Also**:
- [SHARED-SERVICES.md](../03-shared/SHARED-SERVICES.md) - API client
- [SHARED-HOOKS.md](../03-shared/SHARED-HOOKS.md) - useLogin hook
- [DATABASE.md](../00-core/DATABASE.md) - Users table schema
