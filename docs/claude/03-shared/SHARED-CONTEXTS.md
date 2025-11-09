# Shared Contexts

> **Last Updated**: 2025-11-10
> **Purpose**: React Context providers for theme management and real-time Socket.io communication

---

## 목차

1. [ThemeContext](#1-themecontext)
2. [SocketContext](#2-socketcontext)
3. [Related Documentation](#3-related-documentation)

---

## 1. ThemeContext

**Location**: `apps/shared/contexts/ThemeContext.tsx`

### 1.1 Overview

ThemeContext provides theme state management across the entire application with support for light and dark modes.

### 1.2 Context Structure

```typescript
export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}
```

**Fields**:
- `theme`: Current theme ('light' or 'dark')
- `isDark`: Helper boolean (true if theme === 'dark')
- `toggleTheme`: Function to toggle between light and dark
- `setTheme`: Function to directly set a specific theme

### 1.3 ThemeProvider Component

#### 1.3.1 Usage

```typescript
import { ThemeProvider } from '@shared/contexts/ThemeContext'

function App() {
  return (
    <ThemeProvider>
      <YourApp />
    </ThemeProvider>
  )
}
```

#### 1.3.2 Implementation

```typescript
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('light');

  // Load theme from storage on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await storage.getItem('app_theme');
        if (savedTheme === 'dark' || savedTheme === 'light') {
          setThemeState(savedTheme);
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
      }
    };
    loadTheme();
  }, []);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      await storage.setItem('app_theme', newTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const value: ThemeContextType = {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
    setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
```

**Key Features**:
- **Auto-restore**: Loads saved theme from storage on app startup
- **Persistence**: Automatically saves theme changes to storage
- **Error handling**: Graceful fallback if storage fails

### 1.4 useTheme Hook

#### 1.4.1 Basic Usage

```typescript
import { useTheme } from '@shared/contexts/ThemeContext'

function Header() {
  const { theme, isDark, toggleTheme, setTheme } = useTheme()

  return (
    <View style={{ backgroundColor: isDark ? '#000' : '#FFF' }}>
      <Pressable onPress={toggleTheme}>
        <Text>{isDark ? '☀️' : '🌙'}</Text>
      </Pressable>
    </View>
  )
}
```

#### 1.4.2 With THEME_COLORS

```typescript
import { useTheme } from '@shared/contexts/ThemeContext'
import { THEME_COLORS } from '@shared/constants'

function Component() {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]

  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.text }}>Hello</Text>
    </View>
  )
}
```

#### 1.4.3 Error Handling

```typescript
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
```

**Important**: `useTheme` must be called inside a `ThemeProvider` or it will throw an error.

### 1.5 Theme Persistence

#### 1.5.1 Storage Key

The theme is stored using the key: `'app_theme'`

```typescript
// Save
await storage.setItem('app_theme', 'dark')

// Load
const savedTheme = await storage.getItem('app_theme')
```

**Storage Implementation**:
- **Web**: `localStorage` (synchronous wrapper)
- **Mobile**: `AsyncStorage` (asynchronous)
- **Abstraction**: Unified `storage` utility from `@shared/utils`

#### 1.5.2 Lifecycle

1. **App Startup**: ThemeProvider loads saved theme from storage
2. **Theme Change**: User toggles or sets theme
3. **Auto-save**: Theme is immediately saved to storage
4. **Next Startup**: Saved theme is restored

### 1.6 THEME_COLORS Constants

**Location**: `apps/shared/constants/theme.constants.ts`

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

export const HEADER_HEIGHT = 48;
```

#### 1.6.1 Color Palette Usage

```typescript
import { THEME_COLORS } from '@shared/constants'
import { useTheme } from '@shared/contexts/ThemeContext'

const { theme } = useTheme()
const colors = THEME_COLORS[theme]

// Use theme colors
<View style={{ backgroundColor: colors.background }}>
  <View style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
    <Text style={{ color: colors.text }}>Title</Text>
    <Text style={{ color: colors.textSecondary }}>Subtitle</Text>
  </View>
</View>
```

#### 1.6.2 Color Naming Convention

| Color Name | Purpose |
|-----------|---------|
| `background` | App background (screen background) |
| `surface` | Card/panel background |
| `primary` | Primary action color (buttons, links) |
| `secondary` | Secondary action color |
| `text` | Primary text color |
| `textSecondary` | Secondary/muted text |
| `border` | Border and divider lines |
| `error` | Error states and messages |
| `success` | Success states and messages |
| `headerBackground` | Header/navbar background |
| `headerText` | Header/navbar text |

#### 1.6.3 Theme Consistency

**Important**: Always use `THEME_COLORS[theme]` instead of hardcoded colors to ensure consistent theming.

```typescript
// ❌ Bad: Hardcoded colors
<View style={{ backgroundColor: '#FFFFFF' }}>

// ✅ Good: Theme-aware colors
<View style={{ backgroundColor: colors.background }}>
```

---

## 2. SocketContext

**Location**: `apps/shared/contexts/SocketContext.tsx`

### 2.1 Overview

SocketContext provides real-time communication with the backend via Socket.io, managing restaurant room subscriptions, progress tracking, and event callbacks for crawling and summarization jobs.

### 2.2 Context Structure

```typescript
interface SocketContextValue {
  // Socket Connection
  socket: Socket | null
  isConnected: boolean

  // Progress States
  menuProgress: ProgressData | null
  crawlProgress: ProgressData | null
  dbProgress: ProgressData | null
  imageProgress: ProgressData | null
  isCrawlInterrupted: boolean  // ✅ Interrupted state flag

  // Review Summary State
  reviewSummaryStatus: ReviewSummaryStatus
  summaryProgress: SummaryProgress | null

  // Room Management
  joinRestaurantRoom: (restaurantId: string) => void
  leaveRestaurantRoom: (restaurantId: string) => void

  // Callbacks
  setRestaurantCallbacks: (callbacks: RestaurantCallbacks) => void

  // Reset Functions
  resetCrawlStatus: () => void
  resetSummaryStatus: () => void
}
```

### 2.3 Type Definitions

#### 2.3.1 ProgressData

```typescript
interface ProgressData {
  current: number;
  total: number;
  percentage: number;
}
```

**Usage**: Tracks progress for menu crawling, review crawling, DB saving, and image processing.

#### 2.3.2 ReviewSummaryStatus

```typescript
interface ReviewSummaryStatus {
  status: 'idle' | 'active' | 'completed' | 'failed';
  error?: string;
}
```

**States**:
- `idle`: No summary job running
- `active`: Summary job in progress
- `completed`: Summary job finished successfully
- `failed`: Summary job encountered an error

#### 2.3.3 SummaryProgress

```typescript
interface SummaryProgress extends ProgressData {
  completed: number;
  failed: number;
}
```

**Additional Fields**:
- `completed`: Number of reviews successfully summarized
- `failed`: Number of reviews that failed to summarize

#### 2.3.4 RestaurantCallbacks

```typescript
interface RestaurantCallbacks {
  onMenuCrawlCompleted?: (data: { restaurantId: string }) => void
  onReviewCrawlCompleted?: (data: { restaurantId: string; totalReviews: number }) => void
  onReviewCrawlError?: (data: { restaurantId: string; error: string }) => void
  onReviewSummaryCompleted?: (data: { restaurantId: string }) => void
}
```

### 2.4 SocketProvider Component

#### 2.4.1 Usage

```typescript
import { SocketProvider } from '@shared/contexts/SocketContext'

function App() {
  return (
    <SocketProvider serverUrl="http://localhost:4000">
      <YourApp />
    </SocketProvider>
  )
}
```

**Props**:
- `children`: React child nodes
- `serverUrl` (optional): Backend server URL (defaults to `getDefaultApiUrl()`)

#### 2.4.2 Socket.io Client Setup

```typescript
useEffect(() => {
  console.log('[Socket.io] Connecting to:', resolvedServerUrl)

  const socket = io(resolvedServerUrl, {
    transports: ['websocket', 'polling']
  })

  socket.on('connect', () => {
    console.log('[Socket.io] Connected:', socket.id)
    setIsConnected(true)
  })

  socket.on('disconnect', () => {
    console.log('[Socket.io] Disconnected')
    setIsConnected(false)
  })

  socketRef.current = socket

  return () => {
    socket.disconnect()
  }
}, [resolvedServerUrl])
```

**Transports**:
- **websocket**: Primary transport (fast, bidirectional)
- **polling**: Fallback for environments that don't support WebSocket

### 2.5 Restaurant Room Management

#### 2.5.1 Join Room

```typescript
const joinRestaurantRoom = (restaurantId: string) => {
  const socket = socketRef.current
  if (!socket) {
    console.error('[Socket.io] Socket not initialized')
    return
  }

  // Leave previous room if different
  if (currentRestaurantIdRef.current && currentRestaurantIdRef.current !== restaurantId) {
    socket.emit('unsubscribe:restaurant', currentRestaurantIdRef.current)
    console.log(`[Socket.io] Left room: restaurant:${currentRestaurantIdRef.current}`)
  }

  currentRestaurantIdRef.current = restaurantId

  // Join new room
  socket.emit('subscribe:restaurant', restaurantId)
  console.log(`[Socket.io] Joined room: restaurant:${restaurantId}`)
}
```

**Behavior**:
- Auto-leaves previous room if switching restaurants
- Emits `subscribe:restaurant` event to server
- Updates `currentRestaurantIdRef` to track current room

#### 2.5.2 Leave Room

```typescript
const leaveRestaurantRoom = (restaurantId: string) => {
  const socket = socketRef.current
  if (!socket) return

  socket.emit('unsubscribe:restaurant', restaurantId)
  console.log(`[Socket.io] Left room: restaurant:${restaurantId}`)

  if (currentRestaurantIdRef.current === restaurantId) {
    currentRestaurantIdRef.current = null
    callbacksRef.current = {}
  }
}
```

**Behavior**:
- Emits `unsubscribe:restaurant` event to server
- Clears callbacks if leaving current room

#### 2.5.3 Usage in Components

```typescript
const { joinRestaurantRoom, leaveRestaurantRoom } = useSocket()

useEffect(() => {
  if (restaurantId) {
    joinRestaurantRoom(String(restaurantId))
    return () => leaveRestaurantRoom(String(restaurantId))
  }
}, [restaurantId, joinRestaurantRoom, leaveRestaurantRoom])
```

**Pattern**: Auto-subscribe when component mounts, auto-unsubscribe when unmounts or restaurant changes.

### 2.6 Job Tracking System

#### 2.6.1 Completed Job Tracking

The SocketContext tracks completed jobs to prevent duplicate processing of events from the same job.

**Data Structures**:
```typescript
const completedCrawlJobsRef = useRef<Map<string, number>>(new Map())
const completedSummaryJobsRef = useRef<Map<string, number>>(new Map())
const JOB_RETENTION_MS = 5 * 60 * 1000 // 5 minutes
```

**Key-Value**:
- **Key**: Job ID (UUID)
- **Value**: Timestamp (Date.now()) when job was completed

#### 2.6.2 Job Completion Marking

```typescript
const markCrawlJobAsCompleted = (jobId: string) => {
  completedCrawlJobsRef.current.set(jobId, Date.now())
  console.log(`[Socket.io] Marked crawl job as completed: ${jobId}`)
}

const markSummaryJobAsCompleted = (jobId: string) => {
  completedSummaryJobsRef.current.set(jobId, Date.now())
  console.log(`[Socket.io] Marked summary job as completed: ${jobId}`)
}
```

#### 2.6.3 Job Completion Checking

```typescript
const isCrawlJobCompleted = (jobId: string): boolean => {
  cleanupCompletedCrawlJobs()
  return completedCrawlJobsRef.current.has(jobId)
}

const isSummaryJobCompleted = (jobId: string): boolean => {
  cleanupCompletedSummaryJobs()
  return completedSummaryJobsRef.current.has(jobId)
}
```

**Usage in Event Listeners**:
```typescript
socket.on('review:db_progress', (data: any) => {
  const jobId = data.jobId

  // Ignore if job already completed
  if (jobId && isCrawlJobCompleted(jobId)) {
    console.warn(`[Socket.io] Ignored - crawl job ${jobId} already completed`)
    return
  }

  // Process event...
})
```

#### 2.6.4 Auto-cleanup of Old Jobs

```typescript
const cleanupCompletedCrawlJobs = () => {
  const now = Date.now()
  const jobsToDelete: string[] = []

  completedCrawlJobsRef.current.forEach((timestamp, jobId) => {
    if (now - timestamp > JOB_RETENTION_MS) {
      jobsToDelete.push(jobId)
    }
  })

  jobsToDelete.forEach(jobId => {
    completedCrawlJobsRef.current.delete(jobId)
    console.log(`[Socket.io] Cleaned up old crawl job: ${jobId}`)
  })
}

// Periodic cleanup every 5 minutes
const cleanupInterval = setInterval(() => {
  cleanupCompletedCrawlJobs()
  cleanupCompletedSummaryJobs()
}, JOB_RETENTION_MS)
```

**Benefits**:
- Prevents duplicate event processing
- Auto-cleanup prevents memory leaks
- Separate tracking for crawl and summary jobs

### 2.7 Sequence Number Tracking

#### 2.7.1 Purpose

Sequence numbers guarantee that progress updates are processed in order, preventing out-of-order UI updates.

#### 2.7.2 Implementation

```typescript
const lastCrawlSequenceRef = useRef<number>(0)
const lastDbSequenceRef = useRef<number>(0)
const lastImageSequenceRef = useRef<number>(0)
const lastSummarySequenceRef = useRef<number>(0)
```

#### 2.7.3 Sequence Checking

```typescript
socket.on('review:crawl_progress', (data: any) => {
  const sequence = data.sequence || data.current || 0

  // Ignore outdated events
  if (sequence < lastCrawlSequenceRef.current) {
    console.warn(`[Socket.io] Outdated crawl progress ignored: ${sequence} < ${lastCrawlSequenceRef.current}`)
    return
  }

  lastCrawlSequenceRef.current = sequence

  // Process event...
  setCrawlProgress({
    current: data.current || 0,
    total: data.total || 0,
    percentage: data.percentage || 0
  })
})
```

**Benefits**:
- Prevents UI from going backwards (e.g., 80% → 50%)
- Handles network delays and out-of-order delivery
- Per-phase tracking (crawl, db, image, summary)

### 2.8 Event Listeners

#### 2.8.1 Current State Event

**Event**: `restaurant:current_state`

**Purpose**: Synchronize client state when subscribing to a restaurant room. Includes active job events and interrupted job count.

**Payload**:
```typescript
{
  restaurantId: number;
  activeEventNames: string[];  // List of active event names
  interruptedCount: number;    // Number of interrupted jobs
  hasActiveJobs: boolean;
  timestamp: number;
}
```

**Handler Implementation**:
```typescript
socket.on('restaurant:current_state', (data: any) => {
  console.log('[Socket.io] Current State:', data)

  const activeEvents = new Set(data.activeEventNames || [])

  // ✅ Reflect interrupted state
  if (data.interruptedCount > 0) {
    setIsCrawlInterrupted(true)
  } else if (activeEvents.size === 0) {
    // No active jobs and no interrupted jobs → reset
    setIsCrawlInterrupted(false)
  }

  // Reset progress states based on active events
  if (!activeEvents.has('restaurant:menu_progress')) {
    setMenuProgress(null)
  }

  if (!activeEvents.has('review:crawl_progress')) {
    setCrawlProgress(null)
    lastCrawlSequenceRef.current = 0
  }

  if (!activeEvents.has('review:db_progress')) {
    setDbProgress(null)
    lastDbSequenceRef.current = 0
  }

  if (!activeEvents.has('review:image_progress')) {
    setImageProgress(null)
    lastImageSequenceRef.current = 0
  }

  if (!activeEvents.has('review_summary:progress')) {
    setReviewSummaryStatus({ status: 'idle' })
    setSummaryProgress(null)
    lastSummarySequenceRef.current = 0
  }

  console.log(`[Socket.io] State initialized - Active events: [${Array.from(activeEvents).join(', ')}], Interrupted: ${data.interruptedCount > 0}`)
})
```

**Key Features**:
- **State Synchronization**: Received when joining a restaurant room
- **Interrupted Job Detection**: `interruptedCount > 0` indicates server restart during job execution
- **Progress Reset**: Clears progress for inactive events
- **UI State Management**: Sets `isCrawlInterrupted` flag for visual indicators

**Use Case**:
```typescript
// Client subscribes to restaurant:123
joinRestaurantRoom('123')

// Server sends current state
// → If server was restarted mid-job, interruptedCount > 0
// → Client shows "⚠️ 크롤링 중단됨" UI
```

#### 2.8.2 Interrupted Events

The following interruption events are sent when the server detects a job interruption (DB shows 'active' but memory doesn't have the job).

**Event**: `review:interrupted`

```typescript
socket.on('review:interrupted', (data: any) => {
  console.warn('[Socket.io] Review crawl interrupted:', data)
  const jobId = data.jobId

  // Mark job as completed (terminal state)
  if (jobId) {
    markCrawlJobAsCompleted(jobId)
    currentCrawlJobIdRef.current = null
  }

  // Set interrupted flag
  setIsCrawlInterrupted(true)

  // Reset all progress
  setCrawlProgress(null)
  setDbProgress(null)
  setImageProgress(null)
  lastCrawlSequenceRef.current = 0
  lastDbSequenceRef.current = 0
  lastImageSequenceRef.current = 0

  // Trigger callback
  if (callbacksRef.current.onReviewCrawlError) {
    callbacksRef.current.onReviewCrawlError({
      restaurantId: data.restaurantId?.toString() || '',
      error: data.reason || 'Server restarted - job was interrupted'
    })
  }
})
```

**Event**: `review_summary:interrupted`

```typescript
socket.on('review_summary:interrupted', (data: any) => {
  console.warn('[Socket.io] Review summary interrupted:', data)
  const jobId = data.jobId

  if (jobId) {
    markSummaryJobAsCompleted(jobId)
    currentSummaryJobIdRef.current = null
  }

  setReviewSummaryStatus({
    status: 'failed',
    error: data.reason || 'Server restarted - job was interrupted'
  })
  setSummaryProgress(null)
  lastSummarySequenceRef.current = 0
})
```

**Event**: `restaurant_crawl:interrupted`

```typescript
socket.on('restaurant_crawl:interrupted', (data: any) => {
  console.warn('[Socket.io] Restaurant crawl interrupted:', data)
  setMenuProgress(null)
})
```

**Benefits**:
- **Immediate Notification**: Clients know about interruption as soon as they subscribe
- **Persistent State**: DB keeps 'active' status so all future clients also get notified
- **No Alerts**: Only UI state updates, no disruptive popups
- **Visual Indicators**: `isCrawlInterrupted` flag triggers orange border and warning icon

#### 2.8.3 Menu Crawl Events

**Event**: `restaurant:menu_progress`

```typescript
socket.on('restaurant:menu_progress', (data: any) => {
  console.log('[Socket.io] Menu Progress:', data)

  setMenuProgress({
    current: data.current || 0,
    total: data.total || 0,
    percentage: data.percentage || 0
  })

  // 100% completion
  if (data.percentage === 100 || data.current === data.total) {
    setTimeout(() => {
      setMenuProgress(null)
    }, 1000) // Hide after 1 second

    // Trigger callback
    if (callbacksRef.current.onMenuCrawlCompleted) {
      callbacksRef.current.onMenuCrawlCompleted({
        restaurantId: data.restaurantId?.toString() || ''
      })
    }
  }
})
```

#### 2.8.4 Review Crawl Events

**Event**: `review:crawl_progress` (Web crawling phase)

```typescript
socket.on('review:crawl_progress', (data: any) => {
  console.log('[Socket.io] Crawl Progress:', data)

  const jobId = data.jobId

  // Check if job already completed
  if (jobId && isCrawlJobCompleted(jobId)) {
    console.warn(`[Socket.io] Ignored - crawl job ${jobId} already completed`)
    return
  }

  // Update current job ID
  if (currentCrawlJobIdRef.current !== jobId) {
    currentCrawlJobIdRef.current = jobId
    console.log(`[Socket.io] New crawl job started: ${jobId}`)
  }

  // Sequence check
  const sequence = data.sequence || data.current || 0
  if (sequence < lastCrawlSequenceRef.current) {
    console.warn(`[Socket.io] Outdated crawl progress ignored`)
    return
  }
  lastCrawlSequenceRef.current = sequence

  // Update progress
  setCrawlProgress({
    current: data.current || 0,
    total: data.total || 0,
    percentage: data.percentage || 0
  })
})
```

**Event**: `review:db_progress` (DB saving phase)

```typescript
socket.on('review:db_progress', (data: any) => {
  console.log('[Socket.io] DB Progress:', data)

  const jobId = data.jobId

  // Check completion
  if (jobId && isCrawlJobCompleted(jobId)) {
    console.warn(`[Socket.io] Ignored - crawl job ${jobId} already completed`)
    return
  }

  // Sequence check
  const sequence = data.sequence || data.current || 0
  if (sequence < lastDbSequenceRef.current) {
    console.warn(`[Socket.io] Outdated db progress ignored`)
    return
  }
  lastDbSequenceRef.current = sequence

  // Update progress
  setDbProgress({
    current: data.current || 0,
    total: data.total || 0,
    percentage: data.percentage || 0
  })

  // 100% completion
  if (data.percentage === 100 || data.current === data.total) {
    // Mark job as completed
    if (jobId) {
      markCrawlJobAsCompleted(jobId)
      currentCrawlJobIdRef.current = null
    }

    // Reset all progress
    setCrawlProgress(null)
    setDbProgress(null)
    setImageProgress(null)
    lastCrawlSequenceRef.current = 0
    lastDbSequenceRef.current = 0
    lastImageSequenceRef.current = 0

    // Trigger callback
    if (callbacksRef.current.onReviewCrawlCompleted) {
      callbacksRef.current.onReviewCrawlCompleted({
        restaurantId: data.restaurantId?.toString() || '',
        totalReviews: data.total || 0
      })
    }
  }
})
```

**Event**: `review:image_progress` (Image processing phase)

```typescript
socket.on('review:image_progress', (data: any) => {
  console.log('[Socket.io] Image Progress:', data)

  const jobId = data.jobId

  // Check completion
  if (jobId && isCrawlJobCompleted(jobId)) {
    console.warn(`[Socket.io] Ignored - crawl job ${jobId} already completed`)
    return
  }

  // Sequence check
  const sequence = data.sequence || data.current || 0
  if (sequence < lastImageSequenceRef.current) {
    console.warn(`[Socket.io] Outdated image progress ignored`)
    return
  }
  lastImageSequenceRef.current = sequence

  // Update progress
  setImageProgress({
    current: data.current || 0,
    total: data.total || 0,
    percentage: data.percentage || 0
  })
})
```

**Event**: `review:no_active_job` (No active crawl job)

```typescript
socket.on('review:no_active_job', (data: any) => {
  console.log('[Socket.io] No Active Crawl Job:', data)
  setCrawlProgress(null)
  setDbProgress(null)
  setImageProgress(null)
  lastCrawlSequenceRef.current = 0
  lastDbSequenceRef.current = 0
  lastImageSequenceRef.current = 0
})
```

**Event**: `review:error` (Crawl error)

```typescript
socket.on('review:error', (data: any) => {
  console.error('[Socket.io] Error:', data)
  const errorMessage = data.error || '크롤링 중 오류가 발생했습니다'
  const jobId = data.jobId

  // Mark job as completed (error is terminal state)
  if (jobId) {
    markCrawlJobAsCompleted(jobId)
    currentCrawlJobIdRef.current = null
  }

  // Reset all progress
  setCrawlProgress(null)
  setDbProgress(null)
  setImageProgress(null)
  lastCrawlSequenceRef.current = 0
  lastDbSequenceRef.current = 0
  lastImageSequenceRef.current = 0

  // Show error alert
  Alert.error('크롤링 실패', errorMessage)

  // Trigger callback
  if (callbacksRef.current.onReviewCrawlError) {
    callbacksRef.current.onReviewCrawlError({
      restaurantId: data.restaurantId?.toString() || '',
      error: errorMessage
    })
  }
})
```

#### 2.8.5 Review Summary Events

**Event**: `review_summary:progress`

```typescript
socket.on('review_summary:progress', (data: any) => {
  console.log('[Socket.io] Summary Progress:', data)

  const jobId = data.jobId

  // Check completion
  if (jobId && isSummaryJobCompleted(jobId)) {
    console.warn(`[Socket.io] Ignored - summary job ${jobId} already completed`)
    return
  }

  // Update current job ID
  if (currentSummaryJobIdRef.current !== jobId) {
    currentSummaryJobIdRef.current = jobId
    console.log(`[Socket.io] New summary job started: ${jobId}`)
  }

  // Sequence check
  const sequence = data.sequence || data.current || 0
  if (sequence < lastSummarySequenceRef.current) {
    console.warn(`[Socket.io] Outdated summary progress ignored`)
    return
  }
  lastSummarySequenceRef.current = sequence

  // Update status and progress
  setReviewSummaryStatus({ status: 'active' })
  setSummaryProgress({
    current: data.current || 0,
    total: data.total || 0,
    percentage: data.percentage || 0,
    completed: data.completed || 0,
    failed: data.failed || 0
  })

  // 100% completion
  if (data.percentage === 100 || data.current === data.total) {
    // Mark job as completed
    if (jobId) {
      markSummaryJobAsCompleted(jobId)
      currentSummaryJobIdRef.current = null
    }

    setReviewSummaryStatus({ status: 'completed' })
    setSummaryProgress(null)
    lastSummarySequenceRef.current = 0

    // Trigger callback
    if (callbacksRef.current.onReviewSummaryCompleted) {
      callbacksRef.current.onReviewSummaryCompleted({
        restaurantId: data.restaurantId?.toString() || ''
      })
    }
  }
})
```

**Event**: `review_summary:no_active_job`

```typescript
socket.on('review_summary:no_active_job', (data: any) => {
  console.log('[Socket.io] No Active Summary Job:', data)
  setReviewSummaryStatus({ status: 'idle' })
  setSummaryProgress(null)
  lastSummarySequenceRef.current = 0
})
```

**Event**: `review_summary:error`

```typescript
socket.on('review_summary:error', (data: any) => {
  console.error('[Socket.io] Summary Error:', data)
  const errorMessage = data.error || '요약 중 오류가 발생했습니다'
  const jobId = data.jobId

  // Mark job as completed (error is terminal state)
  if (jobId) {
    markSummaryJobAsCompleted(jobId)
    currentSummaryJobIdRef.current = null
  }

  setReviewSummaryStatus({ status: 'failed', error: errorMessage })
  setSummaryProgress(null)
  lastSummarySequenceRef.current = 0

  Alert.error('요약 실패', errorMessage)
})
```

### 2.9 Callback System

#### 2.9.1 Setting Callbacks

```typescript
const setRestaurantCallbacks = (callbacks: {
  onMenuCrawlCompleted?: (data: { restaurantId: string }) => void
  onReviewCrawlCompleted?: (data: { restaurantId: string; totalReviews: number }) => void
  onReviewCrawlError?: (data: { restaurantId: string; error: string }) => void
  onReviewSummaryCompleted?: (data: { restaurantId: string }) => void
}) => {
  callbacksRef.current = callbacks
}
```

#### 2.9.2 Usage in Components

```typescript
const { setRestaurantCallbacks } = useSocket()

useEffect(() => {
  setRestaurantCallbacks({
    onMenuCrawlCompleted: (data) => {
      console.log('Menu crawl completed:', data.restaurantId)
      refetchMenus()
    },
    onReviewCrawlCompleted: (data) => {
      console.log('Review crawl completed:', data.totalReviews)
      refetchReviews()
    },
    onReviewCrawlError: (data) => {
      console.error('Crawl error:', data.error)
    },
    onReviewSummaryCompleted: (data) => {
      console.log('Summary completed:', data.restaurantId)
      refetchSummary()
    }
  })

  return () => {
    setRestaurantCallbacks({})
  }
}, [])
```

### 2.10 Reset Functions

#### 2.10.1 Reset Crawl Status

```typescript
const resetCrawlStatus = () => {
  setMenuProgress(null)
  setCrawlProgress(null)
  setDbProgress(null)
  setImageProgress(null)
  setIsCrawlInterrupted(false)  // ✅ Reset interrupted flag
  lastCrawlSequenceRef.current = 0
  lastDbSequenceRef.current = 0
  lastImageSequenceRef.current = 0
}
```

**Usage**: Call when navigating away from restaurant or manually resetting progress. Also resets the interrupted state flag.

#### 2.10.2 Reset Summary Status

```typescript
const resetSummaryStatus = () => {
  setReviewSummaryStatus({ status: 'idle' })
  setSummaryProgress(null)
}
```

**Usage**: Call before starting a new summary job.

### 2.11 useSocket Hook

```typescript
export const useSocket = (): SocketContextValue => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}
```

**Error Handling**: Throws error if used outside `SocketProvider`.

### 2.12 Complete Usage Example

```typescript
import { useSocket } from '@shared/contexts/SocketContext'
import { useEffect } from 'react'

function RestaurantDetail({ restaurantId }: { restaurantId: number }) {
  const {
    isConnected,
    crawlProgress,
    dbProgress,
    isCrawlInterrupted,
    reviewSummaryStatus,
    summaryProgress,
    joinRestaurantRoom,
    leaveRestaurantRoom,
    setRestaurantCallbacks
  } = useSocket()

  // Auto-subscribe to restaurant room
  useEffect(() => {
    if (restaurantId) {
      joinRestaurantRoom(String(restaurantId))
      return () => leaveRestaurantRoom(String(restaurantId))
    }
  }, [restaurantId, joinRestaurantRoom, leaveRestaurantRoom])

  // Set callbacks
  useEffect(() => {
    setRestaurantCallbacks({
      onReviewCrawlCompleted: (data) => {
        console.log('Crawl completed:', data.totalReviews)
        refetchReviews()
      },
      onReviewSummaryCompleted: (data) => {
        console.log('Summary completed')
        refetchSummary()
      }
    })

    return () => setRestaurantCallbacks({})
  }, [])

  return (
    <View>
      {/* Connection Status */}
      {!isConnected && <Text>Socket disconnected</Text>}

      {/* Interrupted State */}
      {isCrawlInterrupted && (
        <View style={{ borderColor: '#ff9800', borderWidth: 1 }}>
          <Text style={{ color: '#ff9800' }}>⚠️ 크롤링 중단됨</Text>
          <Text>서버가 재시작되어 작업이 중단되었습니다. 다시 시도해주세요.</Text>
        </View>
      )}

      {/* Crawl Progress */}
      {crawlProgress && !isCrawlInterrupted && (
        <View>
          <Text>Crawling: {crawlProgress.percentage}%</Text>
          <ProgressBar value={crawlProgress.percentage} />
        </View>
      )}

      {/* DB Progress */}
      {dbProgress && (
        <View>
          <Text>Saving: {dbProgress.percentage}%</Text>
          <ProgressBar value={dbProgress.percentage} />
        </View>
      )}

      {/* Summary Progress */}
      {reviewSummaryStatus.status === 'active' && summaryProgress && (
        <View>
          <Text>Summarizing: {summaryProgress.percentage}%</Text>
          <Text>Completed: {summaryProgress.completed}</Text>
          <Text>Failed: {summaryProgress.failed}</Text>
        </View>
      )}

      {/* Summary Completed */}
      {reviewSummaryStatus.status === 'completed' && (
        <Text>Summary completed!</Text>
      )}

      {/* Summary Error */}
      {reviewSummaryStatus.status === 'failed' && (
        <Text>Error: {reviewSummaryStatus.error}</Text>
      )}
    </View>
  )
}
```

---

## 3. Related Documentation

### 3.1 Core Documentation
- **[Development](../00-core/DEVELOPMENT.md)** - Testing strategies

### 3.2 Shared Module Documentation
- **[Shared Overview](./SHARED-OVERVIEW.md)** - Barrel Export pattern
- **[Shared Utils](./SHARED-UTILS.md)** - Socket utils, storage, Alert
- **[Shared Hooks](./SHARED-HOOKS.md)** - useAuth, useLogin
- **[Shared Constants](./SHARED-CONSTANTS.md)** - THEME_COLORS, APP_INFO_CONSTANTS

### 3.3 Backend Documentation
- **[Friendly Job Socket](../04-friendly/FRIENDLY-JOB-SOCKET.md)** - Server-side Socket.io implementation

### 3.4 Web/Mobile Documentation
- **[Web Theme](../01-web/WEB-THEME.md)** - Theme usage in web app
- **[Web Restaurant](../01-web/WEB-RESTAURANT.md)** - Socket usage in restaurant component
- **[Mobile Restaurant Detail](../02-mobile/MOBILE-RESTAURANT-DETAIL.md)** - Socket usage in mobile

---

**문서 버전**: 1.0
**작성일**: 2025-10-23
**관리**: Claude Code Documentation Team
