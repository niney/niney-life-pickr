# FRIENDLY-TESTING.md

> **Last Updated**: 2025-10-23 23:45
> **Purpose**: Testing strategy with Vitest and Supertest

---

## Quick Reference

**Test Framework**: Vitest
**HTTP Testing**: Supertest
**Location**: `src/__tests__/`
**Coverage**: 80% threshold

---

## 1. Test Commands

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Integration tests only
npm run test:integration

# Unit tests only
npm run test:unit

# Specific route tests
npm run test:auth
npm run test:crawler
npm run test:restaurant

# Coverage report
npm run test:coverage
```

---

## 2. Test Structure

```
src/__tests__/
├── integration/              # Full HTTP request tests
│   ├── auth.routes.test.ts
│   ├── crawler.routes.test.ts
│   └── restaurant.routes.test.ts
└── unit/                     # Isolated logic tests
    ├── validators.test.ts
    └── helpers.test.ts
```

---

## 3. Integration Tests

**Pattern**: Full HTTP request/response cycle with Supertest

**Example** (`auth.routes.test.ts`):
```typescript
describe('POST /api/auth/register', () => {
  it('should register new user', async () => {
    const response = await request(app.server)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123'
      });

    expect(response.status).toBe(200);
    expect(response.body.result).toBe(true);
    expect(response.body.data.user).toHaveProperty('id');
  });
});
```

**Database**: In-memory SQLite, reset before each test suite

---

## 4. Unit Tests

**Pattern**: Isolated function testing with mocked dependencies

**Example** (`validators.test.ts`):
```typescript
describe('emailValidator', () => {
  it('should validate correct email', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
  });

  it('should reject invalid email', () => {
    expect(isValidEmail('invalid')).toBe(false);
  });
});
```

---

## 5. Test Database

**Strategy**: Separate in-memory SQLite for each test suite

**Setup**:
```typescript
beforeAll(async () => {
  // Create test database
  await runMigrations(testDb);
});

afterAll(async () => {
  // Close test database
  await testDb.close();
});

beforeEach(async () => {
  // Clear data between tests
  await testDb.exec('DELETE FROM users');
});
```

---

## 6. Coverage

**Threshold**: 80% (lines, branches, functions, statements)

**Command**: `npm run test:coverage`

**Report**: Terminal output + HTML report in `coverage/`

---

**See Also**:
- [FRIENDLY-OVERVIEW.md](./FRIENDLY-OVERVIEW.md) - Testing overview
- [DEVELOPMENT.md](../00-core/DEVELOPMENT.md) - Development workflow
