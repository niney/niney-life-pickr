# Shared Utility Functions

> **Last Updated**: 2025-10-23
> **Purpose**: Cross-platform utility functions for alerts, storage, and Socket.io types

---

## 목차

1. [Alert Utility](#1-alert-utility)
2. [Storage Utility](#2-storage-utility)
3. [Socket Utility Types](#3-socket-utility-types)
4. [Related Documentation](#4-related-documentation)

---

## 1. Alert Utility

**Location**: `apps/shared/utils/alert.utils.ts`

### 1.1 Overview

Cross-platform alert dialog utility that works consistently on both web and mobile platforms.

### 1.2 Platform-Specific Implementation

#### 1.2.1 Web Implementation

Uses native browser dialogs:
- `window.alert()` - For simple alerts (1 button)
- `window.confirm()` - For confirmation dialogs (2 buttons)
- `window.prompt()` - For multiple button options (3+ buttons)

#### 1.2.2 Mobile Implementation

Uses React Native's `Alert` API for iOS and Android native alert dialogs.

### 1.3 API Reference

#### 1.3.1 Alert.alert()

**Signature**:
```typescript
static alert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: AlertOptions
): void

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertOptions {
  cancelable?: boolean;
  onDismiss?: () => void;
}
```

**Parameters**:
- `title`: Dialog title
- `message`: Optional message below title
- `buttons`: Array of button configurations
- `options`: Additional alert configuration (mobile only)

**Example**:
```typescript
import { Alert } from '@shared/utils'

Alert.alert('Title', 'Message', [
  { text: 'Cancel', style: 'cancel' },
  { text: 'OK', onPress: () => console.log('OK pressed') }
])
```

#### 1.3.2 Alert.show()

**Signature**:
```typescript
static show(title: string, message: string): void
```

**Purpose**: Simple alert with OK button.

**Example**:
```typescript
Alert.show('Info', 'This is a simple alert')
```

#### 1.3.3 Alert.error()

**Signature**:
```typescript
static error(title: string = '오류', message: string): void
```

**Purpose**: Error alert with default title "오류".

**Example**:
```typescript
Alert.error('Login Failed', 'Invalid credentials')
// Or with default title
Alert.error('', 'Something went wrong')
```

#### 1.3.4 Alert.success()

**Signature**:
```typescript
static success(title: string = '성공', message: string): void
```

**Purpose**: Success alert with default title "성공".

**Example**:
```typescript
Alert.success('Save Successful', 'Data saved successfully')
```

#### 1.3.5 Alert.confirm()

**Signature**:
```typescript
static confirm(
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
): void
```

**Purpose**: Confirmation dialog with "확인" and "취소" buttons.

**Example**:
```typescript
Alert.confirm(
  'Delete Item',
  'Are you sure you want to delete this item?',
  () => {
    console.log('User confirmed')
    deleteItem()
  },
  () => {
    console.log('User cancelled')
  }
)
```

### 1.4 Platform Differences

#### 1.4.1 Web Behavior

**Single Button**:
```typescript
Alert.alert('Title', 'Message', [
  { text: 'OK', onPress: () => console.log('Pressed') }
])
// → window.alert('Title\n\nMessage')
// → Calls onPress after user dismisses
```

**Two Buttons**:
```typescript
Alert.alert('Title', 'Message', [
  { text: 'Yes', onPress: () => console.log('Yes') },
  { text: 'No', onPress: () => console.log('No') }
])
// → window.confirm('Title\n\nMessage')
// → OK = Yes button, Cancel = No button
```

**Three+ Buttons**:
```typescript
Alert.alert('Title', 'Message', [
  { text: 'Option 1', onPress: () => console.log('1') },
  { text: 'Option 2', onPress: () => console.log('2') },
  { text: 'Option 3', onPress: () => console.log('3') }
])
// → window.prompt('Title\n\nMessage\n\n1. Option 1\n2. Option 2\n3. Option 3\n\nEnter number (1-3):')
// → User types number to select option
```

#### 1.4.2 Mobile Behavior

Uses React Native's native `Alert.alert()` API with full support for:
- Multiple buttons
- Button styles (default, cancel, destructive)
- Cancelable behavior
- onDismiss callback

### 1.5 Usage Examples

#### 1.5.1 Error Handling

```typescript
import { Alert } from '@shared/utils'

try {
  await apiService.login(email, password)
} catch (error) {
  Alert.error('Login Failed', error.message || 'Unknown error')
}
```

#### 1.5.2 Success Notification

```typescript
await apiService.saveData(data)
Alert.success('Saved', 'Your data has been saved successfully')
```

#### 1.5.3 Confirmation Before Action

```typescript
const handleDelete = () => {
  Alert.confirm(
    'Delete Restaurant',
    'This action cannot be undone. Continue?',
    async () => {
      await apiService.deleteRestaurant(id)
      Alert.success('Deleted', 'Restaurant deleted successfully')
    }
  )
}
```

#### 1.5.4 Complex Dialog

```typescript
Alert.alert(
  'Choose Action',
  'Select an action for this restaurant',
  [
    { text: 'View Details', onPress: () => navigate('Detail') },
    { text: 'Edit', onPress: () => navigate('Edit') },
    { text: 'Delete', onPress: handleDelete, style: 'destructive' },
    { text: 'Cancel', style: 'cancel' }
  ]
)
```

---

## 2. Storage Utility

**Location**: `apps/shared/utils/storage.utils.ts`

### 2.1 Overview

Cross-platform storage utility with unified API for web (localStorage) and mobile (AsyncStorage).

### 2.2 Storage Keys

```typescript
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_INFO: 'user_info',
  LAST_LOGIN: 'last_login',
} as const;
```

**Usage**:
```typescript
import { STORAGE_KEYS, storage } from '@shared/utils'

await storage.setItem(STORAGE_KEYS.AUTH_TOKEN, token)
```

### 2.3 API Reference

#### 2.3.1 setItem()

**Signature**:
```typescript
async setItem(key: string, value: string): Promise<void>
```

**Purpose**: Save string value.

**Implementation**:
- **Web**: `localStorage.setItem(key, value)` (synchronous)
- **Mobile**: `AsyncStorage.setItem(key, value)` (asynchronous)

**Example**:
```typescript
await storage.setItem('myKey', 'myValue')
```

#### 2.3.2 getItem()

**Signature**:
```typescript
async getItem(key: string): Promise<string | null>
```

**Purpose**: Retrieve string value.

**Returns**: Value or `null` if not found.

**Example**:
```typescript
const value = await storage.getItem('myKey')
if (value) {
  console.log('Found:', value)
}
```

#### 2.3.3 removeItem()

**Signature**:
```typescript
async removeItem(key: string): Promise<void>
```

**Purpose**: Delete value by key.

**Example**:
```typescript
await storage.removeItem('myKey')
```

#### 2.3.4 clear()

**Signature**:
```typescript
async clear(): Promise<void>
```

**Purpose**: Delete all values in storage.

**Example**:
```typescript
await storage.clear()
```

#### 2.3.5 setObject()

**Signature**:
```typescript
async setObject<T>(key: string, value: T): Promise<void>
```

**Purpose**: Save JSON object (auto-serialized).

**Example**:
```typescript
const user = { id: 1, name: 'John', email: 'john@example.com' }
await storage.setObject('user', user)
```

#### 2.3.6 getObject()

**Signature**:
```typescript
async getObject<T>(key: string): Promise<T | null>
```

**Purpose**: Retrieve JSON object (auto-deserialized).

**Returns**: Typed object or `null` if not found.

**Example**:
```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

const user = await storage.getObject<User>('user')
if (user) {
  console.log('User:', user.name, user.email)
}
```

#### 2.3.7 setAuthToken()

**Signature**:
```typescript
async setAuthToken(token: string): Promise<void>
```

**Purpose**: Save authentication token (uses `STORAGE_KEYS.AUTH_TOKEN`).

**Example**:
```typescript
await storage.setAuthToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')
```

#### 2.3.8 getAuthToken()

**Signature**:
```typescript
async getAuthToken(): Promise<string | null>
```

**Purpose**: Retrieve authentication token.

**Example**:
```typescript
const token = await storage.getAuthToken()
if (token) {
  apiService.setAuthHeader(token)
}
```

#### 2.3.9 setUserInfo()

**Signature**:
```typescript
async setUserInfo<T>(userInfo: T): Promise<void>
```

**Purpose**: Save user info object (uses `STORAGE_KEYS.USER_INFO`).

**Example**:
```typescript
interface User {
  id: number;
  email: string;
  username: string;
}

const user: User = {
  id: 1,
  email: 'user@example.com',
  username: 'username'
}

await storage.setUserInfo(user)
```

#### 2.3.10 getUserInfo()

**Signature**:
```typescript
async getUserInfo<T>(): Promise<T | null>
```

**Purpose**: Retrieve user info object.

**Example**:
```typescript
interface User {
  id: number;
  email: string;
  username: string;
}

const user = await storage.getUserInfo<User>()
if (user) {
  console.log('Welcome,', user.username)
}
```

#### 2.3.11 logout()

**Signature**:
```typescript
async logout(): Promise<void>
```

**Purpose**: Clear all authentication-related data.

**Deletes**:
- `STORAGE_KEYS.AUTH_TOKEN`
- `STORAGE_KEYS.USER_INFO`
- `STORAGE_KEYS.LAST_LOGIN`

**Example**:
```typescript
const handleLogout = async () => {
  await storage.logout()
  navigate('Login')
}
```

### 2.4 Error Handling

All storage methods catch errors and log to console:

```typescript
try {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    await AsyncStorage.setItem(key, value);
  }
} catch (error) {
  console.error('Storage setItem error:', error);
  throw error; // Re-throw for caller to handle
}
```

**Usage**:
```typescript
try {
  await storage.setItem('key', 'value')
} catch (error) {
  Alert.error('Storage Error', 'Failed to save data')
}
```

### 2.5 Usage Examples

#### 2.5.1 Authentication Flow

```typescript
import { storage } from '@shared/utils'

// Login
const handleLogin = async (email: string, password: string) => {
  const response = await apiService.login({ email, password })

  if (response.result && response.data) {
    // Save token and user info
    await storage.setAuthToken(response.data.token)
    await storage.setUserInfo(response.data.user)

    navigate('Home')
  }
}

// Auto-restore session on app startup
const checkAuth = async () => {
  const token = await storage.getAuthToken()
  const user = await storage.getUserInfo()

  if (token && user) {
    // User is authenticated
    apiService.setAuthHeader(token)
    navigate('Home')
  } else {
    navigate('Login')
  }
}

// Logout
const handleLogout = async () => {
  await storage.logout()
  navigate('Login')
}
```

#### 2.5.2 Theme Persistence

```typescript
import { storage } from '@shared/utils'

const [theme, setTheme] = useState<'light' | 'dark'>('light')

// Load theme on mount
useEffect(() => {
  const loadTheme = async () => {
    const savedTheme = await storage.getItem('app_theme')
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme)
    }
  }
  loadTheme()
}, [])

// Save theme when changed
const toggleTheme = async () => {
  const newTheme = theme === 'light' ? 'dark' : 'light'
  setTheme(newTheme)
  await storage.setItem('app_theme', newTheme)
}
```

#### 2.5.3 Complex Data Storage

```typescript
import { storage } from '@shared/utils'

interface AppSettings {
  notifications: boolean;
  language: string;
  fontSize: number;
}

// Save settings
const saveSettings = async (settings: AppSettings) => {
  await storage.setObject('app_settings', settings)
}

// Load settings
const loadSettings = async (): Promise<AppSettings> => {
  const settings = await storage.getObject<AppSettings>('app_settings')
  return settings || { notifications: true, language: 'ko', fontSize: 14 }
}

// Update specific setting
const updateSetting = async (key: keyof AppSettings, value: any) => {
  const settings = await loadSettings()
  settings[key] = value
  await saveSettings(settings)
}
```

---

## 3. Socket Utility Types

**Location**: `apps/shared/utils/socket.utils.ts`

### 3.1 Overview

Type definitions for Socket.io client-side events and data structures.

### 3.2 Type Definitions

#### 3.2.1 ProgressData

```typescript
export interface ProgressData {
  current: number;
  total: number;
  percentage: number;
}
```

**Purpose**: Track progress for crawling, DB saving, image processing, and summarization.

**Example**:
```typescript
const crawlProgress: ProgressData = {
  current: 50,
  total: 100,
  percentage: 50
}
```

#### 3.2.2 ClientReviewCrawlStatus

```typescript
export interface ClientReviewCrawlStatus {
  status: 'idle' | 'active' | 'completed' | 'failed';
  error?: string;
}
```

**Purpose**: Client-side review crawling status (distinct from server-side `ReviewCrawlStatus`).

**States**:
- `idle`: No crawling job
- `active`: Crawling in progress
- `completed`: Crawling finished successfully
- `failed`: Crawling encountered an error

**Example**:
```typescript
const [crawlStatus, setCrawlStatus] = useState<ClientReviewCrawlStatus>({
  status: 'idle'
})

// On error
setCrawlStatus({ status: 'failed', error: 'Network timeout' })
```

#### 3.2.3 SummaryProgress

```typescript
export interface SummaryProgress extends ProgressData {
  completed: number;
  failed: number;
}
```

**Purpose**: Review summarization progress with additional success/failure counts.

**Fields**:
- `current`: Current progress count
- `total`: Total items to process
- `percentage`: Progress percentage (0-100)
- `completed`: Number of successfully summarized reviews
- `failed`: Number of failed reviews

**Example**:
```typescript
const summaryProgress: SummaryProgress = {
  current: 80,
  total: 100,
  percentage: 80,
  completed: 75,
  failed: 5
}
```

#### 3.2.4 ReviewSummaryStatus

```typescript
export interface ReviewSummaryStatus {
  status: 'idle' | 'active' | 'completed' | 'failed';
  error?: string;
}
```

**Purpose**: Review summarization status.

**States**: Same as `ClientReviewCrawlStatus`.

**Example**:
```typescript
const [summaryStatus, setSummaryStatus] = useState<ReviewSummaryStatus>({
  status: 'idle'
})

// On completion
setSummaryStatus({ status: 'completed' })
```

### 3.3 Usage in SocketContext

```typescript
import type { ProgressData, ReviewSummaryStatus, SummaryProgress } from '@shared/utils'

const [crawlProgress, setCrawlProgress] = useState<ProgressData | null>(null)
const [reviewSummaryStatus, setReviewSummaryStatus] = useState<ReviewSummaryStatus>({
  status: 'idle'
})
const [summaryProgress, setSummaryProgress] = useState<SummaryProgress | null>(null)

// Socket event listener
socket.on('review:crawl_progress', (data: any) => {
  setCrawlProgress({
    current: data.current || 0,
    total: data.total || 0,
    percentage: data.percentage || 0
  })
})

socket.on('review_summary:progress', (data: any) => {
  setReviewSummaryStatus({ status: 'active' })
  setSummaryProgress({
    current: data.current || 0,
    total: data.total || 0,
    percentage: data.percentage || 0,
    completed: data.completed || 0,
    failed: data.failed || 0
  })
})
```

### 3.4 Usage in Components

```typescript
import { useSocket } from '@shared/contexts/SocketContext'
import type { ProgressData } from '@shared/utils'

function ProgressDisplay() {
  const { crawlProgress, summaryProgress } = useSocket()

  const renderProgress = (progress: ProgressData | null, label: string) => {
    if (!progress) return null

    return (
      <View>
        <Text>{label}: {progress.percentage}%</Text>
        <ProgressBar value={progress.percentage} />
        <Text>{progress.current} / {progress.total}</Text>
      </View>
    )
  }

  return (
    <View>
      {renderProgress(crawlProgress, 'Crawling')}

      {summaryProgress && (
        <View>
          <Text>Summarizing: {summaryProgress.percentage}%</Text>
          <Text>Completed: {summaryProgress.completed}</Text>
          <Text>Failed: {summaryProgress.failed}</Text>
        </View>
      )}
    </View>
  )
}
```

### 3.5 Type Safety Benefits

**Without Types** (❌ Error-prone):
```typescript
const progress = {
  curent: 50,  // Typo!
  totel: 100,  // Typo!
  percentage: 50
}
```

**With Types** (✅ Compile-time safety):
```typescript
const progress: ProgressData = {
  curent: 50,  // TypeScript error: 'curent' does not exist
  totel: 100,  // TypeScript error: 'totel' does not exist
  percentage: 50
}

// Correct:
const progress: ProgressData = {
  current: 50,
  total: 100,
  percentage: 50
}
```

---

## 4. Related Documentation

### 4.1 Core Documentation
- **[Development](../00-core/DEVELOPMENT.md)** - Development workflow, testing

### 4.2 Shared Module Documentation
- **[Shared Overview](./SHARED-OVERVIEW.md)** - Barrel Export pattern
- **[Shared Contexts](./SHARED-CONTEXTS.md)** - ThemeContext (uses storage), SocketContext (uses socket types)
- **[Shared Hooks](./SHARED-HOOKS.md)** - useAuth (uses storage), useLogin (uses Alert)
- **[Shared Services](./SHARED-SERVICES.md)** - API service layer
- **[Shared Constants](./SHARED-CONSTANTS.md)** - AUTH_CONSTANTS (used by Alert)

### 4.3 Backend Documentation
- **[Friendly Job Socket](../04-friendly/FRIENDLY-JOB-SOCKET.md)** - Server-side Socket.io (defines event data structures)

### 4.4 Usage Examples
- **[Web Login](../01-web/WEB-LOGIN.md)** - Alert and storage usage in login
- **[Mobile Login](../02-mobile/MOBILE-LOGIN.md)** - Mobile-specific Alert behavior
- **[Web Restaurant](../01-web/WEB-RESTAURANT.md)** - Socket type usage
- **[Mobile Restaurant Detail](../02-mobile/MOBILE-RESTAURANT-DETAIL.md)** - Progress display

---

**문서 버전**: 1.0
**작성일**: 2025-10-23
**관리**: Claude Code Documentation Team
