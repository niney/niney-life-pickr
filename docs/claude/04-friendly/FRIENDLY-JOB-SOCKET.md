# Unified Job + Socket.io System

> **Last Updated**: 2025-11-10
> **Purpose**: Complete documentation of the unified Job + Socket.io real-time system with global job:new event

---

## 목차

1. [Architecture Overview](#1-architecture-overview)
2. [Core Components](#2-core-components)
3. [Unified Job Lifecycle](#3-unified-job-lifecycle)
4. [Socket.io Room Strategy](#4-socketio-room-strategy)
5. [Socket Event Types](#5-socket-event-types)
6. [Global Job Detection](#6-global-job-detection)
7. [Job Cancellation System](#7-job-cancellation-system)
8. [90% Parameter Reduction](#8-90-parameter-reduction)
9. [Key Implementation Details](#9-key-implementation-details)
10. [API Endpoints](#10-api-endpoints)
11. [Client Integration](#11-client-integration)
12. [Testing Considerations](#12-testing-considerations)
13. [Related Documentation](#13-related-documentation)

---

## 1. Architecture Overview

### 1.1 Unified Job + Socket Management

The **JobSocketService** provides a unified interface for all job types in the system:
- All job types (`review_crawl`, `review_summary`, `restaurant_crawl`) use a single service
- Automatic DB storage + Socket event emission
- Restaurant room-based real-time updates for multi-user collaboration
- Global `job:new` event for cross-restaurant job detection
- Job ID tracking for status queries and cancellation

### 1.2 Job Types

#### 1.2.1 review_crawl
- **Purpose**: Naver Map review crawling
- **Cancellable**: Yes (with AbortController)
- **Phases**: Web crawling → DB saving
- **Events**: started, crawl_progress, db_progress, completed, error, cancelled

#### 1.2.2 review_summary
- **Purpose**: AI-based review summarization
- **Cancellable**: No (fast batch processing)
- **Phases**: AI processing with batch progress
- **Events**: started, progress, completed, error

#### 1.2.3 restaurant_crawl
- **Purpose**: Restaurant information crawling (future)
- **Cancellable**: No
- **Events**: started, progress, completed, error

### 1.3 Design Philosophy

#### 1.3.1 90% Parameter Reduction
- Options objects completely eliminated
- Auto-fetch type and restaurantId from DB using jobId
- Only pass essential parameters (jobId, current, total)

#### 1.3.2 Single Source of Truth
- `socket/events.ts` defines all events, types, and mapping logic
- No hardcoded event names in services
- Easy to add new job types

#### 1.3.3 Automatic Operations
- **DB Persistence**: Automatic via `job.repository.ts`
- **Socket Emission**: Automatic via `getSocketEvent()`
- **Type Safety**: Unified `JobEventData` structure

#### 1.3.4 Multi-user Collaboration
- Restaurant room-based subscriptions
- All users viewing the same restaurant receive updates
- Prevents duplicate work

---

## 2. Core Components

### 2.1 JobSocketService

**Location**: `servers/friendly/src/services/job-socket.service.ts`

#### 2.1.1 Purpose
- Unified Job + Socket management
- Single service for all job operations (start, progress, complete, error, cancel)
- Automatic DB persistence and Socket event emission

#### 2.1.2 Constructor
```typescript
export class JobSocketService {
  constructor(
    private jobRepository: JobRepository,
    private io: Server
  ) {}
}
```

**Dependencies**:
- `jobRepository`: Database access for job CRUD operations
- `io`: Socket.io server instance for event emission

#### 2.1.3 Methods

##### start()

**Signature**:
```typescript
async start(options: {
  type: JobType;
  restaurantId: number;
  metadata?: Record<string, any>;
}): Promise<string>
```

**Purpose**: Create a new job in the database and emit a start event.

**Parameters**:
- `type`: Job type ('review_crawl', 'review_summary', 'restaurant_crawl')
- `restaurantId`: Restaurant ID for room-based Socket emission
- `metadata`: Optional job-specific data (url, placeId, etc.)

**Returns**: Job ID (UUID string)

**Implementation**:
```typescript
async start(options: StartOptions): Promise<string> {
  const jobId = crypto.randomUUID()

  // 1. Create job in DB
  await this.jobRepository.create({
    id: jobId,
    type: options.type,
    restaurant_id: options.restaurantId,
    status: 'active',
    progress_current: 0,
    progress_total: 0,
    progress_percentage: 0,
    metadata: JSON.stringify(options.metadata || {})
  })

  // 2. Emit Socket event
  const eventName = getSocketEvent(options.type, 'started')
  this.io.to(`restaurant:${options.restaurantId}`).emit(eventName, {
    jobId,
    type: options.type,
    restaurantId: options.restaurantId,
    status: 'started',
    timestamp: Date.now(),
    ...options.metadata
  })

  return jobId
}
```

**Flow**:
1. Generate UUID for job
2. Insert job record into `jobs` table with status 'active'
3. Get correct event name via `getSocketEvent(type, 'started')`
4. Emit Socket event to restaurant room (`restaurant:${restaurantId}`)
5. Return job ID for tracking

**Example**:
```typescript
const jobId = await jobSocketService.start({
  type: 'review_crawl',
  restaurantId: 123,
  metadata: { placeId: 'abc123', url: 'https://...' }
})
// → DB: Job created with id = 'uuid-...'
// → Socket: Emits 'review:started' to room 'restaurant:123'
```

##### progress()

**Signature**:
```typescript
async progress(
  jobId: string,
  current: number,
  total: number,
  metadata?: Record<string, any>
): Promise<void>
```

**Purpose**: Update job progress in DB and emit progress event.

**Parameters**:
- `jobId`: Job UUID (auto-fetches type and restaurantId from DB)
- `current`: Current progress count
- `total`: Total items to process
- `metadata`: Optional progress-specific data (phase, completed, failed, etc.)

**Implementation**:
```typescript
async progress(
  jobId: string,
  current: number,
  total: number,
  metadata?: Record<string, any>
): Promise<void> {
  // 1. Fetch job from DB to get type and restaurantId
  const job = await this.jobRepository.findById(jobId)
  if (!job) throw new Error('Job not found')

  // 2. Calculate percentage
  const percentage = Math.round((current / total) * 100)

  // 3. Update DB
  await this.jobRepository.updateProgress(jobId, current, total)

  // 4. Determine event name based on metadata.phase (for review_crawl)
  let eventStatus = 'progress'
  if (job.type === 'review_crawl' && metadata?.phase) {
    eventStatus = `${metadata.phase}_progress` // 'crawl_progress' or 'db_progress'
  }

  // 5. Emit Socket event
  const eventName = getSocketEvent(job.type, eventStatus)
  this.io.to(`restaurant:${job.restaurant_id}`).emit(eventName, {
    jobId,
    type: job.type,
    restaurantId: job.restaurant_id,
    status: 'progress',
    current,
    total,
    percentage,
    timestamp: Date.now(),
    ...metadata
  })
}
```

**Flow**:
1. Auto-fetch job from DB using jobId
2. Calculate percentage: `Math.round((current / total) * 100)`
3. Update DB: `progress_current`, `progress_total`, `progress_percentage`
4. Determine event status (with special handling for `review_crawl` phases)
5. Get correct event name via `getSocketEvent(type, eventStatus)`
6. Emit Socket event to restaurant room

**Example (Review Crawl - Crawling Phase)**:
```typescript
await jobSocketService.progress(jobId, 50, 100, { phase: 'crawl' })
// → DB: progress_current=50, progress_total=100, progress_percentage=50
// → Socket: Emits 'review:crawl_progress' to room 'restaurant:123'
```

**Example (Review Crawl - DB Saving Phase)**:
```typescript
await jobSocketService.progress(jobId, 80, 100, { phase: 'db' })
// → DB: progress_current=80, progress_total=100, progress_percentage=80
// → Socket: Emits 'review:db_progress' to room 'restaurant:123'
```

**Example (Review Summary)**:
```typescript
await jobSocketService.progress(jobId, 30, 100, { completed: 28, failed: 2 })
// → DB: progress_current=30, progress_total=100, progress_percentage=30
// → Socket: Emits 'review_summary:progress' with { completed: 28, failed: 2 }
```

##### complete()

**Signature**:
```typescript
async complete(
  jobId: string,
  result?: Record<string, any>
): Promise<void>
```

**Purpose**: Mark job as completed in DB and emit completion event.

**Parameters**:
- `jobId`: Job UUID (auto-fetches type and restaurantId)
- `result`: Optional result data (totalReviews, savedToDb, completed, failed, etc.)

**Implementation**:
```typescript
async complete(
  jobId: string,
  result?: Record<string, any>
): Promise<void> {
  // 1. Fetch job from DB
  const job = await this.jobRepository.findById(jobId)
  if (!job) throw new Error('Job not found')

  // 2. Update DB
  await this.jobRepository.updateStatus(jobId, 'completed', result)

  // 3. Emit Socket event
  const eventName = getSocketEvent(job.type, 'completed')
  this.io.to(`restaurant:${job.restaurant_id}`).emit(eventName, {
    jobId,
    type: job.type,
    restaurantId: job.restaurant_id,
    status: 'completed',
    timestamp: Date.now(),
    ...result
  })
}
```

**Flow**:
1. Auto-fetch job from DB using jobId
2. Update DB: `status='completed'`, `result=JSON.stringify(result)`, `completed_at=now()`
3. Get correct event name via `getSocketEvent(type, 'completed')`
4. Emit Socket event to restaurant room

**Example (Review Crawl)**:
```typescript
await jobSocketService.complete(jobId, {
  totalReviews: 100,
  savedToDb: 95,
  duplicates: 5
})
// → DB: status='completed', result='{"totalReviews":100,"savedToDb":95,...}'
// → Socket: Emits 'review:completed'
```

**Example (Review Summary)**:
```typescript
await jobSocketService.complete(jobId, { completed: 98, failed: 2 })
// → DB: status='completed', result='{"completed":98,"failed":2}'
// → Socket: Emits 'review_summary:completed'
```

##### error()

**Signature**:
```typescript
async error(
  jobId: string,
  errorMessage: string,
  metadata?: Record<string, any>
): Promise<void>
```

**Purpose**: Mark job as failed in DB and emit error event.

**Parameters**:
- `jobId`: Job UUID (auto-fetches type and restaurantId)
- `errorMessage`: Error description
- `metadata`: Optional error context data

**Implementation**:
```typescript
async error(
  jobId: string,
  errorMessage: string,
  metadata?: Record<string, any>
): Promise<void> {
  // 1. Fetch job from DB
  const job = await this.jobRepository.findById(jobId)
  if (!job) throw new Error('Job not found')

  // 2. Update DB
  await this.jobRepository.updateStatus(jobId, 'failed', {
    error_message: errorMessage,
    ...metadata
  })

  // 3. Emit Socket event
  const eventName = getSocketEvent(job.type, 'error')
  this.io.to(`restaurant:${job.restaurant_id}`).emit(eventName, {
    jobId,
    type: job.type,
    restaurantId: job.restaurant_id,
    status: 'error',
    error: errorMessage,
    timestamp: Date.now(),
    ...metadata
  })
}
```

**Flow**:
1. Auto-fetch job from DB using jobId
2. Update DB: `status='failed'`, `error_message=errorMessage`, `completed_at=now()`
3. Get correct event name via `getSocketEvent(type, 'error')`
4. Emit Socket event to restaurant room

**Example**:
```typescript
await jobSocketService.error(jobId, 'Network timeout', { retryable: true })
// → DB: status='failed', error_message='Network timeout'
// → Socket: Emits 'review:error' with error message
```

##### cancel()

**Signature**:
```typescript
async cancel(
  jobId: string,
  metadata?: Record<string, any>
): Promise<void>
```

**Purpose**: Mark job as cancelled in DB and emit cancellation event.

**Parameters**:
- `jobId`: Job UUID (auto-fetches type and restaurantId)
- `metadata`: Optional cancellation context data

**Note**: Only used for `review_crawl` jobs (long-running, interruptible).

**Implementation**:
```typescript
async cancel(
  jobId: string,
  metadata?: Record<string, any>
): Promise<void> {
  // 1. Fetch job from DB
  const job = await this.jobRepository.findById(jobId)
  if (!job) throw new Error('Job not found')

  // 2. Update DB
  await this.jobRepository.updateStatus(jobId, 'cancelled', metadata)

  // 3. Emit Socket event
  const eventName = getSocketEvent(job.type, 'cancelled')
  this.io.to(`restaurant:${job.restaurant_id}`).emit(eventName, {
    jobId,
    type: job.type,
    restaurantId: job.restaurant_id,
    status: 'cancelled',
    timestamp: Date.now(),
    ...metadata
  })
}
```

**Flow**:
1. Auto-fetch job from DB using jobId
2. Update DB: `status='cancelled'`, `completed_at=now()`
3. Get correct event name via `getSocketEvent(type, 'cancelled')`
4. Emit Socket event to restaurant room

**Example**:
```typescript
await jobSocketService.cancel(jobId, { reason: 'User cancelled', totalReviews: 100 })
// → DB: status='cancelled'
// → Socket: Emits 'review:cancelled'
```

---

### 2.2 JobManager

**Location**: `servers/friendly/src/services/job-manager.service.ts`

#### 2.2.1 Purpose
- In-memory job state management with AbortController
- **Only for `review_crawl` jobs** (real-time cancellation support)
- Provides interrupt-based cancellation via abort signals

#### 2.2.2 Why Only review_crawl?
- Review crawling is long-running (1-2 minutes)
- Interruptible (can stop mid-crawl or mid-DB-save)
- Other jobs (`review_summary`, `restaurant_crawl`) are fast or non-interruptible

#### 2.2.3 Data Structure
```typescript
export class JobManager {
  private jobs: Map<string, {
    controller: AbortController;
  }> = new Map()
}
```

**Key-Value**:
- **Key**: Job ID (UUID)
- **Value**: Object containing `AbortController` instance

#### 2.2.4 Methods

##### createMemoryJob()

**Signature**:
```typescript
createMemoryJob(jobId: string): void
```

**Purpose**: Create an AbortController for a job and store in memory.

**Implementation**:
```typescript
createMemoryJob(jobId: string): void {
  const controller = new AbortController()
  this.jobs.set(jobId, { controller })
  console.log(`[JobManager] Created memory job: ${jobId}`)
}
```

**Example**:
```typescript
// In review-crawler-processor.service.ts
const jobId = await jobSocketService.start({ type: 'review_crawl', ... })
jobManager.createMemoryJob(jobId) // Store AbortController
```

##### isCancelled()

**Signature**:
```typescript
isCancelled(jobId: string): boolean
```

**Purpose**: Check if a job has been cancelled via AbortController signal.

**Implementation**:
```typescript
isCancelled(jobId: string): boolean {
  const job = this.jobs.get(jobId)
  if (!job) return false
  return job.controller.signal.aborted
}
```

**Returns**:
- `true`: Job has been cancelled (signal.aborted = true)
- `false`: Job is still active or not found

**Example**:
```typescript
// Check in processing loop
for (const review of reviews) {
  if (jobManager.isCancelled(jobId)) {
    await jobSocketService.cancel(jobId)
    return // Stop immediately
  }
  // Process review...
}
```

##### cancelJob()

**Signature**:
```typescript
cancelJob(jobId: string): void
```

**Purpose**: Abort the job and remove from memory.

**Implementation**:
```typescript
cancelJob(jobId: string): void {
  const job = this.jobs.get(jobId)
  if (job) {
    job.controller.abort()
    this.jobs.delete(jobId)
    console.log(`[JobManager] Cancelled and removed job: ${jobId}`)
  }
}
```

**Flow**:
1. Get job from memory Map
2. Call `controller.abort()` to set `signal.aborted = true`
3. Delete job from Map to free memory

**Example**:
```typescript
// In API endpoint: POST /api/jobs/:jobId/cancel
jobManager.cancelJob(jobId)
await jobSocketService.cancel(jobId)
```

---

### 2.3 Socket Event Constants

**Location**: `servers/friendly/src/socket/events.ts`

#### 2.3.1 SOCKET_EVENTS

**Purpose**: Centralized event name constants.

**Implementation**:
```typescript
export const SOCKET_EVENTS = {
  // Review Crawling Events
  REVIEW_STARTED: 'review:started',
  REVIEW_CRAWL_PROGRESS: 'review:crawl_progress',
  REVIEW_DB_PROGRESS: 'review:db_progress',
  REVIEW_COMPLETED: 'review:completed',
  REVIEW_ERROR: 'review:error',
  REVIEW_CANCELLED: 'review:cancelled',

  // Review Summary Events
  REVIEW_SUMMARY_STARTED: 'review_summary:started',
  REVIEW_SUMMARY_PROGRESS: 'review_summary:progress',
  REVIEW_SUMMARY_COMPLETED: 'review_summary:completed',
  REVIEW_SUMMARY_ERROR: 'review_summary:error',

  // Restaurant Crawl Events (future)
  RESTAURANT_CRAWL_STARTED: 'restaurant_crawl:started',
  RESTAURANT_CRAWL_PROGRESS: 'restaurant_crawl:progress',
  RESTAURANT_CRAWL_COMPLETED: 'restaurant_crawl:completed',
  RESTAURANT_CRAWL_ERROR: 'restaurant_crawl:error'
} as const
```

**Benefits**:
- Single source of truth for all event names
- No typos (compile-time checking)
- Easy to add new job types

#### 2.3.2 getSocketEvent()

**Purpose**: Auto-mapping function from (JobType, JobEventType) → Event Name.

**Signature**:
```typescript
export function getSocketEvent(
  type: JobType,
  status: JobEventType
): string
```

**Parameters**:
- `type`: 'review_crawl' | 'review_summary' | 'restaurant_crawl'
- `status`: 'started' | 'progress' | 'crawl_progress' | 'db_progress' | 'completed' | 'error' | 'cancelled'

**Implementation**:
```typescript
export function getSocketEvent(type: JobType, status: JobEventType): string {
  const eventMap: Record<JobType, Record<string, string>> = {
    review_crawl: {
      started: SOCKET_EVENTS.REVIEW_STARTED,
      crawl_progress: SOCKET_EVENTS.REVIEW_CRAWL_PROGRESS,
      db_progress: SOCKET_EVENTS.REVIEW_DB_PROGRESS,
      progress: SOCKET_EVENTS.REVIEW_CRAWL_PROGRESS, // Default fallback
      completed: SOCKET_EVENTS.REVIEW_COMPLETED,
      error: SOCKET_EVENTS.REVIEW_ERROR,
      cancelled: SOCKET_EVENTS.REVIEW_CANCELLED
    },
    review_summary: {
      started: SOCKET_EVENTS.REVIEW_SUMMARY_STARTED,
      progress: SOCKET_EVENTS.REVIEW_SUMMARY_PROGRESS,
      completed: SOCKET_EVENTS.REVIEW_SUMMARY_COMPLETED,
      error: SOCKET_EVENTS.REVIEW_SUMMARY_ERROR
    },
    restaurant_crawl: {
      started: SOCKET_EVENTS.RESTAURANT_CRAWL_STARTED,
      progress: SOCKET_EVENTS.RESTAURANT_CRAWL_PROGRESS,
      completed: SOCKET_EVENTS.RESTAURANT_CRAWL_COMPLETED,
      error: SOCKET_EVENTS.RESTAURANT_CRAWL_ERROR
    }
  }

  return eventMap[type]?.[status] || `${type}:${status}`
}
```

**Examples**:
```typescript
getSocketEvent('review_crawl', 'started')
// Returns: 'review:started'

getSocketEvent('review_crawl', 'crawl_progress')
// Returns: 'review:crawl_progress'

getSocketEvent('review_summary', 'progress')
// Returns: 'review_summary:progress'

getSocketEvent('restaurant_crawl', 'completed')
// Returns: 'restaurant_crawl:completed'
```

**Benefits**:
- Automatic event name selection
- No hardcoded strings in services
- Easy to extend for new job types

#### 2.3.3 JobEventData Type

**Purpose**: Unified event data structure for all Socket events.

**Implementation**:
```typescript
export interface JobEventData {
  // Core fields
  jobId: string;
  type: JobType; // 'review_crawl' | 'review_summary' | 'restaurant_crawl'
  restaurantId: number;
  status: JobEventType; // 'started' | 'progress' | 'completed' | 'error' | 'cancelled'
  timestamp: number;

  // Progress-specific fields
  current?: number;
  total?: number;
  percentage?: number;

  // Error-specific fields
  error?: string;

  // Job-specific metadata (flexible)
  [key: string]: any;
}
```

**Field Descriptions**:
- `jobId`: Job UUID for tracking
- `type`: Job type for client-side filtering
- `restaurantId`: Restaurant ID for room-based routing
- `status`: Current job status
- `timestamp`: Event emission time (Date.now())
- `current`, `total`, `percentage`: Progress tracking (for progress events)
- `error`: Error message (for error events)
- `[key: string]: any`: Flexible metadata (placeId, url, completed, failed, etc.)

**Example (review:started)**:
```typescript
{
  jobId: 'uuid-1234',
  type: 'review_crawl',
  restaurantId: 123,
  status: 'started',
  timestamp: 1698765432123,
  placeId: 'abc123',
  url: 'https://...'
}
```

**Example (review:crawl_progress)**:
```typescript
{
  jobId: 'uuid-1234',
  type: 'review_crawl',
  restaurantId: 123,
  status: 'progress',
  timestamp: 1698765432456,
  current: 50,
  total: 100,
  percentage: 50,
  phase: 'crawl'
}
```

**Example (review_summary:completed)**:
```typescript
{
  jobId: 'uuid-5678',
  type: 'review_summary',
  restaurantId: 456,
  status: 'completed',
  timestamp: 1698765432789,
  completed: 98,
  failed: 2
}
```

---

### 2.4 Socket.io Server

**Location**: `servers/friendly/src/socket/socket.ts`

#### 2.4.1 Server Initialization

**Implementation**:
```typescript
import { Server } from 'socket.io'
import type { Server as HTTPServer } from 'http'

export function initializeSocket(httpServer: HTTPServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  })

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)

    // Subscribe to restaurant room
    socket.on('subscribe:restaurant', (restaurantId: string) => {
      socket.join(`restaurant:${restaurantId}`)
      console.log(`Socket ${socket.id} joined restaurant:${restaurantId}`)
    })

    // Unsubscribe from restaurant room
    socket.on('unsubscribe:restaurant', (restaurantId: string) => {
      socket.leave(`restaurant:${restaurantId}`)
      console.log(`Socket ${socket.id} left restaurant:${restaurantId}`)
    })

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })
  })

  return io
}
```

**CORS Configuration**:
- `origin: '*'`: Allow all origins (adjust for production)
- `methods: ['GET', 'POST']`: Allowed HTTP methods

**Socket Events (Server-side)**:
- `connection`: New client connected
- `subscribe:restaurant`: Join restaurant room
- `unsubscribe:restaurant`: Leave restaurant room
- `disconnect`: Client disconnected

#### 2.4.2 Integration with Fastify

**Location**: `servers/friendly/src/server.ts`

```typescript
import Fastify from 'fastify'
import { initializeSocket } from './socket/socket'

const app = Fastify()

// Start server
const server = await app.listen({ port: 4000, host: '0.0.0.0' })

// Initialize Socket.io
const io = initializeSocket(server.server)

// Inject Socket.io into Fastify context
app.decorate('io', io)
```

---

### 2.5 Processors

#### 2.5.1 review-crawler-processor.service.ts

**Purpose**: Review crawling with JobSocketService integration.

**Dependencies**:
- `jobSocketService`: Job + Socket management
- `jobManager`: Memory job management (for cancellation)
- `naverCrawlerService`: Puppeteer-based crawler
- `reviewRepository`: Review DB storage

**Implementation**:
```typescript
export class ReviewCrawlerProcessor {
  constructor(
    private jobSocketService: JobSocketService,
    private jobManager: JobManager,
    private naverCrawlerService: NaverCrawlerService,
    private reviewRepository: ReviewRepository
  ) {}

  async processReviewCrawl(options: {
    url: string;
    restaurantId: number;
    placeId: string;
  }): Promise<void> {
    // 1. Start job
    const jobId = await this.jobSocketService.start({
      type: 'review_crawl',
      restaurantId: options.restaurantId,
      metadata: { url: options.url, placeId: options.placeId }
    })

    // 2. Create memory job for cancellation support
    this.jobManager.createMemoryJob(jobId)

    try {
      // 3. Crawl reviews from Naver Map
      const reviews = await this.naverCrawlerService.crawlReviews(options.url)

      // 4. Update crawl progress (phase: 'crawl')
      for (let i = 0; i < reviews.length; i++) {
        // Check cancellation
        if (this.jobManager.isCancelled(jobId)) {
          await this.jobSocketService.cancel(jobId, {
            reason: 'User cancelled during crawling',
            totalReviews: reviews.length,
            processedReviews: i
          })
          return
        }

        await this.jobSocketService.progress(jobId, i + 1, reviews.length, {
          phase: 'crawl'
        })
      }

      // 5. Save to DB (phase: 'db')
      let savedCount = 0
      let duplicateCount = 0

      for (let i = 0; i < reviews.length; i++) {
        // Check cancellation
        if (this.jobManager.isCancelled(jobId)) {
          await this.jobSocketService.cancel(jobId, {
            reason: 'User cancelled during DB save',
            totalReviews: reviews.length,
            savedReviews: savedCount
          })
          return
        }

        // Upsert review (hash-based deduplication)
        const result = await this.reviewRepository.upsert({
          restaurant_id: options.restaurantId,
          ...reviews[i]
        })

        if (result.changes > 0) {
          savedCount++
        } else {
          duplicateCount++
        }

        await this.jobSocketService.progress(jobId, i + 1, reviews.length, {
          phase: 'db'
        })
      }

      // 6. Complete job
      await this.jobSocketService.complete(jobId, {
        totalReviews: reviews.length,
        savedToDb: savedCount,
        duplicates: duplicateCount
      })

    } catch (error) {
      // 7. Error handling
      await this.jobSocketService.error(jobId, error.message, {
        stack: error.stack
      })
    }
  }
}
```

**Key Points**:
- Two-phase progress tracking: `crawl` → `db`
- Cancellation checks in both phases
- Hash-based deduplication in `reviewRepository.upsert()`
- Automatic Socket event emission via `jobSocketService`

#### 2.5.2 review-summary-processor.service.ts

**Purpose**: AI-based review summarization with JobSocketService integration.

**Dependencies**:
- `jobSocketService`: Job + Socket management
- `reviewSummaryService`: AI summarization (local or cloud)
- `reviewRepository`: Review fetching
- `reviewSummaryRepository`: Summary storage

**Implementation**:
```typescript
export class ReviewSummaryProcessor {
  constructor(
    private jobSocketService: JobSocketService,
    private reviewSummaryService: ReviewSummaryService,
    private reviewRepository: ReviewRepository,
    private reviewSummaryRepository: ReviewSummaryRepository
  ) {}

  async processReviewSummary(restaurantId: number): Promise<void> {
    // 1. Start job
    const jobId = await this.jobSocketService.start({
      type: 'review_summary',
      restaurantId
    })

    try {
      // 2. Fetch all reviews for restaurant
      const reviews = await this.reviewRepository.findByRestaurantId(restaurantId)

      if (reviews.length === 0) {
        await this.jobSocketService.error(jobId, 'No reviews found for summarization')
        return
      }

      // 3. Process reviews in batches
      const batchSize = 10
      const batches = Math.ceil(reviews.length / batchSize)

      let completed = 0
      let failed = 0
      const summaries: string[] = []

      for (let batchIdx = 0; batchIdx < batches; batchIdx++) {
        const start = batchIdx * batchSize
        const end = Math.min(start + batchSize, reviews.length)
        const batch = reviews.slice(start, end)

        for (const review of batch) {
          try {
            // Summarize single review
            const summary = await this.reviewSummaryService.summarize(review.review_text)
            summaries.push(summary)
            completed++
          } catch (error) {
            failed++
          }

          // Update progress
          const current = start + batch.indexOf(review) + 1
          await this.jobSocketService.progress(jobId, current, reviews.length, {
            completed,
            failed
          })
        }
      }

      // 4. Store aggregated summary
      const aggregatedSummary = summaries.join('\n\n')
      await this.reviewSummaryRepository.upsert({
        restaurant_id: restaurantId,
        summary: aggregatedSummary
      })

      // 5. Complete job
      await this.jobSocketService.complete(jobId, {
        totalReviews: reviews.length,
        completed,
        failed
      })

    } catch (error) {
      // 6. Error handling
      await this.jobSocketService.error(jobId, error.message, {
        stack: error.stack
      })
    }
  }
}
```

**Key Points**:
- Batch processing (10 reviews per batch)
- Progress tracking with `completed` and `failed` counts
- Aggregated summary storage
- No cancellation support (fast processing)

---

## 3. Unified Job Lifecycle

### 3.1 Flow Diagram

```
┌─────────┐
│  START  │ → Create job in DB
└────┬────┘   Emit Socket: {type}:started
     │
     ▼
┌──────────┐
│ PROGRESS │ → Update job in DB (progress_current, progress_total, %)
└────┬─────┘   Emit Socket: {type}:progress (or crawl_progress, db_progress)
     │
     ▼
┌─────────────┬─────────┬──────────┐
│  COMPLETE   │  ERROR  │  CANCEL  │ → Update status in DB
└─────────────┴─────────┴──────────┘   Emit Socket: {type}:completed/error/cancelled
     │             │           │
     ▼             ▼           ▼
    DB           DB          DB
     │             │           │
     ▼             ▼           ▼
  Socket       Socket      Socket
```

### 3.2 Lifecycle Example (Review Crawl)

```typescript
// ===== Phase 1: START =====
const jobId = await jobSocketService.start({
  type: 'review_crawl',
  restaurantId: 123,
  metadata: { placeId: 'abc123', url: 'https://map.naver.com/...' }
})
// → DB: INSERT INTO jobs (id='uuid-...', type='review_crawl', status='active', ...)
// → Socket: Emit 'review:started' to room 'restaurant:123'

// Create memory job for cancellation
jobManager.createMemoryJob(jobId)

// ===== Phase 2: PROGRESS (Crawling) =====
for (let i = 0; i < reviews.length; i++) {
  if (jobManager.isCancelled(jobId)) {
    await jobSocketService.cancel(jobId, { reason: 'User cancelled' })
    return
  }

  await jobSocketService.progress(jobId, i + 1, reviews.length, { phase: 'crawl' })
  // → DB: UPDATE jobs SET progress_current=i+1, progress_total=100, progress_percentage=...
  // → Socket: Emit 'review:crawl_progress' with { current, total, percentage }
}

// ===== Phase 3: PROGRESS (DB Saving) =====
for (let i = 0; i < reviews.length; i++) {
  if (jobManager.isCancelled(jobId)) {
    await jobSocketService.cancel(jobId, { reason: 'User cancelled' })
    return
  }

  await reviewRepository.upsert(reviews[i])
  await jobSocketService.progress(jobId, i + 1, reviews.length, { phase: 'db' })
  // → DB: UPDATE jobs SET progress_current=i+1, ...
  // → Socket: Emit 'review:db_progress'
}

// ===== Phase 4: COMPLETE =====
await jobSocketService.complete(jobId, {
  totalReviews: 100,
  savedToDb: 95,
  duplicates: 5
})
// → DB: UPDATE jobs SET status='completed', result='{"totalReviews":100,...}', completed_at=now()
// → Socket: Emit 'review:completed'

// OR if error occurs:
await jobSocketService.error(jobId, 'Network timeout')
// → DB: UPDATE jobs SET status='failed', error_message='Network timeout', completed_at=now()
// → Socket: Emit 'review:error'

// OR if user cancels:
await jobSocketService.cancel(jobId, { reason: 'User cancelled' })
// → DB: UPDATE jobs SET status='cancelled', completed_at=now()
// → Socket: Emit 'review:cancelled'
```

### 3.3 Lifecycle Example (Review Summary)

```typescript
// ===== Phase 1: START =====
const jobId = await jobSocketService.start({
  type: 'review_summary',
  restaurantId: 456
})
// → DB: INSERT INTO jobs (type='review_summary', status='active', ...)
// → Socket: Emit 'review_summary:started' to room 'restaurant:456'

// ===== Phase 2: PROGRESS (AI Processing) =====
let completed = 0
let failed = 0

for (let i = 0; i < reviews.length; i++) {
  try {
    const summary = await reviewSummaryService.summarize(reviews[i].review_text)
    completed++
  } catch (error) {
    failed++
  }

  await jobSocketService.progress(jobId, i + 1, reviews.length, { completed, failed })
  // → DB: UPDATE jobs SET progress_current=i+1, ...
  // → Socket: Emit 'review_summary:progress' with { completed, failed }
}

// ===== Phase 3: COMPLETE =====
await jobSocketService.complete(jobId, { completed, failed })
// → DB: UPDATE jobs SET status='completed', result='{"completed":98,"failed":2}'
// → Socket: Emit 'review_summary:completed'
```

---

## 4. Socket.io Room Strategy

### 4.1 Restaurant ID-based Rooms

**Room Naming Convention**:
```
restaurant:${restaurantId}
```

**Examples**:
- `restaurant:123`
- `restaurant:456`

### 4.2 Multi-user Collaboration

**Scenario**: Three users (A, B, C) viewing Restaurant #123.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Socket.io Room: restaurant:123                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────┐         ┌─────────┐         ┌─────────┐          │
│   │ User A  │         │ User B  │         │ User C  │          │
│   │ (Web)   │         │ (Mobile)│         │ (Web)   │          │
│   └────┬────┘         └────┬────┘         └────┬────┘          │
│        │                   │                   │                │
│        │ subscribe         │ subscribe         │ subscribe      │
│        ├───────────────────┼───────────────────┤                │
│        │                   │                   │                │
│        │                   │          Starts Crawl              │
│        │                   │                   │                │
│        │                   │                   │ POST /crawler  │
│        │                   │                   └────────┐       │
│        │                   │                            │       │
│   ┌────▼───────────────────▼───────────────────▼────────▼────┐ │
│   │          Server: JobSocketService.start()              │ │
│   │          Emit: review:started → room 'restaurant:123'  │ │
│   └────┬───────────────────┬───────────────────┬────────┬────┘ │
│        │                   │                   │        │       │
│        ▼                   ▼                   ▼        ▼       │
│   "Crawl started"     "Crawl started"    "Crawl started"       │
│        │                   │                   │                │
│        ▼                   ▼                   ▼                │
│   Progress: 50/100    Progress: 50/100   Progress: 50/100      │
│        │                   │                   │                │
│        ▼                   ▼                   ▼                │
│   "Completed!"        "Completed!"        "Completed!"          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

> **IMPORTANT**: 모든 사용자가 동일한 restaurant room에 있으면, 누가 크롤링을 시작하든 상관없이 **모든 사용자가 동일한 실시간 업데이트를 받습니다**. 이는 중복 작업을 방지하고 협업을 가능하게 합니다.

1. **User A opens restaurant**:
   - Client emits `subscribe:restaurant('123')`
   - Server joins socket to room `restaurant:123`

2. **User B opens same restaurant**:
   - Client emits `subscribe:restaurant('123')`
   - Server joins socket to room `restaurant:123`

3. **User C starts review crawling**:
   - API call: `POST /api/crawler/reviews`
   - Server: `jobSocketService.start()` emits `review:started` to room `restaurant:123`
   - **All users (A, B, C) receive the event** and see "Crawling started..."

4. **Progress updates**:
   - Server: `jobSocketService.progress()` emits `review:crawl_progress`
   - **All users see real-time progress**: "50/100 (50%)"

5. **Completion**:
   - Server: `jobSocketService.complete()` emits `review:completed`
   - **All users see completion**: "Crawling completed! 95 reviews saved."

**Benefits**:
- **Multi-user sync**: All users see identical progress
- **Prevents duplicate work**: User A can see User C already started crawling
- **Collaborative viewing**: Users can discuss while watching progress

### 4.3 Subscription Flow

**Server-side**:
```typescript
// socket/socket.ts
io.on('connection', (socket) => {
  socket.on('subscribe:restaurant', (restaurantId: string) => {
    socket.join(`restaurant:${restaurantId}`)
    console.log(`Socket ${socket.id} joined restaurant:${restaurantId}`)
  })

  socket.on('unsubscribe:restaurant', (restaurantId: string) => {
    socket.leave(`restaurant:${restaurantId}`)
    console.log(`Socket ${socket.id} left restaurant:${restaurantId}`)
  })
})
```

**Client-side** (from `apps/shared/contexts/SocketContext.tsx`):
```typescript
const joinRestaurantRoom = (restaurantId: string) => {
  if (socket && isConnected) {
    socket.emit('subscribe:restaurant', restaurantId)
    console.log(`[SocketContext] Joined restaurant:${restaurantId}`)
  }
}

const leaveRestaurantRoom = (restaurantId: string) => {
  if (socket && isConnected) {
    socket.emit('unsubscribe:restaurant', restaurantId)
    console.log(`[SocketContext] Left restaurant:${restaurantId}`)
  }
}

// Auto-subscribe when restaurant is selected
useEffect(() => {
  if (restaurantId) {
    joinRestaurantRoom(restaurantId)
    return () => leaveRestaurantRoom(restaurantId)
  }
}, [restaurantId])
```

**Event Emission**:
```typescript
// jobSocketService.start()
this.io.to(`restaurant:${restaurantId}`).emit('review:started', eventData)
// → Emits ONLY to room 'restaurant:${restaurantId}'
// → All sockets in that room receive the event
```

### 4.4 Job Interruption Detection

**Location**: `servers/friendly/src/socket/socket.ts`

#### 4.4.1 Subscribe Event with State Synchronization

When a client subscribes to a restaurant room, the server sends the current state including interrupted jobs.

**Implementation**:
```typescript
socket.on('subscribe:restaurant', async (restaurantId: string) => {
  await socket.join(`restaurant:${restaurantId}`)

  // Fetch active jobs from DB
  const dbActiveJobs = await jobRepository.findActiveByRestaurant(parseInt(restaurantId))

  const activeEventNames: string[] = []
  const interruptedJobs: any[] = []

  // Check each DB job against memory
  for (const job of dbActiveJobs) {
    const memoryJob = jobManager.getJob(job.id)

    if (memoryJob) {
      // Job exists in memory → actively running
      // Send current progress...
      activeEventNames.push(job.event_name)
    } else {
      // Job NOT in memory but DB shows 'active' → server restarted
      interruptedJobs.push(job)

      // Send interruption event
      const interruptEvent = getInterruptEventName(job.type)
      socket.emit(interruptEvent, {
        jobId: job.id,
        type: job.type,
        restaurantId: job.restaurant_id,
        status: 'interrupted',
        reason: 'Server restarted',
        timestamp: Date.now()
      })
    }
  }

  // Send current state summary
  socket.emit('restaurant:current_state', {
    restaurantId: parseInt(restaurantId),
    activeEventNames,
    interruptedCount: interruptedJobs.length,  // ← Number of interrupted jobs
    hasActiveJobs: activeEventNames.length > 0,
    timestamp: Date.now()
  })
})
```

**Key Points**:
- **Memory-DB Sync Check**: Compare `jobManager.getJob(jobId)` with DB active jobs
- **Interruption Detection**: If DB shows 'active' but memory doesn't have the job → server was restarted
- **DB State Preserved**: DB status stays 'active' so subsequent clients also detect interruption
- **Dual Notification**: Sends both individual `{type}:interrupted` events AND `restaurant:current_state` with `interruptedCount`

#### 4.4.2 Interruption Events

**Event Names**:
- `review:interrupted` - Review crawl interrupted
- `review_summary:interrupted` - Review summary interrupted
- `restaurant_crawl:interrupted` - Restaurant crawl interrupted

**Payload**:
```typescript
{
  jobId: string;
  type: JobType;
  restaurantId: number;
  status: 'interrupted';
  reason: string;  // e.g., "Server restarted"
  timestamp: number;
}
```

**Helper Function**:
```typescript
export function getInterruptEventName(type: JobType): string {
  const eventMap: Record<JobType, string> = {
    review_crawl: SOCKET_EVENTS.REVIEW_INTERRUPTED,
    review_summary: SOCKET_EVENTS.REVIEW_SUMMARY_INTERRUPTED,
    restaurant_crawl: SOCKET_EVENTS.RESTAURANT_CRAWL_INTERRUPTED
  };
  return eventMap[type] || `${type}:interrupted`;
}
```

#### 4.4.3 Benefits

1. **Persistent Detection**: Every client that subscribes sees the interruption state
2. **No Phantom Jobs**: Users know that a job was interrupted and needs retry
3. **No DB Updates**: DB state remains 'active' for detection by all clients
4. **Automatic Cleanup**: When user retries, existing logic in `jobService.start()` cleans up old jobs

---

## 5. Socket Event Types

### 5.1 Review Crawling Events

#### 5.1.1 review:started

**Emitted When**: Job created in DB and crawling starts.

**Payload**:
```typescript
{
  jobId: string;
  type: 'review_crawl';
  restaurantId: number;
  status: 'started';
  timestamp: number;
  placeId: string;
  url: string;
}
```

**Client Handling**:
```typescript
socket.on('review:started', (data) => {
  setReviewCrawlStatus({ status: 'active', error: null })
  console.log('Review crawl started:', data.jobId)
})
```

#### 5.1.2 review:crawl_progress

**Emitted When**: Web crawling in progress (Puppeteer scraping).

**Payload**:
```typescript
{
  jobId: string;
  type: 'review_crawl';
  restaurantId: number;
  status: 'progress';
  timestamp: number;
  current: number;
  total: number;
  percentage: number;
  phase: 'crawl';
}
```

**Client Handling**:
```typescript
socket.on('review:crawl_progress', (data) => {
  setCrawlProgress({
    current: data.current,
    total: data.total,
    percentage: data.percentage
  })
})
```

#### 5.1.3 review:db_progress

**Emitted When**: DB saving in progress (UPSERT operations).

**Payload**:
```typescript
{
  jobId: string;
  type: 'review_crawl';
  restaurantId: number;
  status: 'progress';
  timestamp: number;
  current: number;
  total: number;
  percentage: number;
  phase: 'db';
}
```

**Client Handling**:
```typescript
socket.on('review:db_progress', (data) => {
  setDbProgress({
    current: data.current,
    total: data.total,
    percentage: data.percentage
  })
})
```

#### 5.1.4 review:completed

**Emitted When**: Job finished successfully.

**Payload**:
```typescript
{
  jobId: string;
  type: 'review_crawl';
  restaurantId: number;
  status: 'completed';
  timestamp: number;
  totalReviews: number;
  savedToDb: number;
  duplicates: number;
}
```

**Client Handling**:
```typescript
socket.on('review:completed', (data) => {
  setReviewCrawlStatus({ status: 'completed', error: null })
  Alert.success('Success', `${data.savedToDb} reviews saved!`)
})
```

#### 5.1.5 review:error

**Emitted When**: Job failed.

**Payload**:
```typescript
{
  jobId: string;
  type: 'review_crawl';
  restaurantId: number;
  status: 'error';
  timestamp: number;
  error: string;
}
```

**Client Handling**:
```typescript
socket.on('review:error', (data) => {
  setReviewCrawlStatus({ status: 'failed', error: data.error })
  Alert.error('Error', data.error)
})
```

#### 5.1.6 review:cancelled

**Emitted When**: Job cancelled by user (review_crawl only).

**Payload**:
```typescript
{
  jobId: string;
  type: 'review_crawl';
  restaurantId: number;
  status: 'cancelled';
  timestamp: number;
  reason: string;
}
```

**Client Handling**:
```typescript
socket.on('review:cancelled', (data) => {
  setReviewCrawlStatus({ status: 'idle', error: null })
  Alert.show('Cancelled', 'Review crawl cancelled')
})
```

---

### 5.2 Review Summary Events

#### 5.2.1 review_summary:started

**Emitted When**: Summary job created.

**Payload**:
```typescript
{
  jobId: string;
  type: 'review_summary';
  restaurantId: number;
  status: 'started';
  timestamp: number;
}
```

**Client Handling**:
```typescript
socket.on('review_summary:started', (data) => {
  setReviewSummaryStatus({ status: 'active', error: null })
})
```

#### 5.2.2 review_summary:progress

**Emitted When**: AI processing in progress.

**Payload**:
```typescript
{
  jobId: string;
  type: 'review_summary';
  restaurantId: number;
  status: 'progress';
  timestamp: number;
  current: number;
  total: number;
  percentage: number;
  completed: number;
  failed: number;
}
```

**Client Handling**:
```typescript
socket.on('review_summary:progress', (data) => {
  setSummaryProgress({
    current: data.current,
    total: data.total,
    percentage: data.percentage,
    completed: data.completed,
    failed: data.failed
  })
})
```

#### 5.2.3 review_summary:completed

**Emitted When**: Summary job finished.

**Payload**:
```typescript
{
  jobId: string;
  type: 'review_summary';
  restaurantId: number;
  status: 'completed';
  timestamp: number;
  completed: number;
  failed: number;
}
```

**Client Handling**:
```typescript
socket.on('review_summary:completed', (data) => {
  setReviewSummaryStatus({ status: 'completed', error: null })
  Alert.success('Success', `Summary generated! ${data.completed} reviews processed.`)
})
```

#### 5.2.4 review_summary:error

**Emitted When**: Summary job failed.

**Payload**:
```typescript
{
  jobId: string;
  type: 'review_summary';
  restaurantId: number;
  status: 'error';
  timestamp: number;
  error: string;
}
```

**Client Handling**:
```typescript
socket.on('review_summary:error', (data) => {
  setReviewSummaryStatus({ status: 'failed', error: data.error })
  Alert.error('Error', data.error)
})
```

---

### 5.3 Unified Event Data Structure

All events use the `JobEventData` interface:

```typescript
interface JobEventData {
  jobId: string;
  type: JobType;
  restaurantId: number;
  status: JobEventType;
  timestamp: number;
  current?: number;
  total?: number;
  percentage?: number;
  error?: string;
  [key: string]: any;
}
```

**Benefits**:
- Type safety across all events
- Consistent payload structure
- Easy to extend with custom metadata

---

## 6. Global Job Detection

### 6.1 Problem Statement

**Challenge**: Room-based Socket events require subscription. Clients only subscribed to specific restaurant rooms won't receive events from other restaurants.

**Example**:
```
Client subscribed to: restaurant:123
New job starts on: restaurant:456
Result: Client never receives progress events ❌
```

This creates a visibility problem for monitoring screens that need to track **all jobs across all restaurants**.

### 6.2 Solution: Two-Phase Detection

#### 6.2.1 Phase 1: Global Broadcast

When a new job starts, emit a **global event** to all connected clients:

```typescript
// In JobSocketService.start()
async start(params: {
  jobId?: string;
  type?: JobType;
  restaurantId: number;
  metadata?: Record<string, any>;
}): Promise<string> {
  const type = params.type || 'restaurant_crawl';
  const jobId = params.jobId || uuidv4();
  
  // ... create job in memory and DB ...
  
  // 4. Emit room-based started event
  this.emitSocketEvent(type, params.restaurantId, 'started', eventData);
  
  // 5. ✅ NEW: Emit global job:new event
  const io = getSocketIO();
  io.emit('job:new', {
    jobId,
    type,
    restaurantId: params.restaurantId,
    timestamp: Date.now()
  });
  
  console.log(`[JobService] Global notification sent: New job ${jobId} (restaurant ${params.restaurantId})`);
  
  return jobId;
}
```

**Key Points**:
- `io.emit('job:new', ...)` sends to **all connected clients**
- Contains minimal info: jobId, type, restaurantId, timestamp
- Does NOT include full job details (sent via room events)

#### 6.2.2 Phase 2: Auto-Subscribe

Clients receive `job:new` and auto-subscribe to the restaurant room:

```typescript
// In JobMonitor.tsx
newSocket.on('job:new', (data: {
  jobId: string;
  type: string;
  restaurantId: number;
  timestamp: number;
}) => {
  console.log('[JobMonitor] New job started:', data);
  
  // Check if already subscribed
  setSubscribedRooms(prev => {
    if (prev.has(data.restaurantId)) {
      console.log(`[JobMonitor] Already subscribed: restaurant:${data.restaurantId}`);
      return prev;
    }
    
    // ✅ Auto-subscribe to new restaurant room
    socket.emit('subscribe:restaurant', data.restaurantId);
    console.log(`[JobMonitor] Subscribed to new restaurant room: ${data.restaurantId}`);
    
    const newSet = new Set(prev);
    newSet.add(data.restaurantId);
    return newSet;
  });
});
```

**Benefits**:
- ✅ Clients discover new jobs instantly
- ✅ Auto-subscribe to receive progress events
- ✅ No polling required
- ✅ No manual subscription management

### 6.3 Event Flow Example

```
1. Server: New job starts (restaurant:456)
   └─ io.to('restaurant:456').emit('review:started', {...})  [Room event]
   └─ io.emit('job:new', {jobId, type, restaurantId: 456})  [Global event]

2. Client A (subscribed to restaurant:123)
   ├─ Receives: job:new (global) ✅
   ├─ Action: socket.emit('subscribe:restaurant', 456)
   └─ Now receives: review:crawl_progress, review:completed, etc. ✅

3. Client B (subscribed to restaurant:456)
   ├─ Receives: review:started (room) ✅
   ├─ Receives: job:new (global) ✅
   └─ Action: Already subscribed, no-op ✅
```

### 6.4 Defensive Job Creation

Even with `job:new`, network issues can cause missed events. Progress handlers defensively create jobs:

```typescript
newSocket.on('review:crawl_progress', (data: any) => {
  setJobs(prev => {
    const existingJob = prev.find(job => job.jobId === data.jobId);
    
    // ✅ Create job if missing (missed job:new)
    if (!existingJob) {
      console.log('[JobMonitor] Creating job from progress event:', data.jobId);
      return [createJobFromProgress(data, 'review_crawl', { phase: 'crawl' }), ...prev];
    }
    
    // Update existing job
    return prev.map(job =>
      job.jobId === data.jobId ? { ...job, /* update */ } : job
    );
  });
});
```

**Why defensive creation?**
- Network issues (reconnections, packet loss)
- Race conditions (progress event before job:new)
- Resilience (works even if job:new is never sent)

### 6.5 Implementation Checklist

#### Backend (JobSocketService)
- [x] Emit `job:new` in `start()` method
- [x] Use `io.emit()` for global broadcast
- [x] Include minimal data (jobId, type, restaurantId, timestamp)
- [x] Keep room-based events unchanged

#### Frontend (JobMonitor)
- [x] Add `job:new` event handler
- [x] Track subscribed rooms in Set
- [x] Auto-subscribe to new restaurant rooms
- [x] Defensive job creation in progress handlers
- [x] Sequence tracking per job
- [x] Auto-completion on 100% progress

### 6.6 Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| Job Discovery | Manual subscription | Auto-discovery via job:new |
| Visibility | Only subscribed restaurants | All restaurants |
| Polling | HTTP polling needed | Zero polling (100% Socket) |
| Latency | Polling interval (1-5s) | Real-time (<100ms) |
| Server Load | High (polling requests) | Minimal (Socket events) |
| Resilience | Missed events = lost jobs | Defensive creation = recovery |

---

## 7. Job Cancellation System

### 6.1 Overview

**Supported Jobs**: `review_crawl` only

**Why Only review_crawl?**:
- Long-running (1-2 minutes for 100+ reviews)
- Interruptible (can stop mid-crawl or mid-DB-save)
- Other jobs are fast or non-interruptible

**Mechanism**: `AbortController` + Memory Job

#### 6.1.1 Cancellation Flow Diagram

```
User clicks        API Endpoint         JobManager           Processor Loop
"Cancel"          /jobs/:id/cancel     (Memory)            (review-crawler)
   │                    │                   │                      │
   │  POST /cancel      │                   │                      │
   ├───────────────────>│                   │                      │
   │                    │ cancelJob(jobId)  │                      │
   │                    ├──────────────────>│                      │
   │                    │                   │ controller.abort()   │
   │                    │                   │ signal.aborted=true  │
   │                    │                   │                      │
   │                    │ jobService.cancel()                      │
   │                    ├────────────────────────────────────────> │
   │                    │                   │                      │
   │                    │                   │  isCancelled(jobId)? │
   │                    │                   │ <────────────────────┤
   │                    │                   │      true            │
   │                    │                   │ ─────────────────────>
   │                    │                   │                      │
   │                    │                   │           STOP LOOP  │
   │                    │                   │                      ├─┐
   │                    │                   │                      │ │
   │                    │                   │      Update DB       │ │ Cleanup
   │                    │                   │      Emit Socket     │ │
   │                    │                   │      Return          │ │
   │                    │                   │                      │<┘
   │                    │                   │                      │
   │   200 OK           │                   │                      │
   │<───────────────────┤                   │                      │
   │                    │                   │                      │
   │  Socket Event:     │                   │                      │
   │  review:cancelled  │                   │                      │
   │<──────────────────────────────────────────────────────────────┤
```

> **IMPORTANT**: Cancellation은 **즉시 중단이 아닌 다음 루프 iteration에서 확인**합니다. 현재 처리 중인 리뷰는 완료된 후 중단되므로, 최대 1개 리뷰만큼의 지연이 발생할 수 있습니다.

### 6.2 Implementation

#### 6.2.1 Create Memory Job with AbortController

```typescript
// In review-crawler-processor.service.ts
const jobId = await jobSocketService.start({
  type: 'review_crawl',
  restaurantId: 123,
  metadata: { ... }
})

// Create memory job
jobManager.createMemoryJob(jobId)
// → Creates AbortController and stores in memory Map
```

#### 6.2.2 Check Cancellation in Processing Loops

```typescript
// Crawling phase
for (let i = 0; i < reviews.length; i++) {
  if (jobManager.isCancelled(jobId)) {
    await jobSocketService.cancel(jobId, {
      reason: 'User cancelled during crawling',
      totalReviews: reviews.length,
      processedReviews: i
    })
    return // Stop immediately
  }

  await jobSocketService.progress(jobId, i + 1, reviews.length, { phase: 'crawl' })
}

// DB saving phase
for (let i = 0; i < reviews.length; i++) {
  if (jobManager.isCancelled(jobId)) {
    await jobSocketService.cancel(jobId, {
      reason: 'User cancelled during DB save',
      savedReviews: i
    })
    return
  }

  await reviewRepository.upsert(reviews[i])
  await jobSocketService.progress(jobId, i + 1, reviews.length, { phase: 'db' })
}
```

#### 6.2.3 Cancel from API Endpoint

**Route**: `POST /api/jobs/:jobId/cancel`

```typescript
// job.routes.ts
app.post('/api/jobs/:jobId/cancel', async (request, reply) => {
  const { jobId } = request.params

  // 1. Abort the job (sets signal.aborted = true)
  jobManager.cancelJob(jobId)

  // 2. Update DB and emit Socket event
  await jobSocketService.cancel(jobId, { reason: 'User cancelled' })

  return ResponseHelper.success('Job cancelled', null)
})
```

### 6.3 Cancellation Flow

```
┌──────────────────┐
│ User Clicks      │
│ "Cancel" Button  │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────┐
│ API: POST /jobs/:id/    │
│       cancel            │
└────────┬────────────────┘
         │
         ▼
┌──────────────────────────┐
│ jobManager.cancelJob()   │
│ (AbortController.abort())│
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Processor checks         │
│ jobManager.isCancelled() │
│ in loop                  │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ jobSocketService.cancel()│
│ - Update DB              │
│ - Emit Socket event      │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Client receives          │
│ 'review:cancelled' event │
│ - Update UI status       │
└──────────────────────────┘
```

### 6.4 Example: Full Cancellation Scenario

**Step 1: User starts review crawling**
```typescript
// Client: Click "Crawl Reviews" button
POST /api/crawler/reviews { url, restaurantId }

// Server: Start job
const jobId = await jobSocketService.start({ type: 'review_crawl', restaurantId })
jobManager.createMemoryJob(jobId)

// Server: Begin crawling
for (let i = 0; i < 100; i++) {
  // Currently at i = 45 (45% progress)
  await jobSocketService.progress(jobId, i + 1, 100, { phase: 'crawl' })
}
```

**Step 2: User cancels mid-crawl**
```typescript
// Client: Click "Cancel" button
POST /api/jobs/${jobId}/cancel

// Server: Abort the job
jobManager.cancelJob(jobId)
// → Sets controller.signal.aborted = true

// Server: Next loop iteration detects cancellation
if (jobManager.isCancelled(jobId)) {
  await jobSocketService.cancel(jobId, {
    reason: 'User cancelled',
    totalReviews: 100,
    processedReviews: 45
  })
  return // Stop immediately
}
```

**Step 3: Client receives cancellation event**
```typescript
// Client: SocketContext receives event
socket.on('review:cancelled', (data) => {
  setReviewCrawlStatus({ status: 'idle', error: null })
  Alert.show('Cancelled', `Crawling cancelled at ${data.processedReviews}/100`)
})
```

---

## 7. 90% Parameter Reduction

### 7.1 Before: Options Objects Everywhere

**Old Pattern** (hypothetical):
```typescript
// Many parameters required for every call
await jobService.progress(jobId, current, total, {
  type: 'review_crawl',      // Redundant (already in DB)
  restaurantId: 123,         // Redundant (already in DB)
  phase: 'crawl'             // Metadata
})

await jobService.complete(jobId, {
  type: 'review_crawl',      // Redundant
  restaurantId: 123,         // Redundant
  totalReviews: 100
})

await jobService.error(jobId, errorMessage, {
  type: 'review_crawl',      // Redundant
  restaurantId: 123          // Redundant
})
```

**Problems**:
- Redundant parameters (type, restaurantId already in DB)
- Parameter mismatch bugs (pass wrong restaurantId)
- Verbose code (lots of repetition)

### 7.2 After: Automatic DB Lookup

**New Pattern**:
```typescript
// Minimal parameters - type and restaurantId auto-fetched from DB
await jobService.progress(jobId, current, total, { phase: 'crawl' })
await jobService.complete(jobId, { totalReviews: 100 })
await jobService.error(jobId, errorMessage)
```

**How It Works**:
```typescript
async progress(jobId: string, current: number, total: number, metadata?: any) {
  // Auto-fetch job from DB
  const job = await this.jobRepository.findById(jobId)
  if (!job) throw new Error('Job not found')

  // Use fetched type and restaurantId
  const eventName = getSocketEvent(job.type, 'progress')
  this.io.to(`restaurant:${job.restaurant_id}`).emit(eventName, {
    jobId,
    type: job.type,              // From DB
    restaurantId: job.restaurant_id, // From DB
    current,
    total,
    percentage: Math.round((current / total) * 100),
    ...metadata
  })
}
```

### 7.3 Benefits

#### 7.3.1 Less Code to Write
```typescript
// Old: 50 characters
await jobService.progress(jobId, 50, 100, { type: 'review_crawl', restaurantId: 123, phase: 'crawl' })

// New: 30 characters (40% reduction)
await jobService.progress(jobId, 50, 100, { phase: 'crawl' })
```

#### 7.3.2 Fewer Bugs
- No parameter mismatch (e.g., pass wrong restaurantId)
- Single source of truth (DB)
- Type safety via TypeScript

#### 7.3.3 Easier Maintenance
- Change type or restaurantId in one place (DB)
- No need to update every `progress()`, `complete()`, `error()` call

---

## 8. Key Implementation Details

### 8.1 Automatic DB Lookup

**Implementation in JobSocketService**:
```typescript
async progress(jobId: string, current: number, total: number, metadata?: any) {
  // Step 1: Auto-fetch job from DB
  const job = await this.jobRepository.findById(jobId)
  if (!job) throw new Error('Job not found')

  // Step 2: Use fetched data
  const eventName = getSocketEvent(job.type, 'progress')
  this.io.to(`restaurant:${job.restaurant_id}`).emit(eventName, {
    type: job.type,             // Auto-fetched
    restaurantId: job.restaurant_id, // Auto-fetched
    ...
  })
}
```

**Benefits**:
- No manual passing of type and restaurantId
- Always consistent (DB is source of truth)

### 8.2 Socket Auto-Mapping

**getSocketEvent() Function**:
```typescript
getSocketEvent('review_crawl', 'started')       // → 'review:started'
getSocketEvent('review_crawl', 'crawl_progress') // → 'review:crawl_progress'
getSocketEvent('review_summary', 'progress')    // → 'review_summary:progress'
getSocketEvent('restaurant_crawl', 'error')     // → 'restaurant_crawl:error'
```

**No Hardcoded Event Names**:
```typescript
// ❌ Bad: Hardcoded event name
this.io.to(`restaurant:${restaurantId}`).emit('review:started', data)

// ✅ Good: Auto-mapped event name
const eventName = getSocketEvent(type, 'started')
this.io.to(`restaurant:${restaurantId}`).emit(eventName, data)
```

**Easy to Add New Job Types**:
```typescript
// socket/events.ts - Add new job type
export const SOCKET_EVENTS = {
  // ... existing events ...

  // New job type: menu_crawl
  MENU_CRAWL_STARTED: 'menu_crawl:started',
  MENU_CRAWL_PROGRESS: 'menu_crawl:progress',
  MENU_CRAWL_COMPLETED: 'menu_crawl:completed',
  MENU_CRAWL_ERROR: 'menu_crawl:error'
}

// Update getSocketEvent() mapping
export function getSocketEvent(type: JobType, status: JobEventType): string {
  const eventMap = {
    // ... existing mappings ...
    menu_crawl: {
      started: SOCKET_EVENTS.MENU_CRAWL_STARTED,
      progress: SOCKET_EVENTS.MENU_CRAWL_PROGRESS,
      completed: SOCKET_EVENTS.MENU_CRAWL_COMPLETED,
      error: SOCKET_EVENTS.MENU_CRAWL_ERROR
    }
  }
  return eventMap[type]?.[status] || `${type}:${status}`
}

// No changes needed in JobSocketService! 🎉
```

### 8.3 Single Source of Truth

**Event Definitions** (`socket/events.ts`):
- All event names defined in one file
- No duplication across services
- Easy to refactor (change in one place)

**Type System** (`socket/events.ts` + `types/db.types.ts`):
- `JobType`: 'review_crawl' | 'review_summary' | 'restaurant_crawl'
- `JobEventType`: 'started' | 'progress' | 'completed' | 'error' | 'cancelled'
- `JobEventData`: Unified event payload structure

### 8.4 Type Safety

**TypeScript Validation**:
```typescript
// Compile-time error if wrong type
await jobService.start({
  type: 'invalid_type', // ❌ Error: Type '"invalid_type"' is not assignable to type 'JobType'
  restaurantId: 123
})

// Compile-time error if missing required field
await jobService.start({
  type: 'review_crawl'
  // ❌ Error: Property 'restaurantId' is missing
})
```

**Runtime Validation** (TypeBox in API routes):
```typescript
// job.routes.ts
app.post('/api/jobs/start', {
  schema: {
    body: Type.Object({
      type: Type.Union([
        Type.Literal('review_crawl'),
        Type.Literal('review_summary'),
        Type.Literal('restaurant_crawl')
      ]),
      restaurantId: Type.Number(),
      metadata: Type.Optional(Type.Any())
    })
  }
}, async (request, reply) => {
  const { type, restaurantId, metadata } = request.body
  const jobId = await jobSocketService.start({ type, restaurantId, metadata })
  return ResponseHelper.success('Job started', { jobId })
})
```

### 8.5 Multi-user Sync

**Scenario**: 3 users viewing Restaurant #123

**User A** starts crawling:
```typescript
POST /api/crawler/reviews { restaurantId: 123 }
// → jobService.start() emits 'review:started' to room 'restaurant:123'
```

**All 3 users** receive the event:
```typescript
// User A, B, C all receive:
socket.on('review:started', (data) => {
  setReviewCrawlStatus({ status: 'active' })
})
```

**Progress updates** visible to all:
```typescript
// Server emits progress
await jobService.progress(jobId, 50, 100, { phase: 'crawl' })
// → Emits 'review:crawl_progress' to room 'restaurant:123'

// All 3 users receive progress
socket.on('review:crawl_progress', (data) => {
  setCrawlProgress({ current: 50, total: 100, percentage: 50 })
})
```

**Benefits**:
- Prevents duplicate work (User B sees User A already started)
- Collaborative viewing (all users see same progress)
- Real-time updates (no need to refresh page)

---

## 9. API Endpoints

### 9.1 Job Status

**Route**: `GET /api/jobs/:jobId`

**Purpose**: Query job status and progress.

**Implementation**:
```typescript
// job.routes.ts
app.get('/api/jobs/:jobId', async (request, reply) => {
  const { jobId } = request.params

  const job = await jobRepository.findById(jobId)

  if (!job) {
    return ResponseHelper.notFound('Job not found')
  }

  return ResponseHelper.success('Job retrieved', job)
})
```

**Response**:
```json
{
  "result": true,
  "message": "Job retrieved",
  "data": {
    "id": "uuid-1234",
    "type": "review_crawl",
    "restaurant_id": 123,
    "status": "active",
    "progress_current": 50,
    "progress_total": 100,
    "progress_percentage": 50,
    "metadata": "{\"placeId\":\"abc123\",\"url\":\"https://...\"}",
    "result": null,
    "error_message": null,
    "started_at": "2025-10-23T10:30:00",
    "completed_at": null,
    "created_at": "2025-10-23T10:30:00",
    "updated_at": "2025-10-23T10:30:15"
  },
  "timestamp": 1698765432123
}
```

**Use Cases**:
- Poll job status from client (if not using Socket.io)
- Debugging (check job state in DB)
- Admin dashboard (view all jobs)

### 9.2 Job Cancellation

**Route**: `POST /api/jobs/:jobId/cancel`

**Purpose**: Cancel a running job (review_crawl only).

**Implementation**:
```typescript
// job.routes.ts
app.post('/api/jobs/:jobId/cancel', async (request, reply) => {
  const { jobId } = request.params

  // 1. Fetch job from DB
  const job = await jobRepository.findById(jobId)
  if (!job) {
    return ResponseHelper.notFound('Job not found')
  }

  // 2. Check if job is cancellable
  if (job.type !== 'review_crawl') {
    return ResponseHelper.error('Only review_crawl jobs can be cancelled', 400)
  }

  if (job.status !== 'active') {
    return ResponseHelper.error('Job is not active', 400)
  }

  // 3. Abort the job (memory)
  jobManager.cancelJob(jobId)

  // 4. Update DB and emit Socket event
  await jobSocketService.cancel(jobId, { reason: 'User cancelled via API' })

  return ResponseHelper.success('Job cancelled', null)
})
```

**Response**:
```json
{
  "result": true,
  "message": "Job cancelled",
  "data": null,
  "timestamp": 1698765432456
}
```

**Client Usage**:
```typescript
// Cancel button handler
const handleCancel = async () => {
  try {
    await apiService.cancelJob(jobId)
    Alert.success('Cancelled', 'Job cancelled successfully')
  } catch (error) {
    Alert.error('Error', 'Failed to cancel job')
  }
}
```

### 9.3 Start Job (Generic Endpoint)

**Route**: `POST /api/jobs/start`

**Purpose**: Start any job type (alternative to specific endpoints).

**Implementation**:
```typescript
// job.routes.ts
app.post('/api/jobs/start', {
  schema: {
    body: Type.Object({
      type: Type.Union([
        Type.Literal('review_crawl'),
        Type.Literal('review_summary'),
        Type.Literal('restaurant_crawl')
      ]),
      restaurantId: Type.Number(),
      metadata: Type.Optional(Type.Any())
    })
  }
}, async (request, reply) => {
  const { type, restaurantId, metadata } = request.body

  const jobId = await jobSocketService.start({ type, restaurantId, metadata })

  return ResponseHelper.success('Job started', { jobId })
})
```

**Example Request**:
```bash
curl -X POST http://localhost:4000/api/jobs/start \
  -H "Content-Type: application/json" \
  -d '{
    "type": "review_summary",
    "restaurantId": 123
  }'
```

**Response**:
```json
{
  "result": true,
  "message": "Job started",
  "data": {
    "jobId": "uuid-5678"
  },
  "timestamp": 1698765432789
}
```

---

## 10. Client Integration

### 10.1 SocketContext (React Context)

**Location**: `apps/shared/contexts/SocketContext.tsx`

**Purpose**: Provide Socket.io client functionality to React components.

**State Management**:
```typescript
const [socket, setSocket] = useState<Socket | null>(null)
const [isConnected, setIsConnected] = useState(false)
const [reviewCrawlStatus, setReviewCrawlStatus] = useState<ReviewCrawlStatus>({
  status: 'idle',
  error: null
})
const [crawlProgress, setCrawlProgress] = useState<ProgressData>({
  current: 0,
  total: 0,
  percentage: 0
})
const [dbProgress, setDbProgress] = useState<ProgressData>({
  current: 0,
  total: 0,
  percentage: 0
})
const [reviewSummaryStatus, setReviewSummaryStatus] = useState<ReviewSummaryStatus>({
  status: 'idle',
  error: null
})
const [summaryProgress, setSummaryProgress] = useState<SummaryProgress>({
  current: 0,
  total: 0,
  percentage: 0,
  completed: 0,
  failed: 0
})
```

**Socket.io Connection**:
```typescript
useEffect(() => {
  const socketInstance = io(API_URL, {
    transports: ['websocket'],
    reconnection: true
  })

  socketInstance.on('connect', () => {
    setIsConnected(true)
    console.log('[SocketContext] Connected:', socketInstance.id)
  })

  socketInstance.on('disconnect', () => {
    setIsConnected(false)
    console.log('[SocketContext] Disconnected')
  })

  setSocket(socketInstance)

  return () => {
    socketInstance.disconnect()
  }
}, [])
```

**Event Listeners**:
```typescript
useEffect(() => {
  if (!socket) return

  // Review Crawl Events
  socket.on(SOCKET_EVENTS.REVIEW_STARTED, (data: JobEventData) => {
    setReviewCrawlStatus({ status: 'active', error: null })
  })

  socket.on(SOCKET_EVENTS.REVIEW_CRAWL_PROGRESS, (data: JobEventData) => {
    setCrawlProgress({
      current: data.current || 0,
      total: data.total || 0,
      percentage: data.percentage || 0
    })
  })

  socket.on(SOCKET_EVENTS.REVIEW_DB_PROGRESS, (data: JobEventData) => {
    setDbProgress({
      current: data.current || 0,
      total: data.total || 0,
      percentage: data.percentage || 0
    })
  })

  socket.on(SOCKET_EVENTS.REVIEW_COMPLETED, (data: JobEventData) => {
    setReviewCrawlStatus({ status: 'completed', error: null })
  })

  socket.on(SOCKET_EVENTS.REVIEW_ERROR, (data: JobEventData) => {
    setReviewCrawlStatus({ status: 'failed', error: data.error || 'Unknown error' })
  })

  socket.on(SOCKET_EVENTS.REVIEW_CANCELLED, (data: JobEventData) => {
    setReviewCrawlStatus({ status: 'idle', error: null })
    resetCrawlProgress()
  })

  // Review Summary Events
  socket.on(SOCKET_EVENTS.REVIEW_SUMMARY_STARTED, (data: JobEventData) => {
    setReviewSummaryStatus({ status: 'active', error: null })
  })

  socket.on(SOCKET_EVENTS.REVIEW_SUMMARY_PROGRESS, (data: JobEventData) => {
    setSummaryProgress({
      current: data.current || 0,
      total: data.total || 0,
      percentage: data.percentage || 0,
      completed: data.completed || 0,
      failed: data.failed || 0
    })
  })

  socket.on(SOCKET_EVENTS.REVIEW_SUMMARY_COMPLETED, (data: JobEventData) => {
    setReviewSummaryStatus({ status: 'completed', error: null })
  })

  socket.on(SOCKET_EVENTS.REVIEW_SUMMARY_ERROR, (data: JobEventData) => {
    setReviewSummaryStatus({ status: 'failed', error: data.error || 'Unknown error' })
  })

  return () => {
    socket.off(SOCKET_EVENTS.REVIEW_STARTED)
    socket.off(SOCKET_EVENTS.REVIEW_CRAWL_PROGRESS)
    socket.off(SOCKET_EVENTS.REVIEW_DB_PROGRESS)
    socket.off(SOCKET_EVENTS.REVIEW_COMPLETED)
    socket.off(SOCKET_EVENTS.REVIEW_ERROR)
    socket.off(SOCKET_EVENTS.REVIEW_CANCELLED)
    socket.off(SOCKET_EVENTS.REVIEW_SUMMARY_STARTED)
    socket.off(SOCKET_EVENTS.REVIEW_SUMMARY_PROGRESS)
    socket.off(SOCKET_EVENTS.REVIEW_SUMMARY_COMPLETED)
    socket.off(SOCKET_EVENTS.REVIEW_SUMMARY_ERROR)
  }
}, [socket])
```

**Room Management**:
```typescript
const joinRestaurantRoom = (restaurantId: string) => {
  if (socket && isConnected) {
    socket.emit('subscribe:restaurant', restaurantId)
    console.log(`[SocketContext] Joined restaurant:${restaurantId}`)
  }
}

const leaveRestaurantRoom = (restaurantId: string) => {
  if (socket && isConnected) {
    socket.emit('unsubscribe:restaurant', restaurantId)
    console.log(`[SocketContext] Left restaurant:${restaurantId}`)
  }
}
```

**Context Provider**:
```typescript
return (
  <SocketContext.Provider
    value={{
      socket,
      isConnected,
      reviewCrawlStatus,
      crawlProgress,
      dbProgress,
      reviewSummaryStatus,
      summaryProgress,
      joinRestaurantRoom,
      leaveRestaurantRoom,
      resetCrawlStatus: () => {
        setReviewCrawlStatus({ status: 'idle', error: null })
        resetCrawlProgress()
      },
      resetSummaryStatus: () => {
        setReviewSummaryStatus({ status: 'idle', error: null })
        resetSummaryProgress()
      }
    }}
  >
    {children}
  </SocketContext.Provider>
)
```

### 10.2 Usage in Components

**Restaurant Detail Component**:
```typescript
import { useSocket } from '@shared/contexts/SocketContext'

function RestaurantDetail({ restaurantId }: { restaurantId: number }) {
  const {
    reviewCrawlStatus,
    crawlProgress,
    dbProgress,
    joinRestaurantRoom,
    leaveRestaurantRoom
  } = useSocket()

  // Auto-subscribe to restaurant room
  useEffect(() => {
    if (restaurantId) {
      joinRestaurantRoom(String(restaurantId))
      return () => leaveRestaurantRoom(String(restaurantId))
    }
  }, [restaurantId, joinRestaurantRoom, leaveRestaurantRoom])

  // Display status
  return (
    <View>
      {reviewCrawlStatus.status === 'active' && (
        <View>
          <Text>Crawling reviews...</Text>
          <Text>Progress: {crawlProgress.percentage}%</Text>
          <Text>DB Saving: {dbProgress.percentage}%</Text>
        </View>
      )}

      {reviewCrawlStatus.status === 'completed' && (
        <Text>Crawling completed!</Text>
      )}

      {reviewCrawlStatus.status === 'failed' && (
        <Text>Error: {reviewCrawlStatus.error}</Text>
      )}
    </View>
  )
}
```

---

## 11. Testing Considerations

### 11.1 Unit Tests

**Test File**: `servers/friendly/src/services/job-socket.service.test.ts`

**Test Cases**:
```typescript
describe('JobSocketService', () => {
  let jobSocketService: JobSocketService
  let jobRepository: JobRepository
  let io: Server

  beforeEach(() => {
    jobRepository = createMockJobRepository()
    io = createMockSocketServer()
    jobSocketService = new JobSocketService(jobRepository, io)
  })

  describe('start()', () => {
    it('should create job in DB and emit Socket event', async () => {
      const jobId = await jobSocketService.start({
        type: 'review_crawl',
        restaurantId: 123,
        metadata: { placeId: 'abc' }
      })

      expect(jobId).toMatch(/^[0-9a-f-]{36}$/) // UUID format
      expect(jobRepository.create).toHaveBeenCalledWith({
        id: jobId,
        type: 'review_crawl',
        restaurant_id: 123,
        status: 'active',
        ...
      })
      expect(io.to).toHaveBeenCalledWith('restaurant:123')
      expect(io.emit).toHaveBeenCalledWith('review:started', expect.objectContaining({
        jobId,
        type: 'review_crawl',
        restaurantId: 123
      }))
    })
  })

  describe('progress()', () => {
    it('should auto-fetch job and emit progress event', async () => {
      const job = { id: 'uuid', type: 'review_crawl', restaurant_id: 123 }
      jobRepository.findById.mockResolvedValue(job)

      await jobSocketService.progress('uuid', 50, 100, { phase: 'crawl' })

      expect(jobRepository.findById).toHaveBeenCalledWith('uuid')
      expect(jobRepository.updateProgress).toHaveBeenCalledWith('uuid', 50, 100)
      expect(io.emit).toHaveBeenCalledWith('review:crawl_progress', expect.objectContaining({
        current: 50,
        total: 100,
        percentage: 50
      }))
    })
  })

  describe('complete()', () => {
    it('should mark job as completed and emit event', async () => {
      const job = { id: 'uuid', type: 'review_summary', restaurant_id: 456 }
      jobRepository.findById.mockResolvedValue(job)

      await jobSocketService.complete('uuid', { completed: 98, failed: 2 })

      expect(jobRepository.updateStatus).toHaveBeenCalledWith('uuid', 'completed', {
        completed: 98,
        failed: 2
      })
      expect(io.emit).toHaveBeenCalledWith('review_summary:completed', expect.objectContaining({
        status: 'completed',
        completed: 98,
        failed: 2
      }))
    })
  })

  describe('error()', () => {
    it('should mark job as failed and emit error event', async () => {
      const job = { id: 'uuid', type: 'review_crawl', restaurant_id: 123 }
      jobRepository.findById.mockResolvedValue(job)

      await jobSocketService.error('uuid', 'Network timeout')

      expect(jobRepository.updateStatus).toHaveBeenCalledWith('uuid', 'failed', {
        error_message: 'Network timeout'
      })
      expect(io.emit).toHaveBeenCalledWith('review:error', expect.objectContaining({
        error: 'Network timeout'
      }))
    })
  })

  describe('cancel()', () => {
    it('should mark job as cancelled and emit event', async () => {
      const job = { id: 'uuid', type: 'review_crawl', restaurant_id: 123 }
      jobRepository.findById.mockResolvedValue(job)

      await jobSocketService.cancel('uuid', { reason: 'User cancelled' })

      expect(jobRepository.updateStatus).toHaveBeenCalledWith('uuid', 'cancelled', {
        reason: 'User cancelled'
      })
      expect(io.emit).toHaveBeenCalledWith('review:cancelled', expect.objectContaining({
        status: 'cancelled'
      }))
    })
  })
})
```

### 11.2 Integration Tests

**Test File**: `servers/friendly/src/tests/job-socket.test.ts`

**Test Cases**:
```typescript
describe('Job + Socket Integration', () => {
  let app: FastifyInstance
  let db: Database
  let socketClient: SocketIOClient

  beforeAll(async () => {
    app = await createTestApp()
    db = await createTestDatabase()
    socketClient = await createSocketClient()
  })

  afterAll(async () => {
    await db.close()
    await app.close()
    socketClient.disconnect()
  })

  describe('Full review crawl lifecycle', () => {
    it('should complete full lifecycle with Socket events', async (done) => {
      const restaurantId = 123
      const events: string[] = []

      // Subscribe to restaurant room
      socketClient.emit('subscribe:restaurant', String(restaurantId))

      // Listen for events
      socketClient.on('review:started', (data) => {
        events.push('started')
      })

      socketClient.on('review:crawl_progress', (data) => {
        events.push('crawl_progress')
        expect(data.percentage).toBeGreaterThan(0)
      })

      socketClient.on('review:db_progress', (data) => {
        events.push('db_progress')
      })

      socketClient.on('review:completed', (data) => {
        events.push('completed')
        expect(events).toEqual(['started', 'crawl_progress', 'db_progress', 'completed'])
        done()
      })

      // Start crawl
      await request(app.server)
        .post('/api/crawler/reviews')
        .send({ url: 'https://map.naver.com/...', restaurantId })
        .expect(200)
    })
  })

  describe('Job cancellation', () => {
    it('should cancel job and emit cancelled event', async (done) => {
      const restaurantId = 456
      let jobId: string

      socketClient.emit('subscribe:restaurant', String(restaurantId))

      socketClient.on('review:started', (data) => {
        jobId = data.jobId

        // Cancel after 500ms
        setTimeout(async () => {
          await request(app.server)
            .post(`/api/jobs/${jobId}/cancel`)
            .expect(200)
        }, 500)
      })

      socketClient.on('review:cancelled', (data) => {
        expect(data.jobId).toBe(jobId)
        done()
      })

      // Start crawl
      await request(app.server)
        .post('/api/crawler/reviews')
        .send({ url: 'https://map.naver.com/...', restaurantId })
        .expect(200)
    })
  })

  describe('Multi-user sync', () => {
    it('should broadcast events to all users in room', async (done) => {
      const restaurantId = 789
      const client1 = await createSocketClient()
      const client2 = await createSocketClient()

      let client1Events = 0
      let client2Events = 0

      // Both clients join room
      client1.emit('subscribe:restaurant', String(restaurantId))
      client2.emit('subscribe:restaurant', String(restaurantId))

      // Both listen for events
      client1.on('review:started', () => { client1Events++ })
      client2.on('review:started', () => { client2Events++ })

      client1.on('review:completed', () => {
        client1Events++
        if (client1Events >= 2 && client2Events >= 2) {
          expect(client1Events).toBe(client2Events) // Both received same events
          client1.disconnect()
          client2.disconnect()
          done()
        }
      })

      client2.on('review:completed', () => {
        client2Events++
      })

      // Start crawl (via client1)
      await request(app.server)
        .post('/api/crawler/reviews')
        .send({ url: 'https://map.naver.com/...', restaurantId })
        .expect(200)
    })
  })
})
```

### 11.3 Testing Best Practices

1. **Mock Socket.io for Unit Tests**:
   - Use `jest.mock('socket.io')` to mock Socket server
   - Verify `io.to()` and `io.emit()` calls
   - Focus on business logic, not Socket internals

2. **Use Real Socket.io for Integration Tests**:
   - Create test Socket.io server
   - Connect Socket.io client
   - Verify end-to-end event flow

3. **Test Cancellation**:
   - Start long-running job
   - Cancel mid-process
   - Verify `cancelled` status in DB
   - Verify `review:cancelled` event emitted

4. **Test Multi-user Scenarios**:
   - Create multiple Socket.io clients
   - All join same room
   - Verify all receive same events

5. **Test Error Handling**:
   - Simulate errors (network timeout, DB error, etc.)
   - Verify `failed` status in DB
   - Verify `error` event emitted with correct message

---

## 12. Related Documentation

### 12.1 Core Documentation
- **[Database Schema](../00-core/DATABASE.md)** - `jobs` table schema, migration system
- **[Architecture](../00-core/ARCHITECTURE.md)** - Overall system architecture
- **[Development](../00-core/DEVELOPMENT.md)** - Development workflow, testing

### 12.2 Friendly Server Documentation
- **[Friendly Database](./FRIENDLY-DATABASE.md)** - `database.ts`, `migrate.ts`, `job.repository.ts`
- **[Friendly Repositories](./FRIENDLY-REPOSITORIES.md)** - Repository pattern, UPSERT operations
- **[Friendly Review](./FRIENDLY-REVIEW.md)** - `review-crawler-processor.service.ts`
- **[Friendly Review Summary](./FRIENDLY-REVIEW-SUMMARY.md)** - `review-summary-processor.service.ts`
- **[Friendly Routes](./FRIENDLY-ROUTES.md)** - API endpoints, ResponseHelper
- **[Friendly Testing](./FRIENDLY-TESTING.md)** - Vitest integration tests

### 12.3 Shared Module Documentation
- **[Shared Contexts](../03-shared/SHARED-CONTEXTS.md)** - `SocketContext` client implementation
- **[Shared Utils](../03-shared/SHARED-UTILS.md)** - Socket utility types (`SOCKET_EVENTS`, `JobEventData`)
- **[Shared Overview](../03-shared/SHARED-OVERVIEW.md)** - Barrel Export pattern

### 12.4 Web/Mobile Documentation
- **[Web Restaurant](../01-web/WEB-RESTAURANT.md)** - Restaurant component with Socket integration
- **[Mobile Restaurant Detail](../02-mobile/MOBILE-RESTAURANT-DETAIL.md)** - Mobile Socket usage

### 12.5 External Resources
- **[Socket.io Documentation](https://socket.io/docs/)** - Official Socket.io docs
- **[Fastify Documentation](https://www.fastify.io/)** - Fastify framework docs

---

**문서 버전**: 1.0
**작성일**: 2025-10-23
**관리**: Claude Code Documentation Team
