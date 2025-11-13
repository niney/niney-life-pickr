# Job Monitor Screen (Mobile)

> **Last Updated**: 2025-11-13
> **Purpose**: Real-time job monitoring screen with Socket.io integration for React Native

---

## 목차

1. [Overview](#1-overview)
2. [Component Architecture](#2-component-architecture)
3. [Socket Integration](#3-socket-integration)
4. [Job Management Utilities](#4-job-management-utilities)
5. [Pull-to-Refresh](#5-pull-to-refresh)
6. [Queue Monitoring](#6-queue-monitoring)
7. [UI Components](#7-ui-components)
8. [Navigation Integration](#8-navigation-integration)
9. [Related Documentation](#9-related-documentation)

---

## 1. Overview

### 1.1 Purpose

**JobMonitorScreen** is a mobile job monitoring screen that displays all active jobs with real-time progress updates via Socket.io.

**Location**: `apps/mobile/src/screens/JobMonitorScreen.tsx` (878 lines)

### 1.2 Key Features

#### 1.2.1 Socket-Only Architecture
- ✅ Initial loading: `subscribe:all_jobs` → `jobs:current_state`
- ✅ Real-time updates: Room-based progress events
- ✅ No HTTP polling: Zero server load
- ✅ Instant synchronization: Sub-second latency

#### 1.2.2 Robust Event Handling
- ✅ **JobCompletionTracker**: Prevents duplicate event processing
- ✅ **SocketSequenceManager**: Ensures event order correctness
- ✅ **SOCKET_CONFIG**: Centralized connection configuration

#### 1.2.3 Queue Management
- ✅ Real-time queue status (waiting, processing, completed, failed)
- ✅ Queue statistics display
- ✅ Queue item detail view

#### 1.2.4 Mobile UX
- ✅ Pull-to-refresh support
- ✅ SafeAreaView integration
- ✅ Tab navigator integration
- ✅ Restaurant detail navigation

---

## 2. Component Architecture

### 2.1 File Location
```
apps/mobile/src/screens/JobMonitorScreen.tsx
```

### 2.2 Component Structure

```typescript
const JobMonitorScreen: React.FC = () => {
  // ==================== Theme ====================
  const { theme } = useTheme();
  const colors = THEME_COLORS[theme];
  const navigation = useNavigation<JobMonitorNavigationProp>();

  // ==================== State Management ====================
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [subscribedRooms, setSubscribedRooms] = useState<Set<number>>(new Set());

  // Queue State
  const [queueItems, setQueueItems] = useState<QueuedJob[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats>({ ... });

  // ==================== Refs ====================
  // ✅ Job completion tracking (5-minute retention)
  const completedJobsRef = useRef(new JobCompletionTracker(5));

  // ✅ Sequence managers (per-phase tracking)
  const sequenceManagerRef = useRef(new SocketSequenceManager());

  // Socket and timeout refs
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ==================== Socket Connection ====================
  useEffect(() => {
    // Socket.io connection and event listeners
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView refreshControl={<RefreshControl ... />}>
        {/* Job List */}
        {/* Queue Stats */}
        {/* Queue Items */}
      </ScrollView>
    </SafeAreaView>
  );
};
```

### 2.3 Data Types

#### 2.3.1 Job

```typescript
interface Job {
  jobId: string;
  restaurantId: number;
  type: 'review_crawl' | 'review_summary' | 'restaurant_crawl';
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  isInterrupted: boolean; // Server restart/crash
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
  metadata?: Record<string, any>; // phase, step, substep
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}
```

#### 2.3.2 QueuedJob

```typescript
interface QueuedJob {
  queueId: string;
  jobId: string | null;
  type: 'review_crawl' | 'review_summary' | 'restaurant_crawl';
  restaurantId: number;
  metadata: Record<string, string | number | boolean>;
  queueStatus: 'waiting' | 'processing' | 'completed' | 'failed' | 'cancelled';
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  position?: number; // Position in queue
}
```

#### 2.3.3 QueueStats

```typescript
interface QueueStats {
  total: number;
  waiting: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
}
```

---

## 3. Socket Integration

### 3.1 Connection Setup

```typescript
import { io } from 'socket.io-client';
import { SOCKET_CONFIG } from 'shared/constants';
import { getDefaultApiUrl } from 'shared/services';

const SOCKET_URL = getDefaultApiUrl();

useEffect(() => {
  console.log('[JobMonitor] Connecting to:', SOCKET_URL);

  // ✅ Use centralized Socket configuration
  const newSocket = io(SOCKET_URL, SOCKET_CONFIG);

  newSocket.on('connect', () => {
    console.log('[JobMonitor] Socket connected:', newSocket.id);
    setSocketConnected(true);

    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  });

  newSocket.on('disconnect', (reason) => {
    console.log('[JobMonitor] Socket disconnected:', reason);
    setSocketConnected(false);
  });

  newSocket.on('connect_error', (error) => {
    console.error('[JobMonitor] Connection error:', error.message);
  });

  newSocket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`[JobMonitor] Reconnection attempt ${attemptNumber}/10`);
  });

  socketRef.current = newSocket;
  setSocket(newSocket);

  return () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    newSocket.close();
  };
}, []);
```

**Key Features**:
- Uses `SOCKET_CONFIG` for centralized configuration
- Handles reconnection attempts (10 attempts max)
- Clears reconnect timeout on successful connection
- Logs connection events for debugging

### 3.2 Initial Data Loading

```typescript
const subscribeToAllJobs = useCallback(() => {
  if (!socket) return;

  console.log('[JobMonitor] Subscribing to all jobs...');

  // Request initial state
  socket.emit('subscribe:all_jobs');

  // Receive initial jobs (once)
  socket.once('jobs:current_state', (data: {
    total: number;
    jobs: Job[];
    restaurantIds: number[];
    timestamp: number;
  }) => {
    console.log('[JobMonitor] Initial jobs received:', data);

    setJobs(data.jobs);
    setIsLoading(false);

    // Subscribe to all restaurant rooms
    data.restaurantIds.forEach((restaurantId) => {
      if (!subscribedRooms.has(restaurantId)) {
        socket.emit('subscribe:restaurant', restaurantId);
        setSubscribedRooms(prev => new Set(prev).add(restaurantId));
      }
    });
  });

  // Error handling
  socket.once('jobs:error', (error) => {
    console.error('[JobMonitor] Failed to load jobs:', error);
    setIsLoading(false);
  });
}, [socket, subscribedRooms]);

useEffect(() => {
  if (socket && socketConnected) {
    subscribeToAllJobs();
  }
}, [socket, socketConnected, subscribeToAllJobs]);
```

### 3.3 Event Handlers

#### 3.3.1 New Job Detection

```typescript
newSocket.on('job:new', (data: JobNewEventData) => {
  console.log('[JobMonitor] New job started:', data);

  // Auto-subscribe to new restaurant room
  setSubscribedRooms(prev => {
    if (prev.has(data.restaurantId)) {
      return prev;
    }

    socket.emit('subscribe:restaurant', data.restaurantId);
    console.log(`[JobMonitor] Subscribed to restaurant:${data.restaurantId}`);

    const newSet = new Set(prev);
    newSet.add(data.restaurantId);
    return newSet;
  });
});
```

#### 3.3.2 Progress Events

```typescript
// review:crawl_progress - Web crawling phase
newSocket.on('review:crawl_progress', (data: ProgressEventData) => {
  const jobId = data.jobId;

  // ✅ Step 1: Check if job already completed
  if (completedJobsRef.current.isCompleted(jobId)) {
    console.warn(`[JobMonitor] Ignored - job ${jobId} already completed`);
    return;
  }

  // ✅ Step 2: Check sequence order
  const sequence = data.sequence || data.current || 0;
  if (!sequenceManagerRef.current.check(jobId, sequence)) {
    console.warn(`[JobMonitor] Outdated event ignored - ${jobId}`);
    return;
  }

  // ✅ Step 3: Process event
  setJobs(prev => {
    const existingJob = prev.find(job => job.jobId === jobId);

    if (!existingJob) {
      // Create new job
      return [createJobFromProgress(data, 'review_crawl', { phase: 'crawl' }), ...prev];
    }

    // Update existing job
    return prev.map(job =>
      job.jobId === jobId
        ? {
            ...job,
            progress: {
              current: data.current,
              total: data.total,
              percentage: data.percentage
            },
            metadata: { phase: 'crawl' }
          }
        : job
    );
  });
});
```

#### 3.3.3 Completion Events

```typescript
newSocket.on('review:completed', (data: CompletionEventData) => {
  const jobId = data.jobId;

  // ✅ Mark job as completed
  completedJobsRef.current.markCompleted(jobId);

  // ✅ Reset sequence tracking
  sequenceManagerRef.current.reset(jobId);

  // Update job status
  setJobs(prev => prev.map(job =>
    job.jobId === jobId
      ? {
          ...job,
          status: 'completed',
          completedAt: new Date(data.timestamp).toISOString()
        }
      : job
  ));
});
```

---

## 4. Job Management Utilities

### 4.1 JobCompletionTracker

**Purpose**: Prevents duplicate event processing during Socket reconnections.

```typescript
import { JobCompletionTracker } from 'shared/utils';

const completedJobsRef = useRef(new JobCompletionTracker(5)); // 5-minute retention

useEffect(() => {
  const tracker = completedJobsRef.current;
  tracker.startAutoCleanup(5); // Auto-cleanup every 5 minutes

  return () => {
    tracker.stopAutoCleanup();
  };
}, []);

// Usage in event handler
if (completedJobsRef.current.isCompleted(jobId)) {
  return; // Ignore duplicate event
}
```

**Benefits**:
- ✅ 5-minute retention window
- ✅ Automatic cleanup (memory efficient)
- ✅ Prevents duplicate completion processing

### 4.2 SocketSequenceManager

**Purpose**: Ensures events are processed in order.

```typescript
import { SocketSequenceManager } from 'shared/utils';

const sequenceManagerRef = useRef(new SocketSequenceManager());

// Usage in event handler
const sequence = data.sequence || data.current || 0;
if (!sequenceManagerRef.current.check(jobId, sequence)) {
  return; // Ignore out-of-order event
}
```

**Benefits**:
- ✅ Prevents UI regression (80% → 50%)
- ✅ Handles network latency
- ✅ Per-job sequence tracking

See **[SHARED-UTILS.md](../../03-shared/SHARED-UTILS.md#4-job-management-utilities)** for detailed documentation.

---

## 5. Pull-to-Refresh

### 5.1 Implementation

```typescript
const [refreshing, setRefreshing] = useState(false);

const handleRefresh = useCallback(async () => {
  setRefreshing(true);

  try {
    if (socket && socketConnected) {
      // Re-subscribe to all jobs
      socket.emit('subscribe:all_jobs');

      // Wait for jobs:current_state response
      await new Promise<void>((resolve) => {
        socket.once('jobs:current_state', (data) => {
          setJobs(data.jobs);
          resolve();
        });

        // Timeout after 5 seconds
        setTimeout(() => resolve(), 5000);
      });
    }
  } catch (error) {
    console.error('[JobMonitor] Refresh error:', error);
  } finally {
    setRefreshing(false);
  }
}, [socket, socketConnected]);
```

### 5.2 UI Integration

```typescript
<ScrollView
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      colors={[colors.primary]} // Android
      tintColor={colors.primary} // iOS
    />
  }
>
  {/* Content */}
</ScrollView>
```

**UX**:
- Pull down to refresh job list
- Loading spinner with theme color
- Auto-resubscribe to rooms
- 5-second timeout fallback

---

## 6. Queue Monitoring

### 6.1 Queue State Management

```typescript
const [queueItems, setQueueItems] = useState<QueuedJob[]>([]);
const [queueStats, setQueueStats] = useState<QueueStats>({
  total: 0,
  waiting: 0,
  processing: 0,
  completed: 0,
  failed: 0,
  cancelled: 0,
});
```

### 6.2 Queue Event Handlers

```typescript
newSocket.on('queue:update', (data: {
  queueItems: QueuedJob[];
  stats: QueueStats;
}) => {
  console.log('[JobMonitor] Queue update:', data);
  setQueueItems(data.queueItems);
  setQueueStats(data.stats);
});

newSocket.on('queue:item_added', (item: QueuedJob) => {
  console.log('[JobMonitor] Queue item added:', item);
  setQueueItems(prev => [...prev, item]);
  setQueueStats(prev => ({ ...prev, total: prev.total + 1, waiting: prev.waiting + 1 }));
});
```

### 6.3 Queue Stats Display

```typescript
<View style={styles.queueStats}>
  <Text style={styles.statsTitle}>Queue Status</Text>
  <View style={styles.statsRow}>
    <StatBadge label="Total" value={queueStats.total} color={colors.text} />
    <StatBadge label="Waiting" value={queueStats.waiting} color="#f59e0b" />
    <StatBadge label="Processing" value={queueStats.processing} color={colors.primary} />
    <StatBadge label="Completed" value={queueStats.completed} color={colors.success} />
    <StatBadge label="Failed" value={queueStats.failed} color={colors.error} />
  </View>
</View>
```

---

## 7. UI Components

### 7.1 Job Card Layout

```typescript
<TouchableOpacity
  style={[
    styles.jobCard,
    {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderLeftColor: getStatusColor(job),
      borderLeftWidth: 4,
    }
  ]}
  onPress={() => navigation.navigate('RestaurantDetail', { id: job.restaurantId })}
>
  {/* Header */}
  <View style={styles.cardHeader}>
    <Text style={[styles.jobType, { color: colors.text }]}>
      {getTypeLabel(job.type)}
    </Text>
    <Text style={[styles.statusBadge, { backgroundColor: getStatusColor(job), color: '#fff' }]}>
      {getStatusText(job)}
    </Text>
  </View>

  {/* Restaurant link */}
  <Text style={[styles.restaurantLink, { color: colors.primary }]}>
    Restaurant #{job.restaurantId}
  </Text>

  {/* Phase label */}
  {job.status === 'active' && (
    <Text style={[styles.phaseLabel, { color: colors.textSecondary }]}>
      {getPhaseLabel(job)}
    </Text>
  )}

  {/* Progress bar */}
  {job.progress.total > 0 && (
    <View style={[styles.progressContainer, { backgroundColor: colors.border }]}>
      <View
        style={[
          styles.progressBar,
          {
            width: `${job.progress.percentage}%`,
            backgroundColor: getStatusColor(job),
          }
        ]}
      />
    </View>
  )}

  {/* Progress text */}
  <Text style={[styles.progressText, { color: colors.textSecondary }]}>
    {job.progress.current} / {job.progress.total} ({job.progress.percentage}%)
  </Text>

  {/* Error message */}
  {job.error && (
    <Text style={[styles.errorText, { color: colors.error }]}>
      {job.error}
    </Text>
  )}

  {/* Timestamps */}
  <View style={styles.timestamps}>
    <Text style={[styles.timestampText, { color: colors.textSecondary }]}>
      Started: {formatDate(job.startedAt)}
    </Text>
    {job.completedAt && (
      <Text style={[styles.timestampText, { color: colors.textSecondary }]}>
        Completed: {formatDate(job.completedAt)}
      </Text>
    )}
  </View>
</TouchableOpacity>
```

### 7.2 Helper Functions

#### 7.2.1 Type Labels

```typescript
const getTypeLabel = (type: Job['type']) => {
  switch (type) {
    case 'review_crawl':
      return 'Review Crawling';
    case 'review_summary':
      return 'AI Review Summary';
    case 'restaurant_crawl':
      return 'Restaurant Crawling';
    default:
      return 'Unknown';
  }
};
```

#### 7.2.2 Status Text

```typescript
const getStatusText = (job: Job) => {
  if (job.isInterrupted) return '⚠️ Interrupted';

  switch (job.status) {
    case 'active':
      return 'Active';
    case 'completed':
      return '✓ Completed';
    case 'failed':
      return '✗ Failed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Unknown';
  }
};
```

#### 7.2.3 Phase Labels

```typescript
const getPhaseLabel = (job: Job) => {
  if (job.type === 'review_crawl') {
    const phase = job.metadata?.phase;
    if (phase === 'crawl') return 'Web Crawling';
    if (phase === 'db') return 'DB Saving';
    if (phase === 'image') return 'Image Download';
  }
  if (job.type === 'review_summary') {
    return 'AI Summary Generation';
  }
  if (job.type === 'restaurant_crawl') {
    const step = job.metadata?.step;
    if (step === 'crawling') return 'Web Crawling';
    if (step === 'menu') return 'Menu Processing';
    return 'Restaurant Info Collection';
  }
  return '';
};
```

#### 7.2.4 Status Colors

```typescript
const getStatusColor = (job: Job) => {
  if (job.isInterrupted) return '#f59e0b'; // Orange warning

  switch (job.status) {
    case 'active':
      return colors.primary; // Blue
    case 'completed':
      return colors.success; // Green
    case 'failed':
      return colors.error; // Red
    case 'cancelled':
      return colors.textSecondary; // Gray
    default:
      return colors.text;
  }
};
```

### 7.3 SafeAreaView Integration

```typescript
import { SafeAreaView } from 'react-native-safe-area-context';

<SafeAreaView
  style={[styles.container, { backgroundColor: colors.background }]}
  edges={['top', 'left', 'right']} // Exclude bottom for tab bar
>
  <ScrollView>
    {/* Content */}
  </ScrollView>
</SafeAreaView>
```

**Benefits**:
- Respects device notches and safe areas
- Works with iOS/Android
- Excludes bottom edge for tab bar

---

## 8. Navigation Integration

### 8.1 Tab Navigator Setup

**File**: `apps/mobile/src/navigation/BottomTabNavigator.tsx`

```typescript
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import JobMonitorScreen from '../screens/JobMonitorScreen';
import { TabBarIcons } from '../components/TabBarIcons';

const Tab = createBottomTabNavigator<RootTabParamList>();

<Tab.Screen
  name="JobMonitor"
  component={JobMonitorScreen}
  options={{
    title: 'Jobs',
    tabBarIcon: ({ focused, color, size }) => (
      <TabBarIcons.JobMonitor focused={focused} color={color} size={size} />
    ),
  }}
/>
```

### 8.2 Tab Bar Icon

**File**: `apps/mobile/src/components/TabBarIcons.tsx`

```typescript
export const TabBarIcons = {
  // ... other icons
  JobMonitor: ({ focused, color, size }: TabBarIconProps) => (
    <Icon
      name={focused ? 'clipboard-list' : 'clipboard-list-outline'}
      size={size}
      color={color}
    />
  ),
};
```

### 8.3 Navigation Types

**File**: `apps/mobile/src/navigation/types.ts`

```typescript
export type RootTabParamList = {
  Home: undefined;
  RestaurantSearch: undefined;
  JobMonitor: undefined; // ✅ Added
  Settings: undefined;
};

// JobMonitor is in Tab, RestaurantDetail is in Stack
type JobMonitorNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, 'JobMonitor'>,
  NativeStackNavigationProp<RestaurantStackParamList>
>;
```

### 8.4 Restaurant Detail Navigation

```typescript
const navigation = useNavigation<JobMonitorNavigationProp>();

// Navigate to Restaurant Detail
<TouchableOpacity
  onPress={() => navigation.navigate('RestaurantDetail', { id: job.restaurantId })}
>
  <Text>Restaurant #{job.restaurantId}</Text>
</TouchableOpacity>
```

**Navigation Flow**:
1. User taps on job card
2. Navigate to `RestaurantDetail` screen with `restaurantId`
3. RestaurantDetail shows job progress for that specific restaurant

---

## 9. Related Documentation

### 9.1 Backend
- **[FRIENDLY-JOB-SOCKET.md](../../04-friendly/FRIENDLY-JOB-SOCKET.md)** - JobSocketService implementation
- **[FRIENDLY-ROUTES.md](../../04-friendly/FRIENDLY-ROUTES.md)** - Job API endpoints

### 9.2 Frontend
- **[WEB-JOB-MONITOR.md](../../01-web/WEB-JOB-MONITOR.md)** - Web version of Job Monitor
- **[MOBILE-NAVIGATION.md](./MOBILE-NAVIGATION.md)** - Tab navigator setup
- **[MOBILE-COMPONENTS.md](./MOBILE-COMPONENTS.md)** - TabBarIcons

### 9.3 Shared
- **[SHARED-CONTEXTS.md](../../03-shared/SHARED-CONTEXTS.md)** - SocketContext (Restaurant-specific)
- **[SHARED-UTILS.md](../../03-shared/SHARED-UTILS.md)** - JobCompletionTracker, SocketSequenceManager
- **[SHARED-CONSTANTS.md](../../03-shared/SHARED-CONSTANTS.md)** - SOCKET_CONFIG, THEME_COLORS

---

## Summary

**JobMonitorScreen** provides mobile-native job monitoring with:

1. **Socket-only architecture**: Zero HTTP polling overhead
2. **Robust event handling**: JobCompletionTracker + SocketSequenceManager
3. **Pull-to-refresh**: Native mobile UX pattern
4. **Queue monitoring**: Real-time queue stats and items
5. **SafeAreaView**: Respects device safe areas
6. **Tab integration**: Native tab bar navigation
7. **Restaurant navigation**: Direct navigation to restaurant detail

**Key Innovation**:
- Two-phase event protection: completion tracking + sequence management
- Centralized Socket configuration with `SOCKET_CONFIG`
- Pull-to-refresh for manual sync fallback
- Queue monitoring alongside job monitoring

This ensures **zero duplicate events** and **zero out-of-order updates** on mobile devices.

---

**문서 버전**: 1.0
**작성일**: 2025-11-13
**관리**: Claude Code Documentation Team
