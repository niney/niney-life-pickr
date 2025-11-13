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
6. [SOCKET_CONFIG](#6-socket_config)
7. [Barrel Export Pattern](#7-barrel-export-pattern)
8. [Usage Examples](#8-usage-examples)
9. [Related Documentation](#9-related-documentation)

---

## 1. Overview

The constants module provides centralized, domain-separated constants for app-wide configuration, authentication strings, and theme colors.

### File Structure

**Location**: `apps/shared/constants/`

```
apps/shared/constants/
├── app.constants.ts       # App metadata (4 lines)
├── auth.constants.ts      # Authentication strings (27 lines)
├── theme.constants.ts     # Theme color palettes (31 lines)
├── socket-config.ts       # Socket.io configuration (14 lines)
└── index.ts               # Barrel exports (9 lines)
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

## 6. SOCKET_CONFIG

### 6.1 Overview

Socket.io client connection configuration used by JobMonitorScreen, SocketContext, and Web JobMonitor.

**File**: `apps/shared/constants/socket-config.ts`

**Lines**: 14

### 6.2 Definition

```typescript
export const SOCKET_CONFIG = {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  autoConnect: true,
  forceNew: false,
} as const;
```

### 6.3 Configuration Fields

| Field | Value | Purpose |
|-------|-------|---------|
| **transports** | `['websocket', 'polling']` | Connection transport methods (websocket first, polling fallback) |
| **reconnection** | `true` | Enable automatic reconnection on disconnect |
| **reconnectionAttempts** | `10` | Maximum reconnection attempts before giving up |
| **reconnectionDelay** | `1000` | Initial delay (ms) before first reconnection attempt |
| **reconnectionDelayMax** | `5000` | Maximum delay (ms) between reconnection attempts |
| **timeout** | `20000` | Connection timeout (ms) - 20 seconds |
| **autoConnect** | `true` | Automatically connect on Socket.io client creation |
| **forceNew** | `false` | Reuse existing connection if available |

### 6.4 Transport Strategy

#### Websocket (Primary)
- **Pros**:
  - Low latency bidirectional communication
  - Minimal overhead
  - Real-time performance
- **Cons**:
  - May be blocked by corporate firewalls
  - Not supported by some proxies

#### Polling (Fallback)
- **Pros**:
  - Works with all firewalls/proxies
  - HTTP-based (always allowed)
- **Cons**:
  - Higher latency
  - More network overhead
  - Less efficient

**Auto-fallback**: Socket.io automatically falls back to polling if websocket fails.

### 6.5 Reconnection Strategy

#### Exponential Backoff

```
Attempt 1: 1000ms delay
Attempt 2: 2000ms delay
Attempt 3: 4000ms delay
Attempt 4: 5000ms delay (capped at reconnectionDelayMax)
Attempt 5-10: 5000ms delay
```

#### Behavior

- **10 attempts**: Tries for ~55 seconds total before giving up
- **Visual feedback**: `socketConnected` state updates UI
- **User action**: Manual retry available via refresh button

### 6.6 Usage

#### In SocketContext (Shared)

```typescript
import { io, Socket } from 'socket.io-client';
import { SOCKET_CONFIG } from 'shared/constants';
import { getDefaultApiUrl } from 'shared/services';

const serverUrl = getDefaultApiUrl();

const socket = io(serverUrl, SOCKET_CONFIG);

socket.on('connect', () => {
  console.log('[Socket.io] Connected:', socket.id);
  setIsConnected(true);
});

socket.on('disconnect', () => {
  console.log('[Socket.io] Disconnected');
  setIsConnected(false);
});
```

#### In JobMonitorScreen (Mobile)

```typescript
import { io, Socket } from 'socket.io-client';
import { SOCKET_CONFIG } from 'shared/constants';
import { getDefaultApiUrl } from 'shared/services';

const SOCKET_URL = getDefaultApiUrl();

useEffect(() => {
  console.log('[JobMonitor] Connecting to:', SOCKET_URL);

  const socket = io(SOCKET_URL, SOCKET_CONFIG);

  socket.on('connect', () => {
    console.log('[JobMonitor] Socket connected:', socket.id);
    setSocketConnected(true);
  });

  socket.on('disconnect', (reason) => {
    console.log('[JobMonitor] Socket disconnected:', reason);
    setSocketConnected(false);
  });

  socket.on('connect_error', (error) => {
    console.error('[JobMonitor] Connection error:', error.message);
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`[JobMonitor] Reconnection attempt ${attemptNumber}/10`);
  });

  socketRef.current = socket;

  return () => {
    socket.close();
  };
}, []);
```

#### In Web JobMonitor

```typescript
import { io, Socket } from 'socket.io-client';
import { SOCKET_CONFIG } from '@shared/constants';
import { getDefaultApiUrl } from '@shared/services';

const SOCKET_URL = getDefaultApiUrl();

useEffect(() => {
  const newSocket = io(SOCKET_URL, SOCKET_CONFIG);

  newSocket.on('connect', () => {
    console.log('[JobMonitor] Socket connected:', newSocket.id);
    setSocketConnected(true);
  });

  newSocket.on('disconnect', () => {
    console.log('[JobMonitor] Socket disconnected');
    setSocketConnected(false);
  });

  setSocket(newSocket);

  return () => {
    newSocket.emit('unsubscribe:all_jobs');
    newSocket.close();
  };
}, []);
```

### 6.7 Connection Lifecycle

```
1. Socket.io Client Created
   ↓ (autoConnect: true)
2. Attempt websocket connection
   ↓ (if blocked)
3. Fallback to polling
   ↓
4. Connected (emit 'connect' event)
   ↓
5. Bidirectional communication
   ↓ (network failure)
6. Disconnected (emit 'disconnect' event)
   ↓ (reconnection: true)
7. Reconnection attempt 1 (1s delay)
   ↓ (failed)
8. Reconnection attempt 2 (2s delay)
   ↓ (failed)
...
10. Reconnection attempt 10 (5s delay)
    ↓ (failed)
11. Give up (manual retry required)
```

### 6.8 Error Handling

#### Connection Errors

```typescript
socket.on('connect_error', (error) => {
  console.error('[Socket] Connection error:', error.message);
  // UI: Show "Connection failed" message
});
```

#### Reconnection Failed

```typescript
socket.on('reconnect_failed', () => {
  console.error('[Socket] Reconnection failed after 10 attempts');
  Alert.error('연결 실패', '서버에 연결할 수 없습니다. 새로고침해주세요.');
});
```

#### Manual Reconnection

```typescript
const handleReconnect = () => {
  socket.connect(); // Manual reconnect
};

// UI: Show "Retry" button when socketConnected === false
```

### 6.9 Benefits of Centralized Config

1. **Consistency**: Same settings across Web, Mobile, and SocketContext
2. **Easy Updates**: Change config in one place → applies everywhere
3. **Testing**: Can override config for testing environments
4. **Documentation**: Single source of truth for Socket settings

### 6.10 Environment-Specific Config (Future)

**Planned Enhancement**:
```typescript
// socket-config.ts
const isDevelopment = process.env.NODE_ENV === 'development';

export const SOCKET_CONFIG = {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: isDevelopment ? 3 : 10, // Fewer attempts in dev
  reconnectionDelay: 1000,
  reconnectionDelayMax: isDevelopment ? 3000 : 5000,
  timeout: 20000,
  autoConnect: true,
  forceNew: false,
} as const;
```

---

## 7. Barrel Export Pattern

### 7.1 Index File

**File**: `apps/shared/constants/index.ts`

```typescript
// App-wide constants
export { APP_INFO_CONSTANTS } from './app.constants';

// Authentication related constants
export { AUTH_CONSTANTS } from './auth.constants';

// Theme related constants
export { THEME_COLORS, HEADER_HEIGHT } from './theme.constants';

// Socket.io configuration
export { SOCKET_CONFIG } from './socket-config';
```

### 7.2 Benefits

1. **Single Import Line**: Import multiple constants from one path
   ```typescript
   import { APP_INFO_CONSTANTS, AUTH_CONSTANTS, THEME_COLORS } from '@shared/constants';
   ```

2. **Domain Organization**: Grouped by functional area (app, auth, theme)

3. **Discoverability**: IDE autocomplete shows all available constants

---

## 8. Usage Examples

### 8.1 Login Screen (Mobile)

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

### 8.2 Header Component (Web)

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

## 9. Related Documentation

### Shared Documentation
- **[SHARED-OVERVIEW.md](./SHARED-OVERVIEW.md)**: Shared module architecture
- **[SHARED-CONTEXTS.md](./SHARED-CONTEXTS.md)**: ThemeContext (uses THEME_COLORS), SocketContext (uses SOCKET_CONFIG)
- **[SHARED-HOOKS.md](./SHARED-HOOKS.md)**: useLogin hook (uses AUTH_CONSTANTS)
- **[SHARED-COMPONENTS.md](./SHARED-COMPONENTS.md)**: Button, InputField (use AUTH_CONSTANTS)
- **[SHARED-UTILS.md](./SHARED-UTILS.md)**: JobCompletionTracker, SocketSequenceManager

### Web Documentation
- **[WEB-THEME.md](../01-web/WEB-THEME.md)**: Web theme implementation
- **[WEB-HEADER-DRAWER.md](../01-web/WEB-HEADER-DRAWER.md)**: Header component (uses HEADER_HEIGHT)
- **[WEB-LOGIN.md](../01-web/WEB-LOGIN.md)**: Web login (uses APP_INFO_CONSTANTS, AUTH_CONSTANTS)
- **[WEB-JOB-MONITOR.md](../01-web/WEB-JOB-MONITOR.md)**: Job monitoring (uses SOCKET_CONFIG)

### Mobile Documentation
- **[MOBILE-LOGIN.md](../02-mobile/MOBILE-LOGIN.md)**: Mobile login screen (uses constants)
- **[MOBILE-HOME.md](../02-mobile/MOBILE-HOME.md)**: Home screen (uses THEME_COLORS)
- **[MOBILE-JOB-MONITOR.md](../02-mobile/MOBILE-JOB-MONITOR.md)**: Job monitoring (uses SOCKET_CONFIG)

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

**Document Version**: 1.1.0
**최종 업데이트**: 2025-11-13
**변경 사항**: SOCKET_CONFIG 추가 (Socket.io 연결 설정)
**Covers Files**: `app.constants.ts`, `auth.constants.ts`, `theme.constants.ts`, `socket-config.ts`
