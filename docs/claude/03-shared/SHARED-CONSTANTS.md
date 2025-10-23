# SHARED-CONSTANTS.md

> **Last Updated**: 2025-10-23 22:50
> **Purpose**: Shared constants for app metadata, authentication, and theming

---

## Table of Contents

1. [Overview](#1-overview)
2. [APP_INFO_CONSTANTS](#2-app_info_constants)
3. [AUTH_CONSTANTS](#3-auth_constants)
4. [THEME_COLORS](#4-theme_colors)
5. [HEADER_HEIGHT](#5-header_height)
6. [Barrel Export Pattern](#6-barrel-export-pattern)
7. [Usage Examples](#7-usage-examples)
8. [Related Documentation](#8-related-documentation)

---

## 1. Overview

The constants module provides centralized, domain-separated constants for app-wide configuration, authentication strings, and theme colors.

### File Structure

**Location**: `apps/shared/constants/`

```
apps/shared/constants/
├── app.constants.ts     # App metadata (4 lines)
├── auth.constants.ts    # Authentication strings (27 lines)
├── theme.constants.ts   # Theme color palettes (31 lines)
└── index.ts             # Barrel exports (8 lines)
```

### Design Principles

1. **Domain Separation**: Constants grouped by functional area (app, auth, theme)
2. **Centralization**: Single source of truth for all constants
3. **Type Safety**: Exported as const objects with TypeScript inference
4. **Immutability**: All constants are read-only (const)
5. **Cross-Platform**: Used identically on web and mobile

### Import Pattern

**Web**:
```typescript
import { APP_INFO_CONSTANTS, AUTH_CONSTANTS, THEME_COLORS } from '@shared/constants';
```

**Mobile**:
```typescript
import { APP_INFO_CONSTANTS, AUTH_CONSTANTS, THEME_COLORS } from 'shared/constants';
```

---

## 2. APP_INFO_CONSTANTS

### 2.1 Overview

App-wide metadata including app name and subtitle.

**File**: `apps/shared/constants/app.constants.ts`

**Lines**: 4

### 2.2 Definition

```typescript
export const APP_INFO_CONSTANTS = {
  title: 'Life Pickr',
  subtitle: '당신의 라이프스타일을 선택하세요',
};
```

### 2.3 Properties

| Property | Value | Usage |
|----------|-------|-------|
| `title` | `'Life Pickr'` | App name displayed in login screen, headers |
| `subtitle` | `'당신의 라이프스타일을 선택하세요'` | Tagline displayed in login screen |

### 2.4 Usage

**Login Screen** (`apps/mobile/src/screens/LoginScreen.tsx`):
```typescript
import { APP_INFO_CONSTANTS } from 'shared/constants';

<Text style={styles.title}>{APP_INFO_CONSTANTS.title}</Text>
<Text style={styles.subtitle}>{APP_INFO_CONSTANTS.subtitle}</Text>
```

**Web Login** (`apps/web/src/components/Login.tsx`):
```typescript
import { APP_INFO_CONSTANTS } from '@shared/constants';

<Text style={styles.title}>{APP_INFO_CONSTANTS.title}</Text>
<Text style={styles.subtitle}>{APP_INFO_CONSTANTS.subtitle}</Text>
```

---

## 3. AUTH_CONSTANTS

### 3.1 Overview

Authentication-related strings organized by category: UI strings, error messages, success messages, and info messages.

**File**: `apps/shared/constants/auth.constants.ts`

**Lines**: 27

### 3.2 Definition

```typescript
export const AUTH_CONSTANTS = {
  STRINGS: {
    email: '이메일',
    emailPlaceholder: '이메일을 입력하세요',
    password: '비밀번호',
    passwordPlaceholder: '비밀번호를 입력하세요',
    forgotPassword: '비밀번호를 잊으셨나요?',
    login: '로그인',
    loginProgress: '로그인 중...',
    signUpQuestion: '계정이 없으신가요? ',
    signUp: '회원가입',
  },
  ERRORS: {
    emptyFields: '이메일과 비밀번호를 모두 입력해주세요.',
    errorTitle: '오류',
  },
  SUCCESS: {
    loginSuccess: '로그인이 완료되었습니다!',
    successTitle: '성공',
  },
  MESSAGES: {
    forgotPasswordMessage: '비밀번호 찾기 기능을 구현할 예정입니다.',
    forgotPasswordTitle: '비밀번호 찾기',
    signUpMessage: '회원가입 페이지로 이동합니다.',
    signUpTitle: '회원가입',
  },
};
```

### 3.3 Categories

#### STRINGS (UI Labels)

| Key | Value | Usage |
|-----|-------|-------|
| `email` | `'이메일'` | InputField label |
| `emailPlaceholder` | `'이메일을 입력하세요'` | InputField placeholder |
| `password` | `'비밀번호'` | InputField label |
| `passwordPlaceholder` | `'비밀번호를 입력하세요'` | InputField placeholder |
| `forgotPassword` | `'비밀번호를 잊으셨나요?'` | Link text |
| `login` | `'로그인'` | Button text (normal state) |
| `loginProgress` | `'로그인 중...'` | Button text (loading state) |
| `signUpQuestion` | `'계정이 없으신가요? '` | Prompt text |
| `signUp` | `'회원가입'` | Link text |

#### ERRORS (Error Messages)

| Key | Value | Usage |
|-----|-------|-------|
| `emptyFields` | `'이메일과 비밀번호를 모두 입력해주세요.'` | Validation error |
| `errorTitle` | `'오류'` | Alert dialog title |

#### SUCCESS (Success Messages)

| Key | Value | Usage |
|-----|-------|-------|
| `loginSuccess` | `'로그인이 완료되었습니다!'` | Success alert message |
| `successTitle` | `'성공'` | Alert dialog title |

#### MESSAGES (Info Messages)

| Key | Value | Usage |
|-----|-------|-------|
| `forgotPasswordMessage` | `'비밀번호 찾기 기능을 구현할 예정입니다.'` | Info alert message |
| `forgotPasswordTitle` | `'비밀번호 찾기'` | Alert dialog title |
| `signUpMessage` | `'회원가입 페이지로 이동합니다.'` | Info alert message |
| `signUpTitle` | `'회원가입'` | Alert dialog title |

### 3.4 Usage

**Login Form** (`useLogin` hook):
```typescript
import { AUTH_CONSTANTS } from '@shared/constants';

// InputField labels
<InputField
  label={AUTH_CONSTANTS.STRINGS.email}
  placeholder={AUTH_CONSTANTS.STRINGS.emailPlaceholder}
/>

// Button text
<Button
  title={loading ? AUTH_CONSTANTS.STRINGS.loginProgress : AUTH_CONSTANTS.STRINGS.login}
  onPress={handleLogin}
  loading={loading}
/>

// Validation error
if (!email || !password) {
  Alert.error(AUTH_CONSTANTS.ERRORS.errorTitle, AUTH_CONSTANTS.ERRORS.emptyFields);
  return;
}

// Success message
Alert.success(AUTH_CONSTANTS.SUCCESS.successTitle, AUTH_CONSTANTS.SUCCESS.loginSuccess);
```

---

## 4. THEME_COLORS

### 4.1 Overview

Color palettes for light and dark themes with semantic color names.

**File**: `apps/shared/constants/theme.constants.ts`

**Lines**: 31

### 4.2 Definition

```typescript
export const THEME_COLORS = {
  light: {
    background: '#FFFFFF',
    surface: '#F5F5F5',
    primary: '#007AFF',
    secondary: '#5856D6',
    text: '#000000',
    textSecondary: '#666666',
    border: '#E0E0E0',
    error: '#FF3B30',
    success: '#34C759',
    headerBackground: '#FFFFFF',
    headerText: '#000000',
  },
  dark: {
    background: '#000000',
    surface: '#1C1C1E',
    primary: '#0A84FF',
    secondary: '#5E5CE6',
    text: '#FFFFFF',
    textSecondary: '#ABABAB',
    border: '#38383A',
    error: '#FF453A',
    success: '#32D74B',
    headerBackground: '#1C1C1E',
    headerText: '#FFFFFF',
  },
};
```

### 4.3 Color Roles

| Role | Light Theme | Dark Theme | Usage |
|------|-------------|------------|-------|
| **background** | `#FFFFFF` (White) | `#000000` (Black) | Page/screen background |
| **surface** | `#F5F5F5` (Light Gray) | `#1C1C1E` (Dark Gray) | Card, modal backgrounds |
| **primary** | `#007AFF` (iOS Blue) | `#0A84FF` (Lighter Blue) | Primary buttons, links, active states |
| **secondary** | `#5856D6` (Purple) | `#5E5CE6` (Lighter Purple) | Secondary buttons, accents |
| **text** | `#000000` (Black) | `#FFFFFF` (White) | Primary text |
| **textSecondary** | `#666666` (Gray) | `#ABABAB` (Light Gray) | Secondary text, labels |
| **border** | `#E0E0E0` (Light Gray) | `#38383A` (Dark Gray) | Borders, dividers |
| **error** | `#FF3B30` (Red) | `#FF453A` (Lighter Red) | Error messages, destructive actions |
| **success** | `#34C759` (Green) | `#32D74B` (Lighter Green) | Success messages, positive feedback |
| **headerBackground** | `#FFFFFF` (White) | `#1C1C1E` (Dark Gray) | Header/navbar background |
| **headerText** | `#000000` (Black) | `#FFFFFF` (White) | Header/navbar text |

### 4.4 Usage

**With ThemeContext**:
```typescript
import { useTheme } from 'shared/contexts';
import { THEME_COLORS } from 'shared/constants';

const MyComponent: React.FC = () => {
  const { theme } = useTheme();
  const colors = THEME_COLORS[theme];

  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.text }}>Hello</Text>
      <TouchableOpacity style={{ backgroundColor: colors.primary }}>
        <Text style={{ color: '#FFFFFF' }}>Button</Text>
      </TouchableOpacity>
    </View>
  );
};
```

### 4.5 Design Guidelines

**Light Theme**:
- High contrast (black text on white background)
- iOS-style primary blue (`#007AFF`)
- Light gray surfaces for card elevation

**Dark Theme**:
- OLED-friendly (true black background)
- Lighter colors for visibility on dark backgrounds
- Dark gray surfaces (avoid pure white for less eye strain)

**Accessibility**:
- All text/background combinations meet WCAG AA contrast ratio (4.5:1 minimum)
- Primary/secondary colors adjusted for dark mode visibility

---

## 5. HEADER_HEIGHT

### 5.1 Definition

```typescript
export const HEADER_HEIGHT = 48;
```

**Value**: `48` (pixels)

### 5.2 Usage

**Header Component** (`apps/web/src/components/Header.tsx`):
```typescript
import { HEADER_HEIGHT } from '@shared/constants';

const styles = StyleSheet.create({
  header: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
```

**Layout Calculations**:
```typescript
// Subtract header height from content area
const contentHeight = windowHeight - HEADER_HEIGHT;
```

---

## 6. Barrel Export Pattern

### 6.1 Index File

**File**: `apps/shared/constants/index.ts`

```typescript
// App-wide constants
export { APP_INFO_CONSTANTS } from './app.constants';

// Authentication related constants
export { AUTH_CONSTANTS } from './auth.constants';

// Theme related constants
export { THEME_COLORS, HEADER_HEIGHT } from './theme.constants';
```

### 6.2 Benefits

1. **Single Import Line**: Import multiple constants from one path
   ```typescript
   import { APP_INFO_CONSTANTS, AUTH_CONSTANTS, THEME_COLORS } from '@shared/constants';
   ```

2. **Domain Organization**: Grouped by functional area (app, auth, theme)

3. **Discoverability**: IDE autocomplete shows all available constants

---

## 7. Usage Examples

### 7.1 Login Screen (Mobile)

**File**: `apps/mobile/src/screens/LoginScreen.tsx`

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from 'shared/contexts';
import { useLogin } from 'shared/hooks';
import { Button, InputField } from 'shared/components';
import { APP_INFO_CONSTANTS, AUTH_CONSTANTS, THEME_COLORS } from 'shared/constants';

const LoginScreen: React.FC = () => {
  const { theme } = useTheme();
  const colors = THEME_COLORS[theme];
  const { email, setEmail, password, setPassword, handleLogin, loading } = useLogin();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        {APP_INFO_CONSTANTS.title}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {APP_INFO_CONSTANTS.subtitle}
      </Text>

      <InputField
        label={AUTH_CONSTANTS.STRINGS.email}
        placeholder={AUTH_CONSTANTS.STRINGS.emailPlaceholder}
        value={email}
        onChangeText={setEmail}
      />

      <InputField
        label={AUTH_CONSTANTS.STRINGS.password}
        placeholder={AUTH_CONSTANTS.STRINGS.passwordPlaceholder}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Button
        title={loading ? AUTH_CONSTANTS.STRINGS.loginProgress : AUTH_CONSTANTS.STRINGS.login}
        onPress={handleLogin}
        loading={loading}
      />
    </View>
  );
};
```

### 7.2 Header Component (Web)

**File**: `apps/web/src/components/Header.tsx`

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@shared/contexts';
import { THEME_COLORS, HEADER_HEIGHT } from '@shared/constants';

const Header: React.FC = () => {
  const { theme } = useTheme();
  const colors = THEME_COLORS[theme];

  return (
    <View style={[styles.header, { backgroundColor: colors.headerBackground }]}>
      <Text style={[styles.title, { color: colors.headerText }]}>
        Life Pickr
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
});
```

---

## 8. Related Documentation

### Shared Documentation
- **[SHARED-OVERVIEW.md](./SHARED-OVERVIEW.md)**: Shared module architecture
- **[SHARED-CONTEXTS.md](./SHARED-CONTEXTS.md)**: ThemeContext (uses THEME_COLORS)
- **[SHARED-HOOKS.md](./SHARED-HOOKS.md)**: useLogin hook (uses AUTH_CONSTANTS)
- **[SHARED-COMPONENTS.md](./SHARED-COMPONENTS.md)**: Button, InputField (use AUTH_CONSTANTS)

### Web Documentation
- **[WEB-THEME.md](../01-web/WEB-THEME.md)**: Web theme implementation
- **[WEB-HEADER-DRAWER.md](../01-web/WEB-HEADER-DRAWER.md)**: Header component (uses HEADER_HEIGHT)
- **[WEB-LOGIN.md](../01-web/WEB-LOGIN.md)**: Web login (uses APP_INFO_CONSTANTS, AUTH_CONSTANTS)

### Mobile Documentation
- **[MOBILE-LOGIN.md](../02-mobile/MOBILE-LOGIN.md)**: Mobile login screen (uses constants)
- **[MOBILE-HOME.md](../02-mobile/MOBILE-HOME.md)**: Home screen (uses THEME_COLORS)

### Core Documentation
- **[ARCHITECTURE.md](../00-core/ARCHITECTURE.md)**: Overall architecture
- **[DEVELOPMENT.md](../00-core/DEVELOPMENT.md)**: Development workflow

---

## Appendix: i18n Considerations

### Current Implementation

All strings are hardcoded in Korean:
```typescript
AUTH_CONSTANTS.STRINGS.email = '이메일';
```

### Future: Internationalization (i18n)

**Planned Structure**:
```typescript
// auth.i18n.ts
export const AUTH_I18N = {
  ko: {
    STRINGS: {
      email: '이메일',
      password: '비밀번호',
      // ...
    },
  },
  en: {
    STRINGS: {
      email: 'Email',
      password: 'Password',
      // ...
    },
  },
};
```

**Usage with i18n Hook**:
```typescript
const { locale } = useI18n();
const strings = AUTH_I18N[locale];

<InputField label={strings.STRINGS.email} />
```

---

## Appendix: Adding New Constants

### Step 1: Create Domain File

```typescript
// apps/shared/constants/feature.constants.ts
export const FEATURE_CONSTANTS = {
  KEY: 'value',
};
```

### Step 2: Export from Index

```typescript
// apps/shared/constants/index.ts
export { FEATURE_CONSTANTS } from './feature.constants';
```

### Step 3: Use in Components

```typescript
import { FEATURE_CONSTANTS } from '@shared/constants';

console.log(FEATURE_CONSTANTS.KEY); // 'value'
```

---

**Document Version**: 1.0.0
**Covers Files**: `app.constants.ts`, `auth.constants.ts`, `theme.constants.ts`, domain-separated constants
