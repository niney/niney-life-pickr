# Shared Module Overview

> **Last Updated**: 2025-10-23
> **Purpose**: Shared 모듈 전체 구조, Barrel Export 패턴, Import 방법

---

## 목차

1. [개요](#1-개요)
2. [Barrel Export 패턴](#2-barrel-export-패턴)
3. [폴더 구조](#3-폴더-구조)
4. [Import 방법](#4-import-방법)
5. [모듈별 상세](#5-모듈별-상세)
6. [Best Practices](#6-best-practices)
7. [관련 문서](#7-관련-문서)

---

## 1. 개요

### 1.1 Shared Module의 목적

**Shared Module** (`apps/shared/`)은 Web과 Mobile 앱 간 코드를 공유하기 위한 중앙 저장소입니다.

#### 1.1.1 주요 특징
- **Cross-platform**: Web과 Mobile에서 동일한 코드 사용
- **Barrel Export Pattern**: 깔끔한 import 구조
- **타입 안정성**: TypeScript 기반
- **독립적 모듈**: 각 폴더가 독립적인 역할

#### 1.1.2 공유 가능한 코드
- ✅ UI Components (Button, InputField 등)
- ✅ Hooks (useAuth, useLogin 등)
- ✅ Contexts (ThemeContext, SocketContext)
- ✅ Services (API 호출)
- ✅ Utils (Alert, Storage, Socket Utils)
- ✅ Constants (APP_INFO, AUTH_CONSTANTS)
- ✅ Types (공통 타입 정의)

#### 1.1.3 플랫폼별 코드
- ❌ Web 전용 컴포넌트 → `apps/web/src/components/`
- ❌ Mobile 전용 컴포넌트 → `apps/mobile/src/components/`
- ❌ Platform-specific logic → 각 앱의 `utils/`

---

## 2. Barrel Export 패턴

### 2.1 패턴 설명

**Barrel Export**는 여러 모듈을 하나의 진입점(`index.ts`)에서 re-export하여 깔끔한 import를 가능하게 하는 패턴입니다.

#### 2.1.1 Without Barrel Export (나쁜 예)
```typescript
// ❌ 복잡하고 길어지는 import
import { Button } from '@shared/components/Button'
import { InputField } from '@shared/components/InputField'
import { useAuth } from '@shared/hooks/useAuth'
import { useLogin } from '@shared/hooks/useLogin'
import { Alert } from '@shared/utils/alert.utils'
import { storage } from '@shared/utils/storage.utils'
```

#### 2.1.2 With Barrel Export (좋은 예)
```typescript
// ✅ 깔끔하고 간결한 import
import { Button, InputField } from '@shared/components'
import { useAuth, useLogin } from '@shared/hooks'
import { Alert, storage } from '@shared/utils'
```

### 2.2 구현 방법

#### 2.2.1 각 폴더의 index.ts
각 폴더(`components/`, `hooks/`, `utils/` 등)에 `index.ts` 파일을 만들어 re-export:

```typescript
// apps/shared/components/index.ts
export { Button } from './Button'
export { InputField } from './InputField'
```

```typescript
// apps/shared/hooks/index.ts
export { useAuth } from './useAuth'
export { useLogin } from './useLogin'
```

```typescript
// apps/shared/utils/index.ts
export { Alert } from './alert.utils'
export { storage, STORAGE_KEYS } from './storage.utils'
export {
  SOCKET_EVENTS,
  getSocketEvent,
  type JobEventData,
  type ProgressData,
  type ReviewCrawlStatus,
  type SummaryProgress
} from './socket.utils'
```

#### 2.2.2 메인 index.ts (선택적)
`apps/shared/index.ts`에서 전체를 다시 export할 수도 있지만, **권장하지 않음**:
- 이유: 모든 모듈을 한 번에 import하면 번들 크기 증가
- 권장: 각 폴더별로 import하여 Tree-shaking 활용

### 2.3 장점

1. **깔끔한 Import**: 간결하고 읽기 쉬운 코드
2. **유지보수성**: 파일 위치 변경 시 `index.ts`만 수정
3. **모듈화**: 각 폴더가 독립적인 모듈 역할
4. **Tree-shaking**: 사용하지 않는 코드 자동 제거

---

## 3. 폴더 구조

### 3.1 전체 구조

```
apps/shared/
├── components/         # Cross-platform UI components
│   ├── Button.tsx
│   ├── InputField.tsx
│   └── index.ts        # Barrel export
│
├── config/             # Shared configuration utilities
│   └── index.ts
│
├── constants/          # Shared constants (domain-separated)
│   ├── app.constants.ts
│   ├── auth.constants.ts
│   └── index.ts        # Barrel export
│
├── contexts/           # React Contexts
│   ├── SocketContext.tsx
│   ├── ThemeContext.tsx
│   └── index.ts        # Barrel export
│
├── hooks/              # Shared React hooks
│   ├── useAuth.ts
│   ├── useLogin.ts
│   └── index.ts        # Barrel export
│
├── services/           # API service layer
│   ├── api.service.ts
│   └── index.ts        # Barrel export
│
├── types/              # Shared TypeScript types
│   └── index.ts        # Type exports
│
├── utils/              # Shared utility functions
│   ├── alert.utils.ts
│   ├── socket.utils.ts
│   ├── storage.utils.ts
│   └── index.ts        # Barrel export
│
├── index.ts            # Main barrel export (optional, not recommended)
├── tsconfig.json       # TypeScript configuration
└── package.json        # Dependencies
```

### 3.2 폴더별 역할

#### 3.2.1 components/
- **Purpose**: Cross-platform UI components
- **Files**: Button.tsx, InputField.tsx
- **Usage**: `import { Button } from '@shared/components'`

**상세**: [SHARED-COMPONENTS](./SHARED-COMPONENTS.md)

#### 3.2.2 hooks/
- **Purpose**: Shared React hooks
- **Files**: useAuth.ts, useLogin.ts
- **Usage**: `import { useAuth } from '@shared/hooks'`

**상세**: [SHARED-HOOKS](./SHARED-HOOKS.md)

#### 3.2.3 contexts/
- **Purpose**: React Contexts (Global state)
- **Files**: ThemeContext.tsx, SocketContext.tsx
- **Usage**: `import { ThemeProvider, useTheme } from '@shared/contexts'`

**상세**: [SHARED-CONTEXTS](./SHARED-CONTEXTS.md)

#### 3.2.4 services/
- **Purpose**: API service layer
- **Files**: api.service.ts
- **Usage**: `import { apiService } from '@shared/services'`

**상세**: [SHARED-SERVICES](./SHARED-SERVICES.md)

#### 3.2.5 utils/
- **Purpose**: Shared utility functions
- **Files**: alert.utils.ts, storage.utils.ts, socket.utils.ts
- **Usage**: `import { Alert, storage } from '@shared/utils'`

**상세**: [SHARED-UTILS](./SHARED-UTILS.md)

#### 3.2.6 constants/
- **Purpose**: Shared constants (domain-separated)
- **Files**: app.constants.ts, auth.constants.ts
- **Usage**: `import { APP_INFO_CONSTANTS } from '@shared/constants'`

**상세**: [SHARED-CONSTANTS](./SHARED-CONSTANTS.md)

#### 3.2.7 types/
- **Purpose**: Shared TypeScript types
- **Files**: index.ts (type re-exports)
- **Usage**: `import type { User, Restaurant } from '@shared/types'`

---

## 4. Import 방법

### 4.1 Web App에서 Import

#### 4.1.1 Vite Alias 설정 (vite.config.ts)
```typescript
export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared')
    }
  }
})
```

#### 4.1.2 Import 예시
```typescript
// Web app (apps/web/src/components/Login.tsx)
import { Button, InputField } from '@shared/components'
import { useLogin, useAuth } from '@shared/hooks'
import { APP_INFO_CONSTANTS, AUTH_CONSTANTS } from '@shared/constants'
import {
  Alert,
  storage,
  STORAGE_KEYS,
  SOCKET_EVENTS,
  getSocketEvent,
  type JobEventData,
  type ProgressData
} from '@shared/utils'
import { apiService } from '@shared/services'
```

### 4.2 Mobile App에서 Import

#### 4.2.1 Metro Configuration (metro.config.js)
```javascript
const config = {
  watchFolders: [path.resolve(__dirname, '../shared')],
  resolver: {
    extraNodeModules: {
      shared: path.resolve(__dirname, '../shared')
    }
  }
}
```

#### 4.2.2 Import 예시
```typescript
// Mobile app (apps/mobile/src/screens/LoginScreen.tsx)
import { Button, InputField } from 'shared/components'
import { useLogin, useAuth } from 'shared/hooks'
import { APP_INFO_CONSTANTS, AUTH_CONSTANTS } from 'shared/constants'
import {
  Alert,
  storage,
  STORAGE_KEYS,
  SOCKET_EVENTS,
  getSocketEvent,
  type JobEventData,
  type ProgressData
} from 'shared/utils'
import { apiService } from 'shared/services'
```

### 4.3 Import 차이점 요약

| Platform | Alias | Example |
|----------|-------|---------|
| **Web** | `@shared` | `import { Button } from '@shared/components'` |
| **Mobile** | `shared` | `import { Button } from 'shared/components'` |

---

## 5. 모듈별 상세

### 5.1 Components

#### 5.1.1 Button Component
```typescript
// apps/shared/components/Button.tsx
import { Pressable, Text, StyleSheet } from 'react-native'

interface ButtonProps {
  title: string
  onPress: () => void
  disabled?: boolean
}

export function Button({ title, onPress, disabled }: ButtonProps) {
  return (
    <Pressable
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  )
}
```

**상세**: [SHARED-COMPONENTS](./SHARED-COMPONENTS.md)

### 5.2 Hooks

#### 5.2.1 useAuth Hook
```typescript
// apps/shared/hooks/useAuth.ts
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Auto-restore from storage
    restoreSession()
  }, [])

  const login = async (userData: User) => {
    await storage.setUserInfo(userData)
    setUser(userData)
    setIsAuthenticated(true)
  }

  const logout = async () => {
    await storage.logout()
    setUser(null)
    setIsAuthenticated(false)
  }

  return { isAuthenticated, user, isLoading, login, logout }
}
```

**상세**: [SHARED-HOOKS](./SHARED-HOOKS.md)

### 5.3 Contexts

#### 5.3.1 ThemeContext
```typescript
// apps/shared/contexts/ThemeContext.tsx
export const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    storage.setItem('app_theme', newTheme)
  }

  const colors = THEME_COLORS[theme]

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
```

**상세**: [SHARED-CONTEXTS](./SHARED-CONTEXTS.md)

### 5.4 Services

#### 5.4.1 API Service
```typescript
// apps/shared/services/api.service.ts
const API_URL = 'http://localhost:4000'

export const apiService = {
  async login(credentials: { email: string; password: string }) {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    })
    return response.json()
  },

  async register(data: { email: string; username: string; password: string }) {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return response.json()
  }
}
```

**상세**: [SHARED-SERVICES](./SHARED-SERVICES.md)

### 5.5 Utils

#### 5.5.1 Alert Utils
```typescript
// apps/shared/utils/alert.utils.ts
import { Alert as RNAlert, Platform } from 'react-native'

export const Alert = {
  show(title: string, message: string) {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${message}`)
    } else {
      RNAlert.alert(title, message)
    }
  },

  error(title: string, message: string) {
    this.show(title, message)
  },

  success(title: string, message: string) {
    this.show(title, message)
  },

  confirm(
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) {
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n${message}`)) {
        onConfirm()
      } else {
        onCancel?.()
      }
    } else {
      RNAlert.alert(title, message, [
        { text: 'Cancel', onPress: onCancel, style: 'cancel' },
        { text: 'OK', onPress: onConfirm }
      ])
    }
  }
}
```

**상세**: [SHARED-UTILS](./SHARED-UTILS.md)

### 5.6 Constants

#### 5.6.1 App Constants
```typescript
// apps/shared/constants/app.constants.ts
export const APP_INFO_CONSTANTS = {
  APP_NAME: 'Niney Life Pickr',
  VERSION: '1.0.0',
  DEFAULT_LANGUAGE: 'ko'
}
```

#### 5.6.2 Auth Constants
```typescript
// apps/shared/constants/auth.constants.ts
export const AUTH_CONSTANTS = {
  MIN_PASSWORD_LENGTH: 6,
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  TOKEN_KEY: 'auth_token'
}
```

**상세**: [SHARED-CONSTANTS](./SHARED-CONSTANTS.md)

---

## 6. Best Practices

### 6.1 모듈 분리 원칙

#### 6.1.1 DO: 각 타입별 폴더 사용
```typescript
// ✅ GOOD - 올바른 import
import { Button } from '@shared/components'
import { useAuth } from '@shared/hooks'
import { Alert } from '@shared/utils'
```

#### 6.1.2 DON'T: 잘못된 위치에서 import
```typescript
// ❌ BAD - components 폴더에서 non-component import
import { useAuth } from '@shared/components/useAuth'  // Wrong!

// ✅ GOOD - hooks 폴더에서 import
import { useAuth } from '@shared/hooks'
```

### 6.2 Barrel Export 작성 규칙

#### 6.2.1 Named Exports만 사용
```typescript
// ✅ GOOD - Named exports
export { Button } from './Button'
export { InputField } from './InputField'

// ❌ BAD - Default export는 Barrel에서 불편
export { default as Button } from './Button'
```

#### 6.2.2 Type Exports
```typescript
// ✅ GOOD - Type도 함께 export
export {
  SOCKET_EVENTS,
  getSocketEvent,
  type JobEventData,      // Type export
  type ProgressData,      // Type export
  type ReviewCrawlStatus  // Type export
} from './socket.utils'
```

### 6.3 Import 최적화

#### 6.3.1 Tree-shaking 활용
```typescript
// ✅ GOOD - 필요한 것만 import (Tree-shaking 가능)
import { Button, InputField } from '@shared/components'

// ❌ BAD - 전체 import (Tree-shaking 불가)
import * as Components from '@shared/components'
```

#### 6.3.2 플랫폼별 코드 분리
```typescript
// ✅ GOOD - Platform check inside utility
// apps/shared/utils/alert.utils.ts
export const Alert = {
  show(title: string, message: string) {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${message}`)
    } else {
      RNAlert.alert(title, message)
    }
  }
}

// ❌ BAD - 플랫폼별 파일 분리 (Shared에서 피해야 함)
// alert.web.ts, alert.native.ts
```

### 6.4 TypeScript 타입 안정성

#### 6.4.1 Props Interface 정의
```typescript
// ✅ GOOD - Explicit interface
interface ButtonProps {
  title: string
  onPress: () => void
  disabled?: boolean
}

export function Button({ title, onPress, disabled }: ButtonProps) {
  // ...
}
```

#### 6.4.2 Shared Types 사용
```typescript
// apps/shared/types/index.ts
export interface User {
  id: number
  email: string
  username: string
}

export interface Restaurant {
  id: number
  place_id: string
  name: string
}

// Usage
import type { User, Restaurant } from '@shared/types'
```

---

## 7. 관련 문서

### 7.1 Shared Module 상세
- [SHARED-COMPONENTS](./SHARED-COMPONENTS.md) - Button, InputField
- [SHARED-HOOKS](./SHARED-HOOKS.md) - useAuth, useLogin
- [SHARED-CONTEXTS](./SHARED-CONTEXTS.md) - ThemeContext, SocketContext
- [SHARED-SERVICES](./SHARED-SERVICES.md) - API Service
- [SHARED-UTILS](./SHARED-UTILS.md) - Alert, Storage, Socket Utils
- [SHARED-CONSTANTS](./SHARED-CONSTANTS.md) - Constants

### 7.2 Platform Setup
- [Web Setup](../01-web/WEB-SETUP.md) - Vite alias 설정
- [Mobile Setup](../02-mobile/MOBILE-SETUP.md) - Metro configuration

### 7.3 Core Documentation
- [Architecture](../00-core/ARCHITECTURE.md) - 전체 아키텍처

---

**문서 버전**: 1.0
**작성일**: 2025-10-23
**관리**: Claude Code Documentation Team
