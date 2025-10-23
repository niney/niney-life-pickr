# WEB-LOGIN.md

> **Last Updated**: 2025-10-23 21:40
> **Purpose**: Login screen implementation with authentication and URL preservation

---

## Table of Contents

1. [Overview](#1-overview)
2. [Component Structure](#2-component-structure)
3. [Implementation](#3-implementation)
4. [Login Flow](#4-login-flow)
5. [URL Preservation](#5-url-preservation)
6. [Auto-Login Feature](#6-auto-login-feature)
7. [Form Components](#7-form-components)
8. [Theme Integration](#8-theme-integration)
9. [Related Documentation](#9-related-documentation)

---

## 1. Overview

The Login component provides the authentication interface for the web application. It uses shared components and hooks to maintain consistency with the mobile app and handles URL preservation for post-login redirection.

### Key Features
- **Shared Components**: InputField and Button from `@shared/components`
- **useLogin Hook**: Form state and API integration
- **URL Preservation**: Saves original URL for post-login redirect
- **Auto-Login**: Automatic login if credentials are pre-filled
- **Theme Support**: Light/dark mode styling
- **Constants-Based**: All strings from constants (internationalization-ready)

### Component Layout
```
Login Screen
├── Header
│   ├── App Title (APP_INFO_CONSTANTS.title)
│   └── Subtitle (APP_INFO_CONSTANTS.subtitle)
├── Login Form
│   ├── Email Input (InputField)
│   ├── Password Input (InputField)
│   ├── Forgot Password Link
│   └── Login Button
└── Sign Up Link
```

---

## 2. Component Structure

### 2.1 File Location

**Location**: `apps/web/src/components/Login.tsx`

### 2.2 Component API

```typescript
interface LoginProps {
  onLoginSuccess?: () => void;  // Callback after successful login
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  // Implementation
}
```

**Props**:
- `onLoginSuccess`: Optional callback to update auth state in parent (App.tsx)

---

## 3. Implementation

### 3.1 Imports and Dependencies

```typescript
import React, { useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { useNavigate } from 'react-router-dom'
import { InputField, Button } from '@shared/components'
import { useLogin } from '@shared/hooks'
import { useTheme } from '@shared/contexts'
import { APP_INFO_CONSTANTS, AUTH_CONSTANTS, THEME_COLORS } from '@shared/constants'
```

**Key Dependencies**:
- **Shared Components**: InputField (email/password), Button (login action)
- **Shared Hooks**: useLogin (form state + API), useTheme (theme colors)
- **Shared Constants**: APP_INFO_CONSTANTS (app name), AUTH_CONSTANTS (form labels)
- **React Router**: useNavigate (post-login navigation)

### 3.2 Component State

```typescript
const navigate = useNavigate()
const {
  email,                    // Email input value
  setEmail,                 // Email setter
  password,                 // Password input value
  setPassword,              // Password setter
  isLoading,                // Login request in progress
  handleLogin: handleLoginBase,  // Base login function from hook
  handleForgotPassword,     // Forgot password handler
  handleSignUp,             // Sign up handler
} = useLogin()

const { theme } = useTheme()
const colors = THEME_COLORS[theme]
const autoLoginAttempted = useRef(false)  // Prevent multiple auto-login attempts
```

**State Sources**:
- `useLogin()`: Form state and actions from shared hook
- `useTheme()`: Current theme for styling
- `autoLoginAttempted`: Ref to prevent repeated auto-login

### 3.3 Full Component Structure

**Container**:
```typescript
<div className="page-container" style={{
  backgroundColor: colors.background,
  justifyContent: 'center',  // Center vertically
  alignItems: 'center'       // Center horizontally
}}>
```

**ScrollView** (for small screens):
```typescript
<View style={styles.container}>  {/* Max-width: 480px */}
  <ScrollView contentContainerStyle={styles.scrollContainer}>
    {/* Header */}
    {/* Form */}
    {/* Sign Up Link */}
  </ScrollView>
</View>
```

**Why ScrollView?**
- Handles small screens / browser zoom
- Allows keyboard to push content up
- Prevents cutoff of form elements

---

## 4. Login Flow

### 4.1 Login Handler

```typescript
const handleLogin = async () => {
  handleLoginBase(async () => {
    // 1. Check for saved redirect URL
    const redirectUrl = sessionStorage.getItem('redirectUrl')

    if (redirectUrl) {
      // 2. Clear saved URL
      sessionStorage.removeItem('redirectUrl')

      // 3. Update auth state
      if (onLoginSuccess) {
        await onLoginSuccess()
      }

      // 4. Navigate to original URL (with delay for state update)
      setTimeout(() => {
        navigate(redirectUrl, { replace: true })
      }, 100)
    } else {
      // No redirect URL: Go to home
      if (onLoginSuccess) {
        await onLoginSuccess()
      }
      navigate('/', { replace: true })
    }
  })
}
```

**Flow Steps**:
1. **handleLoginBase()**: Calls API, validates credentials
2. **Check redirectUrl**: Look for saved URL in sessionStorage
3. **Update Auth State**: Call `onLoginSuccess()` to update App.tsx auth state
4. **Navigate**: Go to saved URL or home page
5. **Replace History**: Use `{ replace: true }` to prevent back button to login

### 4.2 Success Callback Pattern

```typescript
handleLoginBase(async () => {
  // Success callback
  // Called only if login API succeeds
})
```

**Why Callback?**
- `handleLoginBase` is shared with mobile (no navigation logic)
- Web-specific navigation handled in callback
- Clean separation of concerns

### 4.3 onLoginSuccess Callback

**Called from**: App.tsx

```typescript
const handleLoginSuccess = async () => {
  // Re-check auth state
  await checkAuth()
}
```

**Purpose**: Update `isAuthenticated` state in App.tsx to trigger route change

---

## 5. URL Preservation

### 5.1 How It Works

**Scenario**: User tries to access `/restaurant/abc123` without login

**Flow**:
```
1. User navigates to /restaurant/abc123
2. Not authenticated → RedirectToLogin component
3. RedirectToLogin saves '/restaurant/abc123' to sessionStorage
4. User redirected to /login
5. User enters credentials and logs in
6. Login component checks sessionStorage
7. Finds '/restaurant/abc123'
8. Navigates to saved URL
9. Clears sessionStorage
```

### 5.2 Implementation

**Save URL** (in RedirectToLogin component):
```typescript
// apps/web/src/App.tsx
function RedirectToLogin() {
  const location = useLocation()

  useEffect(() => {
    if (location.pathname !== '/login') {
      sessionStorage.setItem('redirectUrl', location.pathname + location.search)
    }
  }, [location])

  return <Navigate to="/login" replace />
}
```

**Restore URL** (in Login component):
```typescript
const redirectUrl = sessionStorage.getItem('redirectUrl')

if (redirectUrl) {
  sessionStorage.removeItem('redirectUrl')
  await onLoginSuccess()
  setTimeout(() => {
    navigate(redirectUrl, { replace: true })
  }, 100)
}
```

### 5.3 Why setTimeout()?

**Problem**: Race condition between auth state update and navigation

**Solution**: 100ms delay ensures:
1. `onLoginSuccess()` completes
2. Auth state updates in App.tsx
3. Protected routes become accessible
4. Navigation succeeds

**Alternative**: Use `await` with auth state check, but timeout is simpler

---

## 6. Auto-Login Feature

### 6.1 Purpose

Automatically log in if credentials are already filled (e.g., browser autofill, dev environment)

### 6.2 Implementation

```typescript
const autoLoginAttempted = useRef(false)

useEffect(() => {
  if (!autoLoginAttempted.current && email && password) {
    autoLoginAttempted.current = true

    // Wait for UI to render (500ms)
    const timer = setTimeout(() => {
      handleLogin()
    }, 500)

    return () => clearTimeout(timer)
  }
}, []) // Run only once on mount
```

**Logic**:
1. **Check Ref**: Ensure auto-login hasn't been attempted
2. **Check Credentials**: Both email and password must be filled
3. **Set Flag**: Mark auto-login as attempted (prevents repeats)
4. **Delay**: Wait 500ms for UI to fully render
5. **Execute**: Call `handleLogin()`

**Why Ref Instead of State?**
- Ref doesn't trigger re-render
- Persists across component lifecycle
- Prevents infinite loop

### 6.3 Use Cases

- **Development**: Pre-fill test credentials for faster testing
- **Browser Autofill**: If browser auto-fills form, login automatically
- **Remembered Credentials**: Password manager fills form

### 6.4 Cleanup

```typescript
return () => clearTimeout(timer)
```

**Purpose**: Cancel auto-login if component unmounts before timer fires

---

## 7. Form Components

### 7.1 Header Section

```typescript
<View style={styles.header}>
  <Text style={[styles.title, { color: colors.text }]}>
    {APP_INFO_CONSTANTS.title}
  </Text>
  <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
    {APP_INFO_CONSTANTS.subtitle}
  </Text>
</View>
```

**Content** (from `apps/shared/constants/app.constants.ts`):
```typescript
export const APP_INFO_CONSTANTS = {
  title: 'Life Pickr',
  subtitle: 'Life decision picker app',
  // ...
}
```

**Styling**:
- Title: 32px, bold, centered
- Subtitle: 16px, secondary color, centered
- Margin bottom: 48px (separation from form)

### 7.2 Email Input

```typescript
<InputField
  label={AUTH_CONSTANTS.STRINGS.email}              // "이메일"
  placeholder={AUTH_CONSTANTS.STRINGS.emailPlaceholder}  // "이메일을 입력하세요"
  value={email}
  onChangeText={setEmail}
  keyboardType="email-address"  // Email keyboard on mobile
  autoCapitalize="none"         // No auto-capitalization
  autoCorrect={false}           // No auto-correction
  required                      // Shows required indicator
/>
```

**InputField Component**: From `@shared/components`
- Cross-platform (web + mobile)
- Built-in label, error handling, theme support
- See `SHARED-COMPONENTS.md` for full API

### 7.3 Password Input

```typescript
<InputField
  label={AUTH_CONSTANTS.STRINGS.password}           // "비밀번호"
  placeholder={AUTH_CONSTANTS.STRINGS.passwordPlaceholder}  // "비밀번호를 입력하세요"
  value={password}
  onChangeText={setPassword}
  secureTextEntry               // Hide password characters
  autoCapitalize="none"
  autoCorrect={false}
  required
/>
```

**Security**: `secureTextEntry` shows dots/asterisks instead of text

### 7.4 Forgot Password Link

```typescript
<TouchableOpacity
  style={styles.forgotPasswordButton}
  onPress={handleForgotPassword}
>
  <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
    {AUTH_CONSTANTS.STRINGS.forgotPassword}  // "비밀번호를 잊으셨나요?"
  </Text>
</TouchableOpacity>
```

**Styling**:
- Aligned to right (`alignSelf: 'flex-end'`)
- Primary color (blue)
- Margin bottom: 24px (above login button)

**Handler** (from useLogin hook):
```typescript
const handleForgotPassword = () => {
  Alert.show('알림', '비밀번호 찾기 기능은 준비 중입니다.')
}
```

**Status**: Placeholder (not yet implemented)

### 7.5 Login Button

```typescript
<Button
  title={isLoading ? AUTH_CONSTANTS.STRINGS.loginProgress : AUTH_CONSTANTS.STRINGS.login}
  onPress={handleLogin}
  loading={isLoading}  // Shows spinner when true
  variant="primary"    // Primary button style (blue)
/>
```

**Button States**:
- **Idle**: "로그인" (Login)
- **Loading**: "로그인 중..." (Logging in...) + spinner
- **Disabled**: Button disabled during loading

**Button Component**: From `@shared/components`
- Cross-platform
- Built-in loading state, variants, theme support

### 7.6 Sign Up Link

```typescript
<View style={styles.signUpContainer}>
  <Text style={[styles.signUpText, { color: colors.textSecondary }]}>
    {AUTH_CONSTANTS.STRINGS.signUpQuestion}  // "계정이 없으신가요?"
  </Text>
  <TouchableOpacity onPress={handleSignUp}>
    <Text style={[styles.signUpLink, { color: colors.primary }]}>
      {AUTH_CONSTANTS.STRINGS.signUp}  // "회원가입"
    </Text>
  </TouchableOpacity>
</View>
```

**Layout**: Horizontal row (question + link)

**Handler** (from useLogin hook):
```typescript
const handleSignUp = () => {
  Alert.show('알림', '회원가입 기능은 준비 중입니다.')
}
```

**Status**: Placeholder (not yet implemented)

---

## 8. Theme Integration

### 8.1 Theme Colors

```typescript
const { theme } = useTheme()
const colors = THEME_COLORS[theme]

// Applied colors
background: colors.background        // Page background
text: colors.text                   // Title, labels
textSecondary: colors.textSecondary // Subtitle, hints
primary: colors.primary             // Links, buttons
```

### 8.2 Styled Elements

**Page Container**:
```typescript
<div style={{ backgroundColor: colors.background }}>
```

**Text Elements**:
```typescript
<Text style={{ color: colors.text }}>         // Primary text
<Text style={{ color: colors.textSecondary }}> // Secondary text
<Text style={{ color: colors.primary }}>       // Links
```

### 8.3 Component Theme Support

**InputField** and **Button** components automatically adapt to theme:
- Border colors
- Background colors
- Text colors
- Focus states

---

## 9. Related Documentation

### Web Documentation
- **[WEB-HOME.md](./WEB-HOME.md)**: Post-login home screen
- **[WEB-ROUTING.md](./WEB-ROUTING.md)**: Protected routes and navigation
- **[WEB-THEME.md](./WEB-THEME.md)**: Theme system
- **[WEB-TESTING.md](./WEB-TESTING.md)**: E2E tests for login flow

### Shared Documentation
- **[SHARED-COMPONENTS.md](../03-shared/SHARED-COMPONENTS.md)**: InputField, Button components
- **[SHARED-HOOKS.md](../03-shared/SHARED-HOOKS.md)**: useLogin hook implementation
- **[SHARED-CONTEXTS.md](../03-shared/SHARED-CONTEXTS.md)**: ThemeContext
- **[SHARED-UTILS.md](../03-shared/SHARED-UTILS.md)**: Alert utility

### Friendly Server Documentation
- **[FRIENDLY-AUTH.md](../04-friendly/FRIENDLY-AUTH.md)**: Authentication API endpoints

### Core Documentation
- **[ARCHITECTURE.md](../00-core/ARCHITECTURE.md)**: Overall architecture
- **[DEVELOPMENT.md](../00-core/DEVELOPMENT.md)**: Development workflow

---

## Appendix: Constants Reference

### APP_INFO_CONSTANTS

**Location**: `apps/shared/constants/app.constants.ts`

```typescript
export const APP_INFO_CONSTANTS = {
  title: 'Life Pickr',
  subtitle: 'Life decision picker app',
  version: '1.0.0',
  description: 'A cross-platform life decision-making application',
}
```

### AUTH_CONSTANTS.STRINGS

**Location**: `apps/shared/constants/auth.constants.ts`

```typescript
export const AUTH_CONSTANTS = {
  STRINGS: {
    // Labels
    email: '이메일',
    password: '비밀번호',

    // Placeholders
    emailPlaceholder: '이메일을 입력하세요',
    passwordPlaceholder: '비밀번호를 입력하세요',

    // Buttons
    login: '로그인',
    loginProgress: '로그인 중...',

    // Links
    forgotPassword: '비밀번호를 잊으셨나요?',
    signUpQuestion: '계정이 없으신가요?',
    signUp: '회원가입',
  },
}
```

**Benefits**:
- Centralized strings
- Easy internationalization (i18n) in future
- Consistent wording across web + mobile

---

## Appendix: Testing Credentials

**Test Account** (for development):
```
Email: niney@ks.com
Password: tester
```

**Location**: Seed data in `servers/friendly/src/db/migrations/002_seed_test_user.sql`

---

**Document Version**: 1.0.0
**Covers Files**: `Login.tsx`, login flow patterns, URL preservation
