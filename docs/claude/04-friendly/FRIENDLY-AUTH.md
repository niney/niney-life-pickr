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

## Security

- **Password Hashing**: bcrypt with 10 rounds
- **SQL Injection**: Parameterized queries
- **Headers**: Helmet middleware (XSS protection, CSP)
- **CORS**: Configured for frontend origins

---

**See Also**:
- [SHARED-SERVICES.md](../03-shared/SHARED-SERVICES.md) - API client
- [SHARED-HOOKS.md](../03-shared/SHARED-HOOKS.md) - useLogin hook
- [DATABASE.md](../00-core/DATABASE.md) - Users table schema
