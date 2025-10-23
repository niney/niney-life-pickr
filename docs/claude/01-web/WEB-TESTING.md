# WEB-TESTING.md

> **Last Updated**: 2025-10-23 21:50
> **Purpose**: Playwright E2E testing documentation for web application

---

## Table of Contents

1. [Overview](#1-overview)
2. [Playwright Configuration](#2-playwright-configuration)
3. [Test Structure](#3-test-structure)
4. [Login Flow Tests](#4-login-flow-tests)
5. [Running Tests](#5-running-tests)
6. [Writing Tests](#6-writing-tests)
7. [Best Practices](#7-best-practices)
8. [Related Documentation](#8-related-documentation)

---

## 1. Overview

The web application uses **Playwright 1.55.1** for end-to-end (E2E) testing. Playwright provides cross-browser testing with support for Chromium, Firefox, and WebKit, as well as mobile viewports.

### Key Features
- **Cross-browser**: Chromium, Mobile Chrome, Mobile Safari
- **Auto-start Dev Server**: Automatically starts Vite dev server before tests
- **Visual Testing**: Screenshots and videos on failure
- **Trace Viewer**: Debug failed tests with detailed traces
- **Parallel Execution**: Run tests in parallel for faster execution

### Test Coverage
- ✅ Login flow with valid credentials
- ✅ Alert handling (success messages)
- ⏳ Navigation tests (future)
- ⏳ Form validation tests (future)
- ⏳ Restaurant CRUD tests (future)

---

## 2. Playwright Configuration

### 2.1 File Location

**Location**: `apps/web/playwright.config.ts`

### 2.2 Configuration

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',  // Test files directory

  /* Parallel execution */
  fullyParallel: true,

  /* CI configuration */
  forbidOnly: !!process.env.CI,  // Fail if test.only in CI
  retries: process.env.CI ? 2 : 0,  // Retry twice on CI
  workers: process.env.CI ? 1 : undefined,  // Sequential on CI

  /* Reporter */
  reporter: [
    ['html'],  // HTML report at playwright-report/index.html
    ['list'],  // Console output
  ],

  /* Shared settings */
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',  // Trace only when retrying
    screenshot: 'only-on-failure',  // Screenshot on failure
    video: 'retain-on-failure',  // Video on failure
  },

  /* Browser projects */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Auto-start dev server */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,  // Reuse local dev server
    timeout: 120 * 1000,  // 2 minutes
  },
});
```

### 2.3 Key Settings Explained

#### Base URL
```typescript
baseURL: 'http://localhost:3000'
```

**Usage in tests**:
```typescript
await page.goto('/login')  // Resolves to http://localhost:3000/login
```

#### Trace on Retry
```typescript
trace: 'on-first-retry'
```

**Purpose**: Captures detailed trace (network, console, DOM snapshots) when test fails and is retried. View with `npx playwright show-trace`.

#### Screenshot & Video
```typescript
screenshot: 'only-on-failure'
video: 'retain-on-failure'
```

**Purpose**: Captures screenshot and video only when test fails, saving disk space.

#### Web Server Auto-start
```typescript
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
}
```

**Behavior**:
- **Local**: Reuses existing dev server if running
- **CI**: Always starts new server
- **Timeout**: 2 minutes to start server

#### Projects (Browser Matrix)
```typescript
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
]
```

**Effect**: Each test runs on 3 browsers (Chromium, Mobile Chrome, Mobile Safari)

---

## 3. Test Structure

### 3.1 Test Directory

```
apps/web/
├── e2e/
│   └── login.spec.ts      # Login flow tests
├── playwright.config.ts   # Playwright configuration
└── package.json
```

### 3.2 Test File Naming

**Convention**: `*.spec.ts` or `*.test.ts`

**Example**:
- `login.spec.ts`: Login tests
- `restaurant.spec.ts`: Restaurant tests (future)
- `navigation.spec.ts`: Navigation tests (future)

### 3.3 Test Structure Pattern

```typescript
import { test, expect } from '@playwright/test';

// Test constants
const TEST_ACCOUNT = {
  email: 'niney@ks.com',
  password: 'tester',
};

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should do something', async ({ page }) => {
    // Test implementation
  });
});
```

---

## 4. Login Flow Tests

### 4.1 File Location

**Location**: `apps/web/e2e/login.spec.ts`

### 4.2 Test Implementation

```typescript
import { test, expect } from '@playwright/test';

// Test account from seed data
const TEST_ACCOUNT = {
  email: 'niney@ks.com',
  password: 'tester',
};

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure logged-out state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
  });

  test('should login successfully and navigate to home', async ({ page }) => {
    // Setup alert handler
    page.on('dialog', async dialog => {
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toContain('로그인');
      await dialog.accept();
    });

    await page.goto('/login');

    // Fill in the form
    await page.getByPlaceholder('이메일을 입력하세요').fill(TEST_ACCOUNT.email);
    await page.getByPlaceholder('비밀번호를 입력하세요').fill(TEST_ACCOUNT.password);

    // Click login button
    await page.getByText('로그인', { exact: true }).click();

    // Wait for navigation to home page
    await page.waitForURL('/');

    // Check that we're on the home page
    await expect(page).toHaveURL('/');
  });
});
```

### 4.3 Test Breakdown

#### Step 1: Clear State
```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});
```

**Purpose**: Ensure clean state (logged out) before each test

#### Step 2: Alert Handler
```typescript
page.on('dialog', async dialog => {
  expect(dialog.type()).toBe('alert');
  expect(dialog.message()).toContain('로그인');
  await dialog.accept();
});
```

**Why?**: Web app shows alert on successful login. Without handler, test would hang.

**Verification**:
- Dialog type is `alert`
- Message contains "로그인" (Login)

#### Step 3: Navigate to Login
```typescript
await page.goto('/login');
```

#### Step 4: Fill Form
```typescript
await page.getByPlaceholder('이메일을 입력하세요').fill(TEST_ACCOUNT.email);
await page.getByPlaceholder('비밀번호를 입력하세요').fill(TEST_ACCOUNT.password);
```

**Selector Strategy**: Use placeholder text (user-facing, resilient to DOM changes)

**Alternative Selectors**:
```typescript
await page.getByLabel('이메일').fill(email)  // By label
await page.getByRole('textbox', { name: '이메일' }).fill(email)  // By role
await page.locator('input[type="email"]').fill(email)  // By CSS
```

#### Step 5: Submit Form
```typescript
await page.getByText('로그인', { exact: true }).click();
```

**Important**: `{ exact: true }` ensures we click "로그인" button, not "로그인 중..." (loading state)

**Why Not `getByRole('button')`?**
- React Native Web renders buttons as `<div>` with `onClick`
- Not semantic `<button>` elements
- Use `getByText()` instead

#### Step 6: Wait for Navigation
```typescript
await page.waitForURL('/');
```

**Purpose**: Wait for redirect to home page after login

#### Step 7: Verify URL
```typescript
await expect(page).toHaveURL('/');
```

**Final check**: Confirm we're on home page

---

## 5. Running Tests

### 5.1 Available Commands

**Location**: `apps/web/package.json`

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report",
    "test:e2e:codegen": "playwright codegen http://localhost:3000"
  }
}
```

### 5.2 Running Tests

#### Run All Tests (Headless)
```bash
cd apps/web
npm run test:e2e
```

**Output**:
```
Running 3 tests using 3 workers
  ✓ [chromium] login.spec.ts:19:3 › should login successfully (2s)
  ✓ [Mobile Chrome] login.spec.ts:19:3 › should login successfully (2s)
  ✓ [Mobile Safari] login.spec.ts:19:3 › should login successfully (2s)

3 passed (6s)
```

#### Run with UI Mode
```bash
npm run test:e2e:ui
```

**Features**:
- Interactive test runner
- Watch mode (auto-rerun on file changes)
- Time travel debugger
- Network/console logs

#### Run in Headed Mode
```bash
npm run test:e2e:headed
```

**Purpose**: See browser UI during test execution

#### Debug Mode
```bash
npm run test:e2e:debug
```

**Features**:
- Playwright Inspector opens
- Step through tests line-by-line
- Inspect elements
- View console logs

#### View Report
```bash
npm run test:e2e:report
```

**Opens**: HTML report at `playwright-report/index.html`

**Contains**:
- Test results (passed/failed)
- Screenshots (on failure)
- Videos (on failure)
- Traces (on retry)

#### Code Generator
```bash
npm run test:e2e:codegen
```

**Purpose**: Generate test code by recording browser interactions

**How it works**:
1. Browser opens with Playwright Inspector
2. Interact with app (click, type, navigate)
3. Playwright generates test code
4. Copy code to test file

---

## 6. Writing Tests

### 6.1 Locator Strategies

#### By Placeholder (Recommended)
```typescript
await page.getByPlaceholder('이메일을 입력하세요').fill('test@example.com')
```

**Pros**: User-facing, resilient to DOM changes
**Cons**: Only works for inputs with placeholders

#### By Label
```typescript
await page.getByLabel('이메일').fill('test@example.com')
```

**Pros**: Accessible, semantic
**Cons**: Requires proper label association

#### By Text
```typescript
await page.getByText('로그인', { exact: true }).click()
```

**Pros**: User-facing, works for any text
**Cons**: May match multiple elements

**Important**: Use `{ exact: true }` to avoid partial matches

#### By Role
```typescript
await page.getByRole('button', { name: '로그인' }).click()
```

**Pros**: Accessible, semantic
**Cons**: Doesn't work with React Native Web (buttons are divs)

#### By Test ID (Not Used)
```typescript
await page.getByTestId('login-button').click()
```

**Pros**: Stable, specific
**Cons**: Requires adding test IDs to code

**Not Used**: Project prioritizes user-facing selectors

### 6.2 Assertions

#### URL Assertions
```typescript
await expect(page).toHaveURL('/')
await expect(page).toHaveURL(/\/restaurant/)  // Regex
```

#### Element Assertions
```typescript
await expect(page.getByText('환영합니다!')).toBeVisible()
await expect(page.getByPlaceholder('이메일')).toBeEmpty()
await expect(page.getByText('로그인 중...')).toBeDisabled()
```

#### Content Assertions
```typescript
await expect(page).toHaveTitle('Life Pickr')
await expect(page.getByText('오류')).toContainText('비밀번호')
```

### 6.3 Handling Alerts

**Pattern**: Register handler before action that triggers alert

```typescript
page.on('dialog', async dialog => {
  expect(dialog.type()).toBe('alert')  // or 'confirm', 'prompt'
  expect(dialog.message()).toContain('로그인')
  await dialog.accept()  // or dialog.dismiss()
})

await page.getByText('로그인').click()  // Action that triggers alert
```

### 6.4 Waiting Strategies

#### Wait for URL
```typescript
await page.waitForURL('/')
await page.waitForURL(/\/restaurant\/\d+/)
```

#### Wait for Element
```typescript
await page.getByText('환영합니다!').waitFor()
await page.getByText('Loading...').waitFor({ state: 'hidden' })
```

#### Wait for Network
```typescript
await page.waitForResponse(response =>
  response.url().includes('/api/login') && response.status() === 200
)
```

---

## 7. Best Practices

### 7.1 Use User-Facing Selectors

**❌ Bad** (CSS/XPath):
```typescript
await page.locator('input[name="email"]').fill('test@example.com')
await page.locator('//button[@type="submit"]').click()
```

**✅ Good** (user-facing):
```typescript
await page.getByPlaceholder('이메일을 입력하세요').fill('test@example.com')
await page.getByText('로그인').click()
```

**Why?**: Resilient to DOM changes, tests from user perspective

### 7.2 Clean State Before Each Test

**Pattern**: Use `beforeEach` to reset state

```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})
```

### 7.3 Handle Async Dialogs

**❌ Bad** (no handler):
```typescript
await page.getByText('로그인').click()
// Test hangs if alert appears
```

**✅ Good** (handler registered):
```typescript
page.on('dialog', async dialog => await dialog.accept())
await page.getByText('로그인').click()
```

### 7.4 Use Exact Match for Buttons

**❌ Bad** (matches loading state):
```typescript
await page.getByText('로그인').click()  // May click "로그인 중..."
```

**✅ Good** (exact match):
```typescript
await page.getByText('로그인', { exact: true }).click()
```

### 7.5 Test Data from Constants

**❌ Bad** (hardcoded):
```typescript
await page.getByPlaceholder('이메일').fill('test@example.com')
```

**✅ Good** (constants):
```typescript
const TEST_ACCOUNT = { email: 'niney@ks.com', password: 'tester' }
await page.getByPlaceholder('이메일').fill(TEST_ACCOUNT.email)
```

---

## 8. Related Documentation

### Web Documentation
- **[WEB-LOGIN.md](./WEB-LOGIN.md)**: Login component implementation
- **[WEB-ROUTING.md](./WEB-ROUTING.md)**: Navigation and routing
- **[WEB-PATTERNS.md](./WEB-PATTERNS.md)**: React Native Web patterns (button rendering)

### Core Documentation
- **[DEVELOPMENT.md](../00-core/DEVELOPMENT.md)**: Development workflow
- **[ARCHITECTURE.md](../00-core/ARCHITECTURE.md)**: Overall architecture

### Friendly Server Documentation
- **[FRIENDLY-AUTH.md](../04-friendly/FRIENDLY-AUTH.md)**: Authentication API
- **[FRIENDLY-TESTING.md](../04-friendly/FRIENDLY-TESTING.md)**: Backend testing

---

## Appendix: Future Test Coverage

### Planned Tests
1. **Restaurant CRUD**:
   - Crawl new restaurant
   - View restaurant detail
   - Recrawl restaurant
   - Delete restaurant

2. **Review Features**:
   - Filter reviews by sentiment
   - Search reviews
   - Infinite scroll
   - AI summarization

3. **Form Validation**:
   - Invalid email format
   - Empty fields
   - Incorrect password

4. **Navigation**:
   - Drawer menu
   - Back button (mobile)
   - URL preservation after login

5. **Theme**:
   - Toggle light/dark mode
   - Theme persistence

6. **Mobile-Specific**:
   - Touch interactions
   - Viewport-specific layouts

---

## Appendix: Playwright Resources

### Official Documentation
- **Playwright Docs**: https://playwright.dev/docs/intro
- **API Reference**: https://playwright.dev/docs/api/class-test
- **Best Practices**: https://playwright.dev/docs/best-practices

### Useful Commands
```bash
# Update Playwright browsers
npx playwright install

# Generate test
npx playwright codegen http://localhost:3000

# Show trace
npx playwright show-trace trace.zip

# Run specific test
npx playwright test login.spec.ts

# Run specific browser
npx playwright test --project=chromium

# Update snapshots
npx playwright test --update-snapshots
```

---

**Document Version**: 1.0.0
**Covers Files**: `playwright.config.ts`, `e2e/login.spec.ts`, Playwright testing patterns
