# MOBILE-TESTING.md

> **Last Updated**: 2025-10-23 22:35
> **Purpose**: Maestro E2E testing framework for React Native mobile app

---

## Table of Contents

1. [Overview](#1-overview)
2. [Installation and Setup](#2-installation-and-setup)
3. [Configuration](#3-configuration)
4. [Test Files](#4-test-files)
5. [Running Tests](#5-running-tests)
6. [Maestro Studio](#6-maestro-studio)
7. [Test Patterns](#7-test-patterns)
8. [Troubleshooting](#8-troubleshooting)
9. [Related Documentation](#9-related-documentation)

---

## 1. Overview

The mobile app uses **Maestro** for end-to-end testing. Maestro is a simple, declarative mobile UI testing framework with YAML-based test flows.

### Why Maestro?

**Advantages over Detox/Appium:**
- **Simple YAML syntax** (no coding required)
- **Fast execution** (native automation)
- **Cross-platform** (same tests for iOS and Android)
- **Interactive debugging** (Maestro Studio)
- **No test code maintenance** (declarative approach)

### Test Files

**Location**: `apps/mobile/.maestro/`

```
apps/mobile/.maestro/
├── config.yaml      # Maestro configuration (14 lines)
├── smoke.yaml       # Smoke test (18 lines)
├── login.yaml       # Login flow test (38 lines)
└── README.md        # Test documentation (86 lines)
```

### Test Coverage

Current test scenarios:
1. **Smoke Test**: Basic app launch and initial screen verification
2. **Login Flow**: Full login process with test credentials

**Future Tests** (Planned):
- Restaurant list navigation
- Restaurant detail view
- Tab navigation (Home, Restaurant, Settings)
- Theme toggle
- Logout flow

---

## 2. Installation and Setup

### 2.1 Prerequisites

**System Requirements**:
- macOS/Linux: Native support
- Windows: WSL2 required

**Dependencies**:
- Running Android emulator or iOS simulator
- React Native app installed on device

### 2.2 Installation

#### macOS/Linux

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

#### Windows

```bash
# In WSL2 terminal
curl -Ls "https://get.maestro.mobile.dev" | bash
```

### 2.3 Verification

```bash
maestro --version
# Expected: maestro 1.x.x
```

### 2.4 Project Setup

No project-specific setup required. Maestro CLI automatically detects:
- Running emulators/simulators
- Installed apps matching `appId` in config

---

## 3. Configuration

### 3.1 config.yaml

**File**: `apps/mobile/.maestro/config.yaml`

**Lines**: 14

```yaml
# Maestro Configuration
appId: com.nineylifepickr

# Environment variables for testing
env:
  TEST_EMAIL: niney@ks.com
  TEST_PASSWORD: tester

# Default settings
onFlowStart:
  - clearState

onFlowComplete:
  - stopApp
```

### 3.2 Configuration Properties

#### appId

```yaml
appId: com.nineylifepickr
```

**Purpose**: Identifies the app to test (Android package name / iOS bundle identifier)

**Usage**: Must match `applicationId` in `android/app/build.gradle`

#### Environment Variables

```yaml
env:
  TEST_EMAIL: niney@ks.com
  TEST_PASSWORD: tester
```

**Purpose**: Shared test credentials used across all test flows

**Usage in Tests**:
```yaml
- inputText: ${TEST_EMAIL}
- inputText: ${TEST_PASSWORD}
```

#### Flow Lifecycle Hooks

```yaml
onFlowStart:
  - clearState
```

**Purpose**: Reset app state before each test (deletes data, logs out user)

```yaml
onFlowComplete:
  - stopApp
```

**Purpose**: Stop app after each test to ensure clean state for next test

---

## 4. Test Files

### 4.1 Smoke Test (smoke.yaml)

**Purpose**: Verify basic app launch and initial screen

**File**: `apps/mobile/.maestro/smoke.yaml`

**Lines**: 18

```yaml
appId: com.nineylifepickr
---
# Smoke Test - Basic App Launch

- launchApp:
    clearState: true

# Verify app launches successfully
- assertVisible: "Life Pickr"

# Wait for initial loading to complete
- waitForAnimationToEnd

# Verify we're on login screen (when not authenticated)
- assertVisible: "이메일을 입력하세요"
- assertVisible: "비밀번호를 입력하세요"
- assertVisible: "로그인"
```

**Test Steps**:
1. Launch app with cleared state
2. Verify app title "Life Pickr" is visible
3. Wait for animations to complete
4. Verify login form elements are visible

**Expected Result**: App launches successfully and shows login screen

**Duration**: ~3-5 seconds

### 4.2 Login Flow Test (login.yaml)

**Purpose**: Test complete login process with test credentials

**File**: `apps/mobile/.maestro/login.yaml`

**Lines**: 38

```yaml
appId: com.nineylifepickr
---
# Login Flow E2E Test

- launchApp:
    clearState: true

# Wait for app to load
- assertVisible: "Life Pickr"
- assertVisible: "당신의 라이프스타일을 선택하세요"

# Check login form elements are visible
- assertVisible: "이메일"
- assertVisible: "비밀번호"
- assertVisible: "비밀번호를 잊으셨나요?"
- assertVisible: "로그인"
- assertVisible: "계정이 없으신가요?"
- assertVisible: "회원가입"

# Fill in login form
- tapOn: "이메일을 입력하세요"
- inputText: ${TEST_EMAIL}

- tapOn: "비밀번호를 입력하세요"
- inputText: ${TEST_PASSWORD}

# Submit login
- tapOn: "로그인"

# Wait for alert and accept
- waitForAnimationToEnd

# Check if navigated to home screen
# Adjust this based on your home screen content
- assertVisible:
    text: "홈"
    timeout: 10000
```

**Test Steps**:
1. Launch app with cleared state
2. Verify login screen UI elements
3. Tap email input field
4. Enter test email (`niney@ks.com`)
5. Tap password input field
6. Enter test password (`tester`)
7. Tap "로그인" button
8. Wait for navigation animation
9. Verify "홈" tab is visible (home screen)

**Expected Result**: User is logged in and home screen is displayed

**Duration**: ~8-12 seconds

**Note**: Uses `${TEST_EMAIL}` and `${TEST_PASSWORD}` from `config.yaml`

---

## 5. Running Tests

### 5.1 Test Scripts (package.json)

**Location**: `apps/mobile/package.json`

```json
{
  "scripts": {
    "test": "jest",
    "test:e2e": "maestro test .maestro",
    "test:e2e:smoke": "maestro test .maestro/smoke.yaml",
    "test:e2e:login": "maestro test .maestro/login.yaml",
    "test:e2e:studio": "maestro studio"
  }
}
```

### 5.2 Running All Tests

```bash
cd apps/mobile
npm run test:e2e
```

**Output**:
```
Running tests in .maestro/

✓ smoke.yaml (3.2s)
✓ login.yaml (9.8s)

2 tests passed
```

**Maestro Command**:
```bash
maestro test .maestro
```

### 5.3 Running Specific Tests

#### Smoke Test Only

```bash
npm run test:e2e:smoke
```

**Maestro Command**:
```bash
maestro test .maestro/smoke.yaml
```

#### Login Test Only

```bash
npm run test:e2e:login
```

**Maestro Command**:
```bash
maestro test .maestro/login.yaml
```

### 5.4 Running with App

**Android**:
```bash
# Terminal 1: Start React Native
npm run android

# Terminal 2: Run tests
npm run test:e2e
```

**iOS**:
```bash
# Terminal 1: Start React Native
npm run ios

# Terminal 2: Run tests
npm run test:e2e
```

**Note**: Maestro automatically finds running emulator/simulator

### 5.5 Test Output

**Success**:
```
✓ smoke.yaml (3.2s)
  ✓ launchApp
  ✓ assertVisible: Life Pickr
  ✓ waitForAnimationToEnd
  ✓ assertVisible: 이메일을 입력하세요
```

**Failure**:
```
✗ login.yaml (5.1s)
  ✓ launchApp
  ✓ assertVisible: Life Pickr
  ✗ tapOn: 로그인
    Element not found: 로그인
```

---

## 6. Maestro Studio

### 6.1 Overview

**Maestro Studio** is an interactive mode for:
- Building tests visually
- Debugging failing tests
- Inspecting UI hierarchy
- Recording user interactions

### 6.2 Launching Studio

```bash
npm run test:e2e:studio
```

**Maestro Command**:
```bash
maestro studio
```

### 6.3 Studio Interface

**Features**:
- **Screen Preview**: Live view of device screen
- **UI Hierarchy**: Tree view of all UI elements
- **Command Palette**: Execute Maestro commands
- **Inspector**: View element properties (text, ID, bounds)

### 6.4 Studio Workflow

**Building a Test**:
1. Launch Maestro Studio
2. Interact with app on device (tap, scroll, input)
3. Studio records interactions as YAML
4. Copy generated YAML to test file

**Debugging a Test**:
1. Open failing test in Studio
2. Step through commands one by one
3. Inspect UI hierarchy at failure point
4. Identify correct selector/text
5. Update test file with fix

### 6.5 Example Usage

```bash
maestro studio
```

**In Studio**:
1. Select device (emulator/simulator)
2. Click "Launch App" → Enter `com.nineylifepickr`
3. Interact with app (tap buttons, fill inputs)
4. Copy generated YAML commands
5. Paste into `.maestro/new-test.yaml`

---

## 7. Test Patterns

### 7.1 Common Maestro Commands

#### Launch App

```yaml
- launchApp:
    clearState: true
```

**Purpose**: Start app and optionally clear data/state

#### Assert Visible

```yaml
- assertVisible: "텍스트"
```

**Purpose**: Verify element with text is visible on screen

**With Timeout**:
```yaml
- assertVisible:
    text: "홈"
    timeout: 10000
```

#### Tap On

```yaml
- tapOn: "로그인"
```

**Purpose**: Tap element with matching text

#### Input Text

```yaml
- inputText: "example@email.com"
```

**Purpose**: Type text into focused input field

**With Environment Variable**:
```yaml
- inputText: ${TEST_EMAIL}
```

#### Wait for Animation

```yaml
- waitForAnimationToEnd
```

**Purpose**: Wait for all animations to complete before continuing

#### Stop App

```yaml
- stopApp
```

**Purpose**: Close the app

### 7.2 Test Structure Pattern

```yaml
appId: com.nineylifepickr
---
# Test Name

# 1. Setup
- launchApp:
    clearState: true

# 2. Verify initial state
- assertVisible: "Expected Text"

# 3. Perform actions
- tapOn: "Button"
- inputText: "Value"

# 4. Verify result
- assertVisible: "Success Message"
```

### 7.3 Selectors Best Practices

**Prefer Text Selectors**:
```yaml
# ✅ Good: Text selector (visible to users)
- tapOn: "로그인"

# ❌ Avoid: TestID selector (requires code changes)
- tapOn:
    id: "login-button"
```

**Reason**: Maestro prioritizes visible text for better test readability and maintenance

**When to Use TestID**:
- Element has no visible text (icons, images)
- Multiple elements have same text
- Dynamic text content

### 7.4 Environment Variables

**Definition** (config.yaml):
```yaml
env:
  TEST_EMAIL: niney@ks.com
  TEST_PASSWORD: tester
```

**Usage** (test files):
```yaml
- inputText: ${TEST_EMAIL}
- inputText: ${TEST_PASSWORD}
```

**Benefits**:
- Centralized test data
- Easy credential updates
- Reusable across test files

---

## 8. Troubleshooting

### 8.1 App Not Found

**Error**:
```
Error: App with id "com.nineylifepickr" not found
```

**Solutions**:
1. Verify emulator/simulator is running:
   ```bash
   # Android
   adb devices

   # iOS
   xcrun simctl list devices | grep Booted
   ```
2. Install app on device:
   ```bash
   npm run android
   # or
   npm run ios
   ```
3. Verify `appId` matches app's package name/bundle ID

### 8.2 Element Not Found

**Error**:
```
Element not found: "로그인"
```

**Solutions**:
1. Use Maestro Studio to inspect UI hierarchy
2. Check element text spelling and case
3. Wait for animations to complete:
   ```yaml
   - waitForAnimationToEnd
   - assertVisible: "로그인"
   ```
4. Increase timeout:
   ```yaml
   - assertVisible:
       text: "로그인"
       timeout: 10000
   ```
5. Check if element is scrolled off-screen (add scroll action)

### 8.3 Test Flakiness

**Problem**: Test passes sometimes, fails other times

**Solutions**:
1. Add explicit waits:
   ```yaml
   - waitForAnimationToEnd
   ```
2. Increase timeouts for slow operations:
   ```yaml
   - assertVisible:
       text: "Success"
       timeout: 15000
   ```
3. Clear state consistently:
   ```yaml
   - launchApp:
       clearState: true
   ```

### 8.4 Maestro CLI Issues

**Problem**: `maestro` command not found

**Solution**:
```bash
# Reinstall Maestro
curl -Ls "https://get.maestro.mobile.dev" | bash

# Verify installation
maestro --version
```

---

## 9. Related Documentation

### Mobile Documentation
- **[MOBILE-SETUP.md](./MOBILE-SETUP.md)**: Metro bundler and TypeScript setup
- **[MOBILE-NAVIGATION.md](./MOBILE-NAVIGATION.md)**: React Navigation structure
- **[MOBILE-LOGIN.md](./MOBILE-LOGIN.md)**: Login screen implementation
- **[MOBILE-HOME.md](./MOBILE-HOME.md)**: Home screen (post-login)

### Web Testing (Comparison)
- **[WEB-TESTING.md](../01-web/WEB-TESTING.md)**: Playwright E2E tests

### Core Documentation
- **[DEVELOPMENT.md](../00-core/DEVELOPMENT.md)**: Development workflow
- **[ARCHITECTURE.md](../00-core/ARCHITECTURE.md)**: Overall architecture

---

## Appendix: Maestro vs Other Frameworks

### Maestro vs Detox

| Feature | Maestro | Detox |
|---------|---------|-------|
| **Syntax** | YAML (declarative) | JavaScript (imperative) |
| **Setup** | 1 config file | Complex configuration |
| **iOS Support** | Built-in | Requires Xcode setup |
| **Android Support** | Built-in | Requires Gradle setup |
| **Learning Curve** | Low (YAML only) | High (Jest + JS + API) |
| **Debugging** | Maestro Studio (GUI) | Console logs |
| **CI/CD** | Simple CLI | Complex setup |

### Maestro vs Appium

| Feature | Maestro | Appium |
|---------|---------|--------|
| **Language** | YAML | Any (Java, Python, JS, etc.) |
| **Speed** | Fast (native) | Slower (client-server) |
| **Setup** | CLI only | Server + client SDKs |
| **Cross-platform** | Same test for iOS/Android | Separate selectors needed |
| **Inspector** | Maestro Studio | Appium Inspector (separate tool) |

---

## Appendix: Writing New Tests

### Step 1: Use Maestro Studio

```bash
maestro studio
```

1. Select device
2. Launch app (`com.nineylifepickr`)
3. Perform desired user flow
4. Copy generated YAML

### Step 2: Create Test File

```bash
touch apps/mobile/.maestro/new-feature.yaml
```

### Step 3: Add Test Structure

```yaml
appId: com.nineylifepickr
---
# New Feature Test

- launchApp:
    clearState: true

# Add test steps here...
```

### Step 4: Run and Refine

```bash
maestro test .maestro/new-feature.yaml
```

Iterate until test passes consistently.

### Step 5: Add to Test Suite

Tests in `.maestro/` are automatically included in:
```bash
npm run test:e2e
```

---

## Appendix: CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  mobile-e2e:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Maestro
        run: curl -Ls "https://get.maestro.mobile.dev" | bash

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd apps/mobile
          npm ci

      - name: Build iOS app
        run: |
          cd apps/mobile/ios
          pod install
          xcodebuild -workspace NineyLifePickr.xcworkspace \
            -scheme NineyLifePickr -configuration Release \
            -sdk iphonesimulator -derivedDataPath build

      - name: Start simulator
        run: |
          xcrun simctl boot "iPhone 14" || true

      - name: Run Maestro tests
        run: |
          cd apps/mobile
          maestro test .maestro
```

**Key Points**:
- macOS runner required for iOS
- Install Maestro in CI
- Build app before testing
- Start emulator/simulator
- Run Maestro CLI

---

**Document Version**: 1.0.0
**Covers Files**: `config.yaml`, `smoke.yaml`, `login.yaml`, Maestro CLI, test patterns
