# Job Monitor Component (Web)

> **Last Updated**: 2025-11-13
> **Purpose**: Real-time job monitoring screen with Socket.io integration

---

## 목차

1. [Overview](#1-overview)
2. [Component Architecture](#2-component-architecture)
3. [Socket Integration](#3-socket-integration)
4. [Sequence Management](#4-sequence-management)
5. [Job Auto-creation](#5-job-auto-creation)
6. [Auto-completion Logic](#6-auto-completion-logic)
7. [UI Components](#7-ui-components)
8. [Usage Examples](#8-usage-examples)
9. [Related Documentation](#9-related-documentation)

---

## 1. Overview

### 1.1 Purpose

**JobMonitor** is a real-time job monitoring screen that displays all active jobs across all restaurants. It provides:
- 100% Socket-based real-time updates (no HTTP polling)
- Automatic room subscription for new jobs
- Out-of-order event handling with sequence tracking
- Mobile-friendly card layout
- Job phase visualization (crawling, DB saving, image processing, etc.)

### 1.2 Key Features

#### 1.2.1 Socket-Only Architecture
- ✅ Initial loading: `subscribe:all_jobs` → `jobs:current_state`
- ✅ Real-time updates: Room-based progress events
- ✅ No HTTP polling: Zero server load
- ✅ Instant synchronization: Sub-second latency

#### 1.2.2 Automatic Room Subscription
- ✅ `job:new` global event for new job detection
- ✅ Auto-subscribe to new restaurant rooms
- ✅ Defensive job creation in progress handlers

#### 1.2.3 Robust Event Handling
- ✅ **JobCompletionTracker**: Prevents duplicate event processing (5-min retention)
- ✅ **SocketSequenceManager**: Ensures event order correctness
- ✅ **SOCKET_CONFIG**: Centralized connection configuration

#### 1.2.4 Auto-completion
- ✅ 100% progress → auto-complete (3s delay)
- ✅ Fallback for missing `completed` events
- ✅ User sees 100% before transition

---

## 2. Component Architecture

### 2.1 File Location
```
apps/web/src/components/JobMonitor.tsx
```

### 2.2 Component Structure

```typescript
export const JobMonitor: React.FC<JobMonitorProps> = ({ onLogout }) => {
  // ==================== State Management ====================
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [subscribedRooms, setSubscribedRooms] = useState<Set<number>>(new Set());

  // ✅ Job completion tracking (5-minute retention)
  const completedJobsRef = useRef(new JobCompletionTracker(5));

  // ✅ Sequence tracking (per-job)
  const sequenceManagerRef = useRef(new SocketSequenceManager());
  
  // ==================== Socket Connection ====================
  useEffect(() => {
    // Socket.io connection and event listeners
  }, []);
  
  // ==================== Initial Loading ====================
  const subscribeToAllJobs = useCallback(() => {
    socket.emit('subscribe:all_jobs');
    socket.once('jobs:current_state', (data) => {
      // Set jobs and subscribe to all restaurant rooms
    });
  }, [socket]);
  
  // ==================== Helper Functions ====================
  const checkSequence = useCallback((jobId: string, newSequence: number) => {
    // Filter out-of-order events
  }, []);
  
  const createJobFromProgress = useCallback((data, type, metadata) => {
    // Defensive job creation
  }, []);
  
  return (
    <View>
      <Header />
      <ScrollView>
        {jobs.map(job => <JobCard key={job.jobId} job={job} />)}
      </ScrollView>
    </View>
  );
};
```

### 2.3 Job Data Type

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

---

## 3. Socket Integration

### 3.1 Connection Setup

```typescript
import { io } from 'socket.io-client';
import { SOCKET_CONFIG } from '@shared/constants';
import { getDefaultApiUrl } from '@shared/services';

const SOCKET_URL = getDefaultApiUrl();

useEffect(() => {
  console.log('[JobMonitor] Connecting to:', SOCKET_URL);

  // ✅ Use centralized Socket configuration
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

**Configuration** (from `SOCKET_CONFIG`):
- **transports**: `['websocket', 'polling']` - Websocket first, polling fallback
- **reconnection**: `true` - Auto-reconnect on disconnect
- **reconnectionAttempts**: `10` - Max retry attempts
- **reconnectionDelay**: `1000ms` - Initial retry delay
- **timeout**: `20000ms` - Connection timeout

See **[SHARED-CONSTANTS.md](../../03-shared/SHARED-CONSTANTS.md#6-socket_config)** for detailed configuration.

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
```

### 3.3 Event Handlers

#### 3.3.1 New Job Detection
```typescript
newSocket.on('job:new', (data: {
  jobId: string;
  type: string;
  restaurantId: number;
  timestamp: number;
}) => {
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
import { JobCompletionTracker, SocketSequenceManager } from '@shared/utils';

// review:crawl_progress - Web crawling phase
newSocket.on('review:crawl_progress', (data: any) => {
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
      return [createJobFromProgress(data, 'review_crawl', { phase: 'crawl' }), ...prev];
    }

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

  // ✅ Auto-complete on 100%
  if (data.percentage === 100) {
    setTimeout(() => {
      setJobs(prev => prev.map(job =>
        job.jobId === jobId && job.status === 'active'
          ? { ...job, status: 'completed', completedAt: new Date().toISOString() }
          : job
      ));
      sequenceManagerRef.current.reset(jobId);
    }, 3000);
  }
});

// Other progress events follow the same pattern:
// - review:db_progress (DB saving phase)
// - review:image_progress (Image download phase)
// - review_summary:progress (AI summarization)
// - restaurant:menu_progress (Restaurant crawling)
```

#### 3.3.3 Completion Events
```typescript
newSocket.on('review:completed', (data: any) => {
  const jobId = data.jobId;

  // ✅ Mark job as completed
  completedJobsRef.current.markCompleted(jobId);

  // ✅ Reset sequence tracking
  sequenceManagerRef.current.reset(jobId);

  // Update job status
  setJobs(prev => prev.map(job =>
    job.jobId === jobId
      ? { ...job, status: 'completed', completedAt: new Date(data.timestamp).toISOString() }
      : job
  ));
});

newSocket.on('review:error', (data: any) => {
  const jobId = data.jobId;

  // ✅ Mark as completed (error is terminal state)
  completedJobsRef.current.markCompleted(jobId);

  // ✅ Reset sequence tracking
  sequenceManagerRef.current.reset(jobId);

  // Update job status
  setJobs(prev => prev.map(job =>
    job.jobId === jobId
      ? { ...job, status: 'failed', error: data.error }
      : job
  ));
});

newSocket.on('review:cancelled', (data: any) => {
  const jobId = data.jobId;

  // ✅ Mark as completed (cancellation is terminal state)
  completedJobsRef.current.markCompleted(jobId);

  // ✅ Reset sequence tracking
  sequenceManagerRef.current.reset(jobId);

  // Update job status
  setJobs(prev => prev.map(job =>
    job.jobId === jobId
      ? { ...job, status: 'cancelled' }
      : job
  ));
});
```

---

## 4. Job Management Utilities

### 4.1 Overview

JobMonitor uses two utility classes for robust event handling:

1. **JobCompletionTracker**: Prevents duplicate event processing
2. **SocketSequenceManager**: Ensures event order correctness

**Import**:
```typescript
import { JobCompletionTracker, SocketSequenceManager } from '@shared/utils';
```

### 4.2 JobCompletionTracker

**Purpose**: Tracks completed jobs to prevent duplicate processing during Socket reconnections.

```typescript
const completedJobsRef = useRef(new JobCompletionTracker(5)); // 5-minute retention

useEffect(() => {
  const tracker = completedJobsRef.current;
  tracker.startAutoCleanup(5); // Auto-cleanup every 5 minutes

  return () => {
    tracker.stopAutoCleanup();
  };
}, []);
```

**Usage**:
```typescript
// In event handler - check if already completed
if (completedJobsRef.current.isCompleted(jobId)) {
  return; // Ignore duplicate event
}

// On completion - mark as completed
completedJobsRef.current.markCompleted(jobId);
```

### 4.3 SocketSequenceManager

**Purpose**: Ensures events are processed in order, preventing UI regressions.

```typescript
const sequenceManagerRef = useRef(new SocketSequenceManager());
```

**Usage**:
```typescript
// In event handler - check sequence order
const sequence = data.sequence || data.current || 0;
if (!sequenceManagerRef.current.check(jobId, sequence)) {
  return; // Ignore out-of-order event
}

// On completion - reset sequence tracking
sequenceManagerRef.current.reset(jobId);
```

### 4.4 Combined Protection

**Three-layer event validation**:

```typescript
newSocket.on('review:crawl_progress', (data: any) => {
  const jobId = data.jobId;

  // ✅ Layer 1: Check if job already completed
  if (completedJobsRef.current.isCompleted(jobId)) {
    return; // Ignore completed job events
  }

  // ✅ Layer 2: Check sequence order
  const sequence = data.sequence || data.current || 0;
  if (!sequenceManagerRef.current.check(jobId, sequence)) {
    return; // Ignore out-of-order events
  }

  // ✅ Layer 3: Process event (safe!)
  setJobs(prev => /* update job */);
});
```

**Benefits**:
- ✅ **No duplicates**: Completed jobs ignored
- ✅ **No regressions**: Progress never goes backwards
- ✅ **Memory efficient**: Auto-cleanup after 5 minutes
- ✅ **Reconnection safe**: Handles Socket reconnections gracefully

See **[SHARED-UTILS.md](../../03-shared/SHARED-UTILS.md#4-job-management-utilities)** for detailed API documentation.

---

## 5. Job Auto-creation

### 5.1 Problem

**Race condition**: `job:new` event might be missed due to:
- Network issues
- Client not yet subscribed
- Event lost during reconnection

**Result**: Progress events arrive for unknown jobs.

### 5.2 Solution: Defensive Job Creation

```typescript
/**
 * Create job from progress event if not exists
 */
const createJobFromProgress = useCallback((
  data: any,
  type: Job['type'],
  additionalMetadata?: Record<string, any>
): Job => {
  console.log(`[JobMonitor] Creating job from progress - ${type}:`, data.jobId);
  
  return {
    jobId: data.jobId,
    restaurantId: data.restaurantId,
    type,
    status: 'active',
    isInterrupted: false,
    progress: {
      current: data.current || 0,
      total: data.total || 0,
      percentage: data.percentage || 0
    },
    metadata: additionalMetadata || {},
    createdAt: new Date(data.timestamp || Date.now()).toISOString(),
    startedAt: new Date(data.timestamp || Date.now()).toISOString()
  };
}, []);
```

### 5.3 Usage in Progress Handlers

```typescript
newSocket.on('review:crawl_progress', (data: any) => {
  const sequence = data.sequence || data.current || 0;
  if (!checkSequence(data.jobId, sequence)) return;
  
  setJobs(prev => {
    const existingJob = prev.find(job => job.jobId === data.jobId);
    
    // ✅ Create job if missing
    if (!existingJob) {
      return [createJobFromProgress(data, 'review_crawl', { phase: 'crawl' }), ...prev];
    }
    
    // Update existing job
    return prev.map(job =>
      job.jobId === data.jobId ? { ...job, /* update */ } : job
    );
  });
});
```

---

## 6. Auto-completion Logic

### 6.1 Purpose

**Fallback mechanism**: If server fails to send `completed` event, auto-complete on 100%.

### 6.2 Implementation

```typescript
newSocket.on('review:crawl_progress', (data: any) => {
  // ... update progress ...
  
  // ✅ Auto-complete on 100%
  if (data.percentage === 100 || data.current === data.total) {
    setTimeout(() => {
      setJobs(prev => prev.map(job =>
        job.jobId === data.jobId && job.status === 'active'
          ? {
              ...job,
              status: 'completed',
              completedAt: new Date().toISOString()
            }
          : job
      ));
      resetSequence(data.jobId);
    }, 3000); // ✅ 3s delay: user sees 100% before completion
  }
});
```

### 6.3 Benefits

- ✅ **Resilience**: Works even if `completed` event is lost
- ✅ **UX**: User sees 100% for 3 seconds before transition
- ✅ **Safety**: `status === 'active'` check prevents duplicate completion
- ✅ **Memory**: Auto-cleanup sequence tracking

---

## 7. UI Components

### 7.1 Job Card Layout

```tsx
<View style={styles.jobCard}>
  {/* Header */}
  <View style={styles.cardHeader}>
    <Text style={styles.jobType}>{getTypeLabel(job.type)}</Text>
    <Text style={styles.statusBadge}>{getStatusText(job)}</Text>
  </View>
  
  {/* Restaurant link */}
  <TouchableOpacity onPress={() => window.open(`/restaurant/${job.restaurantId}`)}>
    <Text>레스토랑 #{job.restaurantId}</Text>
  </TouchableOpacity>
  
  {/* Phase label */}
  {job.status === 'active' && (
    <Text>{getPhaseLabel(job)}</Text>
  )}
  
  {/* Progress bar */}
  {job.progress.total > 0 && (
    <View style={styles.progressBar}>
      <View style={[styles.progressFill, { width: `${job.progress.percentage}%` }]} />
    </View>
  )}
  
  {/* Error message */}
  {job.error && <Text>{job.error}</Text>}
  
  {/* Timestamps */}
  <View style={styles.timestamps}>
    <Text>시작: {formatDate(job.startedAt)}</Text>
    {job.completedAt && <Text>완료: {formatDate(job.completedAt)}</Text>}
  </View>
</View>
```

### 7.2 Phase Labels

```typescript
const getPhaseLabel = (job: Job) => {
  if (job.type === 'review_crawl') {
    const phase = job.metadata?.phase;
    if (phase === 'crawl') return '웹 크롤링 중';
    if (phase === 'db') return 'DB 저장 중';
    if (phase === 'image') return '이미지 다운로드 중';
  }
  if (job.type === 'review_summary') {
    return 'AI 요약 생성 중';
  }
  if (job.type === 'restaurant_crawl') {
    const step = job.metadata?.step;
    const substep = job.metadata?.substep;
    
    if (step === 'crawling') return '웹 크롤링 중';
    if (step === 'menu') {
      if (substep === 'normalizing') return '메뉴 정규화 중';
      if (substep === 'saving') return 'DB 저장 중';
      return '메뉴 처리 중';
    }
    return '레스토랑 정보 수집 중';
  }
  return '';
};
```

### 7.3 Status Colors

```typescript
const getStatusColor = (job: Job) => {
  if (job.isInterrupted) return '#f59e0b'; // warning
  
  switch (job.status) {
    case 'active': return colors.primary;
    case 'completed': return colors.success;
    case 'failed': return colors.error;
    case 'cancelled': return colors.textSecondary;
    default: return colors.text;
  }
};
```

### 7.4 Mobile-Friendly Card

```typescript
const styles = StyleSheet.create({
  jobCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderLeftWidth: 4, // ✅ Colored left border for status
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
```

---

## 8. Usage Examples

### 8.1 Route Configuration

```tsx
// apps/web/src/App.tsx
import { JobMonitor } from './components/JobMonitor';

<Routes>
  <Route path="/jobs" element={<JobMonitor />} />
</Routes>
```

### 8.2 Drawer Menu

```tsx
// apps/web/src/components/Drawer.tsx
<TouchableOpacity onPress={() => navigate('/jobs')}>
  <Text>⚙️ Job 관리</Text>
</TouchableOpacity>
```

### 8.3 Header Integration

```tsx
<Header onMenuPress={() => setDrawerVisible(true)} />
<Drawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
```

---

## 9. Related Documentation

### 9.1 Backend
- [`FRIENDLY-JOB-SOCKET.md`](../../04-friendly/FRIENDLY-JOB-SOCKET.md) - JobSocketService implementation
- [`FRIENDLY-ROUTES.md`](../../04-friendly/FRIENDLY-ROUTES.md) - Job API endpoints

### 9.2 Frontend
- [`WEB-PATTERNS.md`](./WEB-PATTERNS.md) - React Native Web patterns
- [`WEB-ROUTING.md`](./WEB-ROUTING.md) - Routing configuration
- [`WEB-HEADER-DRAWER.md`](./WEB-HEADER-DRAWER.md) - Header & Drawer components
- [`MOBILE-JOB-MONITOR.md`](../../02-mobile/MOBILE-JOB-MONITOR.md) - Mobile version of Job Monitor

### 9.3 Shared
- [`SHARED-CONTEXTS.md`](../../03-shared/SHARED-CONTEXTS.md) - SocketContext (Restaurant-specific)
- [`SHARED-UTILS.md`](../../03-shared/SHARED-UTILS.md) - JobCompletionTracker, SocketSequenceManager
- [`SHARED-CONSTANTS.md`](../../03-shared/SHARED-CONSTANTS.md) - SOCKET_CONFIG

---

## Summary

**JobMonitor** provides enterprise-grade job monitoring with:

1. **Socket-only architecture**: Zero HTTP polling overhead
2. **Robust event handling**: JobCompletionTracker + SocketSequenceManager
3. **Auto-subscription**: Dynamic room joining for new jobs
4. **Defensive creation**: Jobs created from progress events if missing
5. **Auto-completion**: 100% → complete fallback (3s delay)
6. **Mobile-friendly UI**: Card layout with colored status indicators
7. **Phase visualization**: Real-time job phase labels

**Key Innovation**: Three-layer event protection:
1. **JobCompletionTracker**: Prevents duplicate completion processing (5-min retention)
2. **SocketSequenceManager**: Ensures event order (prevents UI regression)
3. **Defensive job creation**: Resilient to missed `job:new` events

This ensures **zero duplicate events**, **zero out-of-order updates**, and **zero missed jobs** across all restaurants.

---

**문서 버전**: 1.1
**최종 업데이트**: 2025-11-13
**변경 사항**:
- JobCompletionTracker, SocketSequenceManager 적용 반영
- SOCKET_CONFIG 사용 추가
- Sequence Management 섹션을 Job Management Utilities로 재구성
**이전 버전**: Section 4 (Sequence Management) → Section 4 (Job Management Utilities)
