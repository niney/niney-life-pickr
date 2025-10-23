# MOBILE-LOGIN.md

> **Last Updated**: 2025-10-23 22:10
> **Purpose**: Mobile Login screen with keyboard handling and safe area support

---

## Table of Contents

1. [Overview](#1-overview)
2. [Component Structure](#2-component-structure)
3. [Implementation](#3-implementation)
4. [Keyboard Handling](#4-keyboard-handling)
5. [Login Flow](#5-login-flow)
6. [Form Components](#6-form-components)
7. [Safe Area Support](#7-safe-area-support)
8. [Styling Details](#8-styling-details)
9. [Related Documentation](#9-related-documentation)

---

## 1. Overview

The Login screen provides the authentication interface for the mobile app. It appears before the navigation stack and handles user login with proper keyboard management and safe area insets.

### Key Features
- **Shared Components**: InputField and Button from `shared/components`
- **useLogin Hook**: Form state and API integration
- **Keyboard Handling**: KeyboardAvoidingView for iOS/Android
- **ScrollView**: Ensures form is accessible when keyboard is visible
- **Safe Area Support**: Proper handling of notched devices
- **Constants-Based**: All strings from shared constants

### Component Layout
```
SafeAreaView
└── KeyboardAvoidingView
    └── ScrollView
        ├── Header
        │   ├── App Title (Life Pickr)
        │   └── Subtitle (Life decision picker app)
        ├── Login Form
        │   ├── Email Input
        │   ├── Password Input
        │   ├── Forgot Password Link
        │   └── Login Button
        └── Sign Up Link
```

---

## 2. Component Structure

### 2.1 File Location

**Location**: `apps/mobile/src/screens/LoginScreen.tsx`

### 2.2 Component Props

```typescript
interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  // Implementation
}
```

**Props**:
- `onLoginSuccess`: Callback after successful login to update App.tsx auth state

**Called from**: App.tsx

```typescript
{isAuthenticated ? (
  <NavigationContainer>
    <BottomTabNavigator />
  </NavigationContainer>
) : (
  <LoginScreen onLoginSuccess={handleLoginSuccess} />
)}
```

### 2.3 Dependencies

```typescript
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InputField, Button } from 'shared/components';
import { useLogin } from 'shared/hooks';
import { APP_INFO_CONSTANTS, AUTH_CONSTANTS } from 'shared/constants';
```

**Key Dependencies**:
- **SafeAreaView**: Handles notched devices (iPhone X+, Android notches)
- **KeyboardAvoidingView**: Pushes content up when keyboard appears
- **ScrollView**: Allows scrolling when content doesn't fit
- **Shared Components**: InputField, Button (cross-platform)
- **Shared Hooks**: useLogin (form state + API)
- **Shared Constants**: APP_INFO_CONSTANTS, AUTH_CONSTANTS

---

## 3. Implementation

### 3.1 State Management

```typescript
const {
  email,                    // Email input value
  setEmail,                 // Email setter
  password,                 // Password input value
  setPassword,              // Password setter
  isLoading,                // Login request in progress
  handleLogin: handleLoginBase,  // Base login function from hook
  handleForgotPassword,     // Forgot password handler
  handleSignUp,             // Sign up handler
} = useLogin();
```

**State Source**: `useLogin()` hook from `shared/hooks`

### 3.2 Login Handler

```typescript
const handleLogin = async () => {
  await handleLoginBase(onLoginSuccess);
};
```

**Flow**:
1. `handleLoginBase()` calls API and validates credentials
2. On success, calls `onLoginSuccess` callback
3. `onLoginSuccess` updates App.tsx state
4. App.tsx re-renders with NavigationContainer

**Difference from Web**:
- Web: Custom navigation logic with URL preservation
- Mobile: Simple callback to trigger state update

### 3.3 Full Component Structure

```typescript
const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const {
    email,
    setEmail,
    password,
    setPassword,
    isLoading,
    handleLogin: handleLoginBase,
    handleForgotPassword,
    handleSignUp,
  } = useLogin();

  const handleLogin = async () => {
    await handleLoginBase(onLoginSuccess);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{APP_INFO_CONSTANTS.title}</Text>
            <Text style={styles.subtitle}>{APP_INFO_CONSTANTS.subtitle}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <InputField
              label={AUTH_CONSTANTS.STRINGS.email}
              placeholder={AUTH_CONSTANTS.STRINGS.emailPlaceholder}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              required
            />

            <InputField
              label={AUTH_CONSTANTS.STRINGS.password}
              placeholder={AUTH_CONSTANTS.STRINGS.passwordPlaceholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              required
            />

            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={handleForgotPassword}
            >
              <Text style={styles.forgotPasswordText}>
                {AUTH_CONSTANTS.STRINGS.forgotPassword}
              </Text>
            </TouchableOpacity>

            <Button
              title={
                isLoading
                  ? AUTH_CONSTANTS.STRINGS.loginProgress
                  : AUTH_CONSTANTS.STRINGS.login
              }
              onPress={handleLogin}
              loading={isLoading}
              variant="primary"
            />
          </View>

          {/* Sign Up Link */}
          <View style={styles.signUpContainer}>
            <Text style={styles.signUpText}>
              {AUTH_CONSTANTS.STRINGS.signUpQuestion}
            </Text>
            <TouchableOpacity onPress={handleSignUp}>
              <Text style={styles.signUpLink}>{AUTH_CONSTANTS.STRINGS.signUp}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
```

---

## 4. Keyboard Handling

### 4.1 KeyboardAvoidingView

```typescript
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={styles.keyboardAvoidingView}
>
  {/* Content */}
</KeyboardAvoidingView>
```

**Purpose**: Pushes content up when keyboard appears, preventing overlap

**Behavior Prop**:
- **iOS**: `'padding'` - Adds bottom padding
- **Android**: `'height'` - Adjusts view height

**Why Platform-Specific?**:
- iOS: Keyboard slides up from bottom, padding works best
- Android: Keyboard can overlay content, height adjustment works better

### 4.2 ScrollView Configuration

```typescript
<ScrollView
  contentContainerStyle={styles.scrollContainer}
  keyboardShouldPersistTaps="handled"
  showsVerticalScrollIndicator={false}
>
```

**Props Explained**:
- `contentContainerStyle`: Styles the content inside ScrollView
- `keyboardShouldPersistTaps="handled"`: Taps are handled by children (prevents keyboard dismiss on tap)
- `showsVerticalScrollIndicator={false}`: Hide scroll indicator for clean look

### 4.3 ScrollView Styling

```typescript
scrollContainer: {
  flexGrow: 1,
  paddingHorizontal: 24,
  justifyContent: 'center',
  minHeight: '100%',
}
```

**Key Settings**:
- `flexGrow: 1`: Allows content to expand beyond screen height
- `paddingHorizontal: 24`: Side padding for content
- `justifyContent: 'center'`: Vertically center content when keyboard is hidden
- `minHeight: '100%'`: Ensures content fills screen

**Effect**: Content is vertically centered when keyboard is hidden, but can scroll when keyboard appears

---

## 5. Login Flow

### 5.1 Login Process

```
User enters credentials
  ↓
Taps "로그인" button
  ↓
handleLogin() called
  ↓
handleLoginBase(onLoginSuccess) called
  ↓
API request to /api/auth/login
  ↓
Success response
  ↓
Save token to AsyncStorage
  ↓
Call onLoginSuccess callback
  ↓
App.tsx: checkAuth() updates isAuthenticated
  ↓
App.tsx: Conditional rendering switches to NavigationContainer
  ↓
BottomTabNavigator appears
  ↓
User sees Home screen
```

### 5.2 onLoginSuccess Callback

**Called from**: Login component

```typescript
const handleLogin = async () => {
  await handleLoginBase(onLoginSuccess);
};
```

**Implementation in App.tsx**:

```typescript
const handleLoginSuccess = async () => {
  await checkAuth();
};
```

**Purpose**: Re-check auth state from AsyncStorage to update `isAuthenticated`

### 5.3 Error Handling

**Handled by useLogin hook**:
- Invalid credentials: Shows alert with error message
- Network error: Shows alert with network error
- Form validation: Prevents submission if fields are empty

**Alert Display**: Cross-platform Alert utility (shows modal on mobile)

---

## 6. Form Components

### 6.1 Header Section

```typescript
<View style={styles.header}>
  <Text style={styles.title}>{APP_INFO_CONSTANTS.title}</Text>
  <Text style={styles.subtitle}>{APP_INFO_CONSTANTS.subtitle}</Text>
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
- Title: 32px, bold, dark gray (#1a1a1a)
- Subtitle: 16px, light gray (#666)
- Aligned center
- Margin bottom: 48px (separation from form)

### 6.2 Email Input

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

**Keyboard Type**: `"email-address"` shows keyboard with @ and . keys

**Auto-Capitalize**: `"none"` prevents first letter capitalization (important for emails)

**Auto-Correct**: `false` prevents word suggestions

### 6.3 Password Input

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

**Security**: `secureTextEntry` shows dots instead of text

### 6.4 Forgot Password Link

```typescript
<TouchableOpacity
  style={styles.forgotPasswordButton}
  onPress={handleForgotPassword}
>
  <Text style={styles.forgotPasswordText}>
    {AUTH_CONSTANTS.STRINGS.forgotPassword}  // "비밀번호를 잊으셨나요?"
  </Text>
</TouchableOpacity>
```

**Styling**:
- Aligned to right (`alignSelf: 'flex-end'`)
- Blue color (#007AFF)
- Font weight: 500
- Margin bottom: 24px (above login button)

**Handler** (from useLogin hook):
```typescript
const handleForgotPassword = () => {
  Alert.show('알림', '비밀번호 찾기 기능은 준비 중입니다.')
}
```

**Status**: Placeholder (not yet implemented)

### 6.5 Login Button

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

**Button Component**: From `shared/components`
- Cross-platform
- Built-in loading state, variants, theme support

### 6.6 Sign Up Link

```typescript
<View style={styles.signUpContainer}>
  <Text style={styles.signUpText}>
    {AUTH_CONSTANTS.STRINGS.signUpQuestion}  // "계정이 없으신가요?"
  </Text>
  <TouchableOpacity onPress={handleSignUp}>
    <Text style={styles.signUpLink}>
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

## 7. Safe Area Support

### 7.1 SafeAreaView

```typescript
import { SafeAreaView } from 'react-native-safe-area-context';

<SafeAreaView style={styles.container}>
  {/* Content */}
</SafeAreaView>
```

**Purpose**: Provides padding for notched devices

**Insets Handled**:
- **Top**: Notch, Dynamic Island (iPhone 14 Pro+), status bar
- **Bottom**: Home indicator (iPhone X+), gesture bar
- **Left/Right**: Curved edges (some Android phones)

### 7.2 Why react-native-safe-area-context?

**Standard SafeAreaView** (from react-native):
- iOS only
- Doesn't work on Android
- Limited customization

**react-native-safe-area-context**:
- Cross-platform (iOS + Android)
- Accurate inset detection
- More flexible API

### 7.3 Provider Setup

**Required in App.tsx**:

```typescript
import { SafeAreaProvider } from 'react-native-safe-area-context';

function App() {
  return (
    <SafeAreaProvider>
      {/* App content */}
    </SafeAreaProvider>
  );
}
```

**Location**: Apps/mobile/App.tsx (already configured)

---

## 8. Styling Details

### 8.1 Container Styles

```typescript
container: {
  flex: 1,
  backgroundColor: '#fff',
},
keyboardAvoidingView: {
  flex: 1,
},
```

**Background**: White (#fff) - No theme support yet (future enhancement)

### 8.2 ScrollView Content

```typescript
scrollContainer: {
  flexGrow: 1,
  paddingHorizontal: 24,
  justifyContent: 'center',
  minHeight: '100%',
},
```

**Key Properties**:
- `flexGrow: 1`: Allows content to grow beyond screen
- `paddingHorizontal: 24`: Side padding
- `justifyContent: 'center'`: Vertically center content
- `minHeight: '100%'`: Fill screen height

### 8.3 Header Styles

```typescript
header: {
  alignItems: 'center',
  marginBottom: 48,
},
title: {
  fontSize: 32,
  fontWeight: 'bold',
  color: '#1a1a1a',
  marginBottom: 8,
},
subtitle: {
  fontSize: 16,
  color: '#666',
  textAlign: 'center',
},
```

**Colors**:
- Title: Dark gray (#1a1a1a)
- Subtitle: Light gray (#666)

### 8.4 Form Styles

```typescript
form: {
  marginBottom: 32,
},
forgotPasswordButton: {
  alignSelf: 'flex-end',
  marginBottom: 24,
},
forgotPasswordText: {
  fontSize: 14,
  color: '#007AFF',
  fontWeight: '500',
},
```

**Forgot Password Link**:
- Aligned right (`alignSelf: 'flex-end'`)
- Blue (#007AFF) - iOS default blue
- Font weight: 500 (medium)

### 8.5 Sign Up Link Styles

```typescript
signUpContainer: {
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  marginTop: 32,
},
signUpText: {
  fontSize: 14,
  color: '#666',
},
signUpLink: {
  fontSize: 14,
  color: '#007AFF',
  fontWeight: '600',
},
```

**Layout**: Horizontal row, centered

**Colors**:
- Question text: Light gray (#666)
- Sign up link: Blue (#007AFF)

---

## 9. Related Documentation

### Mobile Documentation
- **[MOBILE-NAVIGATION.md](./MOBILE-NAVIGATION.md)**: Navigation setup (LoginScreen outside navigation)
- **[MOBILE-HOME.md](./MOBILE-HOME.md)**: Post-login home screen
- **[MOBILE-SETUP.md](./MOBILE-SETUP.md)**: Metro bundler and dependencies

### Shared Documentation
- **[SHARED-COMPONENTS.md](../03-shared/SHARED-COMPONENTS.md)**: InputField, Button components
- **[SHARED-HOOKS.md](../03-shared/SHARED-HOOKS.md)**: useLogin hook implementation
- **[SHARED-CONSTANTS.md](../03-shared/SHARED-CONSTANTS.md)**: APP_INFO_CONSTANTS, AUTH_CONSTANTS
- **[SHARED-UTILS.md](../03-shared/SHARED-UTILS.md)**: Alert utility (cross-platform)

### Web Comparison
- **[WEB-LOGIN.md](../01-web/WEB-LOGIN.md)**: Web login screen (URL preservation, auto-login)

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

## Appendix: Keyboard Types

**Available keyboardType values**:
- `'default'`: Standard keyboard
- `'email-address'`: Email keyboard (@ and . keys)
- `'numeric'`: Number pad
- `'phone-pad'`: Phone number pad
- `'number-pad'`: Number pad (iOS)
- `'decimal-pad'`: Decimal number pad
- `'url'`: URL keyboard (/, .com keys)

**Platform Differences**:
- iOS: More variety in keyboard layouts
- Android: Some types map to same keyboard

---

**Document Version**: 1.0.0
**Covers Files**: `LoginScreen.tsx`, keyboard handling patterns, safe area support
