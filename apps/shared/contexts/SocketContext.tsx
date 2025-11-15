import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import {
  Alert,
  type ProgressData,
  type SummaryProgress,
  type ReviewSummaryStatus,
  SocketSequenceManager,
  JobCompletionTracker
} from '../utils'
import { SOCKET_CONFIG } from '../constants'
import { getDefaultApiUrl } from '../services'
import type { QueuedJob, ActiveJob, QueueStats } from '../types'

interface SocketContextValue {
  socket: Socket | null
  isConnected: boolean
  menuProgress: ProgressData | null
  crawlProgress: ProgressData | null
  dbProgress: ProgressData | null
  imageProgress: ProgressData | null
  isCrawlInterrupted: boolean
  reviewSummaryStatus: ReviewSummaryStatus
  summaryProgress: SummaryProgress | null
  queueItems: QueuedJob[]
  activeJobs: ActiveJob[]
  queueStats: QueueStats
  joinRestaurantRoom: (restaurantId: string) => void
  leaveRestaurantRoom: (restaurantId: string) => void
  setRestaurantCallbacks: (callbacks: {
    onMenuCrawlCompleted?: (data: { restaurantId: string }) => void
    onReviewCrawlCompleted?: (data: { restaurantId: string; totalReviews: number }) => void
    onReviewCrawlError?: (data: { restaurantId: string; error: string }) => void
    onReviewSummaryCompleted?: (data: { restaurantId: string }) => void
  }) => void
  resetCrawlStatus: () => void
  resetSummaryStatus: () => void
  getRestaurantQueueStatus: (restaurantId: number) => QueuedJob | null
  getRestaurantJobStatus: (restaurantId: number) => ActiveJob | null
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined)

interface SocketProviderProps {
  children: React.ReactNode
  serverUrl?: string
}

export const SocketProvider: React.FC<SocketProviderProps> = ({
  children,
  serverUrl
}) => {
  const resolvedServerUrl = serverUrl || getDefaultApiUrl()
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [menuProgress, setMenuProgress] = useState<ProgressData | null>(null)
  const [crawlProgress, setCrawlProgress] = useState<ProgressData | null>(null)
  const [dbProgress, setDbProgress] = useState<ProgressData | null>(null)
  const [imageProgress, setImageProgress] = useState<ProgressData | null>(null)
  const [isCrawlInterrupted, setIsCrawlInterrupted] = useState(false)
  const [reviewSummaryStatus, setReviewSummaryStatus] = useState<ReviewSummaryStatus>({
    status: 'idle'
  })
  const [summaryProgress, setSummaryProgress] = useState<SummaryProgress | null>(null)
  const [queueItems, setQueueItems] = useState<QueuedJob[]>([])
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([])
  const [queueStats, setQueueStats] = useState<QueueStats>({
    total: 0,
    waiting: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
  })
  const callbacksRef = useRef<{
    onMenuCrawlCompleted?: (data: { restaurantId: string }) => void
    onReviewCrawlCompleted?: (data: { restaurantId: string; totalReviews: number }) => void
    onReviewCrawlError?: (data: { restaurantId: string; error: string }) => void
    onReviewSummaryCompleted?: (data: { restaurantId: string }) => void
  }>({})
  const currentRestaurantIdRef = useRef<string | null>(null)

  // ✅ 공통 유틸 인스턴스
  const sequenceManagerRef = useRef<SocketSequenceManager>(new SocketSequenceManager())
  const completionTrackerRef = useRef<JobCompletionTracker>(new JobCompletionTracker(5))

  // Socket.io 연결 초기화 (앱 전체에서 단 한 번)
  useEffect(() => {
    console.log('[Socket.io] Connecting to:', resolvedServerUrl)

    const socket = io(resolvedServerUrl, SOCKET_CONFIG as any)

    socket.on('connect', () => {
      console.log('[Socket.io] Connected:', socket.id)
      setIsConnected(true)

      // ✅ Queue 및 전체 Job 구독
      socket.emit('subscribe:queue')
      socket.emit('subscribe:all_jobs')
      console.log('[Socket.io] Subscribed to queue and all jobs')
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

  // Socket 이벤트 리스너 등록 (한 번만)
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    // 메뉴 크롤링 진행 상황
    socket.on('restaurant:menu_progress', (data: any) => {
      console.log('[Socket.io] Menu Progress:', data)

      // 메뉴 진행률 업데이트 (메뉴 크롤링 중)
      setMenuProgress({
        current: data.current || 0,
        total: data.total || 0,
        percentage: data.percentage || 0
      })

      // 100% 완료 시 초기화 + 콜백 호출
      if (data.percentage === 100 || data.current === data.total) {
        setTimeout(() => {
          setMenuProgress(null)
        }, 1000) // 1초 후 사라짐

        // 메뉴 크롤링 완료 콜백 호출
        if (callbacksRef.current.onMenuCrawlCompleted) {
          callbacksRef.current.onMenuCrawlCompleted({
            restaurantId: data.restaurantId?.toString() || ''
          })
        }
      }
    })

    // 레스토랑 현재 상태 (활성 이벤트 목록)
    socket.on('restaurant:current_state', (data: any) => {
      console.log('[Socket.io] Current State:', data)

      const activeEvents = new Set(data.activeEventNames || [])

      // ✅ 중단 상태 반영
      if (data.interruptedCount > 0) {
        setIsCrawlInterrupted(true)
      } else if (activeEvents.size === 0) {
        // 활성 job도 없고 중단된 job도 없으면 초기화
        setIsCrawlInterrupted(false)
      }

      // 메뉴 크롤링: restaurant:menu_progress가 없으면 초기화
      if (!activeEvents.has('restaurant:menu_progress')) {
        setMenuProgress(null)
      }

      // 리뷰 크롤링: review:crawl_progress, review:db_progress, review:image_progress가 없으면 초기화
      if (!activeEvents.has('review:crawl_progress')) {
        setCrawlProgress(null)
      }
      if (!activeEvents.has('review:db_progress')) {
        setDbProgress(null)
      }
      if (!activeEvents.has('review:image_progress')) {
        setImageProgress(null)
      }

      // 리뷰 요약: review_summary:progress가 없으면 초기화
      if (!activeEvents.has('review_summary:progress')) {
        setReviewSummaryStatus({ status: 'idle' })
        setSummaryProgress(null)
      }

      console.log(`[Socket.io] State initialized - Active events: [${Array.from(activeEvents).join(', ')}], Interrupted: ${data.interruptedCount > 0}`)
    })

    // 크롤링 진행 상황 (웹 크롤링 단계, subscribe 시점 + 실시간 업데이트)
    socket.on('review:crawl_progress', (data: any) => {
      console.log('[Socket.io] Crawl Progress:', data)

      const jobId = data.jobId
      const sequence = data.sequence || data.current || 0

      // ✅ Sequence 체크
      if (!sequenceManagerRef.current.check(`crawl-${jobId || 'default'}`, sequence)) return

      // ✅ 완료 Job 체크
      if (jobId && completionTrackerRef.current.isCompleted(jobId)) {
        console.warn(`[Socket.io] Ignored - crawl job ${jobId} already completed`)
        return
      }

      // 크롤링 진행률 업데이트 (웹 페이지에서 리뷰 수집 중)
      setCrawlProgress({
        current: data.current || 0,
        total: data.total || 0,
        percentage: data.percentage || 0
      })
    })

    // DB 저장 진행 상황 (실제 DB 저장 단계)
    socket.on('review:db_progress', (data: any) => {
      console.log('[Socket.io] DB Progress:', data)

      const jobId = data.jobId
      const sequence = data.sequence || data.current || 0

      // ✅ Sequence 체크
      if (!sequenceManagerRef.current.check(`db-${jobId || 'default'}`, sequence)) return

      // ✅ 완료 Job 체크
      if (jobId && completionTrackerRef.current.isCompleted(jobId)) {
        console.warn(`[Socket.io] Ignored - crawl job ${jobId} already completed`)
        return
      }

      // DB 저장 진행률 업데이트
      setDbProgress({
        current: data.current || 0,
        total: data.total || 0,
        percentage: data.percentage || 0
      })

      // 100% 완료 시 콜백 호출 (모든 작업 완료)
      if (data.percentage === 100 || data.current === data.total) {
        // ✅ jobId가 있으면 완료로 마킹
        if (jobId) {
          completionTrackerRef.current.markCompleted(jobId)
        }

        // 모든 진행률 초기화
        setCrawlProgress(null)
        setDbProgress(null)
        setImageProgress(null)
        sequenceManagerRef.current.reset(`crawl-${jobId || 'default'}`)
        sequenceManagerRef.current.reset(`db-${jobId || 'default'}`)
        sequenceManagerRef.current.reset(`image-${jobId || 'default'}`)

        // 완료 콜백 호출
        if (callbacksRef.current.onReviewCrawlCompleted) {
          callbacksRef.current.onReviewCrawlCompleted({
            restaurantId: data.restaurantId?.toString() || '',
            totalReviews: data.total || 0
          })
        }
      }
    })

    // 이미지 처리 진행 상황 (이미지 다운로드 단계)
    socket.on('review:image_progress', (data: any) => {
      console.log('[Socket.io] Image Progress:', data)

      const jobId = data.jobId
      const sequence = data.sequence || data.current || 0

      // ✅ Sequence 체크
      if (!sequenceManagerRef.current.check(`image-${jobId || 'default'}`, sequence)) return

      // ✅ 완료 Job 체크
      if (jobId && completionTrackerRef.current.isCompleted(jobId)) {
        console.warn(`[Socket.io] Ignored - crawl job ${jobId} already completed`)
        return
      }

      // 이미지 처리 진행률 업데이트
      setImageProgress({
        current: data.current || 0,
        total: data.total || 0,
        percentage: data.percentage || 0
      })
    })

    // 크롤링 에러
    socket.on('review:error', (data: any) => {
      console.error('[Socket.io] Error:', data)
      const errorMessage = data.error || '크롤링 중 오류가 발생했습니다'
      const jobId = data.jobId

      // ✅ jobId가 있으면 완료로 마킹 (에러도 종료 상태)
      if (jobId) {
        completionTrackerRef.current.markCompleted(jobId)
      }

      setCrawlProgress(null)
      setDbProgress(null)
      setImageProgress(null)
      // Sequence 초기화
      sequenceManagerRef.current.reset(`crawl-${jobId || 'default'}`)
      sequenceManagerRef.current.reset(`db-${jobId || 'default'}`)
      sequenceManagerRef.current.reset(`image-${jobId || 'default'}`)
      Alert.error('크롤링 실패', errorMessage)

      // 콜백 호출
      if (callbacksRef.current.onReviewCrawlError) {
        callbacksRef.current.onReviewCrawlError({
          restaurantId: data.restaurantId?.toString() || '',
          error: errorMessage
        })
      }
    })

    // 크롤링 중단 (서버 재시작/에러로 인한 중단)
    socket.on('review:interrupted', (data: any) => {
      console.warn('[Socket.io] Review crawl interrupted:', data)
      const jobId = data.jobId

      // ✅ jobId가 있으면 완료로 마킹 (중단도 종료 상태)
      if (jobId) {
        completionTrackerRef.current.markCompleted(jobId)
      }

      // 중단 상태 설정
      setIsCrawlInterrupted(true)

      // 모든 진행률 초기화
      setCrawlProgress(null)
      setDbProgress(null)
      setImageProgress(null)
      sequenceManagerRef.current.reset(`crawl-${jobId || 'default'}`)
      sequenceManagerRef.current.reset(`db-${jobId || 'default'}`)
      sequenceManagerRef.current.reset(`image-${jobId || 'default'}`)

      // 콜백 호출 (에러 콜백 재사용)
      if (callbacksRef.current.onReviewCrawlError) {
        callbacksRef.current.onReviewCrawlError({
          restaurantId: data.restaurantId?.toString() || '',
          error: data.reason || 'Server restarted - job was interrupted'
        })
      }
    })

    // 리뷰 요약 진행 (subscribe 시점 + 실시간 업데이트)
    socket.on('review_summary:progress', (data: any) => {
      console.log('[Socket.io] Summary Progress:', data)

      const jobId = data.jobId
      const sequence = data.sequence || data.current || 0

      // ✅ Sequence 체크
      if (!sequenceManagerRef.current.check(`summary-${jobId || 'default'}`, sequence)) return

      // ✅ 완료 Job 체크
      if (jobId && completionTrackerRef.current.isCompleted(jobId)) {
        console.warn(`[Socket.io] Ignored - summary job ${jobId} already completed`)
        return
      }

      // 진행 중 상태로 설정
      setReviewSummaryStatus({ status: 'active' })

      // 통합 데이터 구조 지원
      setSummaryProgress({
        current: data.current || 0,
        total: data.total || 0,
        percentage: data.percentage || 0,
        completed: data.completed || 0,
        failed: data.failed || 0
      })

      // 100% 완료 시 완료 상태로 전환 + 콜백
      if (data.percentage === 100 || data.current === data.total) {
        // ✅ jobId가 있으면 완료로 마킹
        if (jobId) {
          completionTrackerRef.current.markCompleted(jobId)
        }

        setReviewSummaryStatus({ status: 'completed' })
        setSummaryProgress(null)
        sequenceManagerRef.current.reset(`summary-${jobId || 'default'}`)

        // 콜백 호출
        if (callbacksRef.current.onReviewSummaryCompleted) {
          callbacksRef.current.onReviewSummaryCompleted({
            restaurantId: data.restaurantId?.toString() || ''
          })
        }
      }
    })

    // 리뷰 요약 에러
    socket.on('review_summary:error', (data: any) => {
      console.error('[Socket.io] Summary Error:', data)
      const errorMessage = data.error || '요약 중 오류가 발생했습니다'
      const jobId = data.jobId

      // ✅ jobId가 있으면 완료로 마킹 (에러도 종료 상태)
      if (jobId) {
        completionTrackerRef.current.markCompleted(jobId)
      }

      setReviewSummaryStatus({ status: 'failed', error: errorMessage })
      setSummaryProgress(null)
      sequenceManagerRef.current.reset(`summary-${jobId || 'default'}`)
      Alert.error('요약 실패', errorMessage)
    })

    // 리뷰 요약 중단 (서버 재시작/에러로 인한 중단)
    socket.on('review_summary:interrupted', (data: any) => {
      console.warn('[Socket.io] Review summary interrupted:', data)
      const jobId = data.jobId

      // ✅ jobId가 있으면 완료로 마킹 (중단도 종료 상태)
      if (jobId) {
        completionTrackerRef.current.markCompleted(jobId)
      }

      // 상태 초기화 (에러 메시지 포함)
      setReviewSummaryStatus({
        status: 'failed',
        error: data.reason || 'Server restarted - job was interrupted'
      })
      setSummaryProgress(null)
      sequenceManagerRef.current.reset(`summary-${jobId || 'default'}`)
    })

    // 레스토랑 크롤링 중단 (서버 재시작/에러로 인한 중단)
    socket.on('restaurant_crawl:interrupted', (data: any) => {
      console.warn('[Socket.io] Restaurant crawl interrupted:', data)

      // 메뉴 진행률 초기화
      setMenuProgress(null)
    })

    // ==================== Queue 이벤트 ====================

    // Queue 초기 상태
    socket.on('queue:current_state', (data: {
      total: number
      queue: QueuedJob[]
      stats: QueueStats
      timestamp: number
    }) => {
      console.log('[Socket.io] Queue current state:', data)
      setQueueItems(data.queue)
      setQueueStats(data.stats)
    })

    // Queue에 Job 추가됨
    socket.on('queue:job_added', () => {
      // 최신 Queue 상태 재조회
      socket.emit('subscribe:queue')
    })

    // Queue Item 처리 시작
    socket.on('queue:job_started', (data: {
      queueId: string
      type: string
      restaurantId: number
      timestamp: number
    }) => {
      console.log('[Socket.io] Queue job started:', data)
      setQueueItems(prev => prev.map(item =>
        item.queueId === data.queueId
          ? { ...item, queueStatus: 'processing', startedAt: new Date().toISOString() }
          : item
      ))
    })

    // Queue Item 완료
    socket.on('queue:job_completed', (data: {
      queueId: string
      jobId: string
      type: string
      restaurantId: number
      timestamp: number
    }) => {
      console.log('[Socket.io] Queue job completed:', data)
      setQueueItems(prev => prev.filter(item => item.queueId !== data.queueId))
      setQueueStats(prev => ({
        ...prev,
        processing: Math.max(0, prev.processing - 1),
      }))
    })

    // Queue Item 실패
    socket.on('queue:job_failed', (data: {
      queueId: string
      jobId?: string
      type: string
      restaurantId: number
      error: string
      timestamp: number
    }) => {
      console.error('[Socket.io] Queue job failed:', data)
      setQueueItems(prev => prev.map(item =>
        item.queueId === data.queueId
          ? {
              ...item,
              queueStatus: 'failed',
              completedAt: new Date().toISOString(),
              error: data.error,
            }
          : item
      ))

      // 3초 후 Queue에서 제거
      setTimeout(() => {
        setQueueItems(prev => prev.filter(item => item.queueId !== data.queueId))
        setQueueStats(prev => ({
          ...prev,
          processing: Math.max(0, prev.processing - 1),
        }))
      }, 3000)
    })

    // Queue Item 취소됨
    socket.on('queue:job_cancelled', (data: {
      queueId: string
      restaurantId: number
      timestamp: number
    }) => {
      console.log('[Socket.io] Queue job cancelled:', data)
      setQueueItems(prev => prev.filter(item => item.queueId !== data.queueId))
      setQueueStats(prev => ({
        ...prev,
        waiting: Math.max(0, prev.waiting - 1),
      }))
    })

    // ==================== Job 이벤트 ====================

    // 전체 Job 초기 상태
    socket.on('jobs:current_state', (data: {
      total: number
      jobs: ActiveJob[]
      restaurantIds: number[]
      timestamp: number
    }) => {
      console.log('[Socket.io] Jobs current state:', data)
      setActiveJobs(data.jobs)
    })

    // 새 Job 시작 알림
    socket.on('job:new', (data: {
      jobId: string
      type: string
      restaurantId: number
      timestamp: number
    }) => {
      console.log('[Socket.io] New job started:', data)
      // 전체 Job 상태 재조회
      socket.emit('subscribe:all_jobs')
    })

    // ✅ 자동 정리 시작
    completionTrackerRef.current.startAutoCleanup(5)

    return () => {
      completionTrackerRef.current.stopAutoCleanup()
      socket.off('restaurant:menu_progress')
      socket.off('restaurant:current_state')
      socket.off('review:crawl_progress')
      socket.off('review:db_progress')
      socket.off('review:image_progress')
      socket.off('review:error')
      socket.off('review:interrupted')
      socket.off('review_summary:progress')
      socket.off('review_summary:error')
      socket.off('review_summary:interrupted')
      socket.off('restaurant_crawl:interrupted')
      socket.off('queue:current_state')
      socket.off('queue:job_added')
      socket.off('queue:job_started')
      socket.off('queue:job_completed')
      socket.off('queue:job_failed')
      socket.off('queue:job_cancelled')
      socket.off('jobs:current_state')
      socket.off('job:new')
    }
  }, [])

  // Restaurant room 입장
  const joinRestaurantRoom = useCallback((restaurantId: string) => {
    const socket = socketRef.current
    if (!socket) {
      console.error('[Socket.io] Socket not initialized')
      return
    }

    // 이전 room 퇴장
    if (currentRestaurantIdRef.current && currentRestaurantIdRef.current !== restaurantId) {
      socket.emit('unsubscribe:restaurant', currentRestaurantIdRef.current)
      console.log(`[Socket.io] Left room: restaurant:${currentRestaurantIdRef.current}`)
    }

    currentRestaurantIdRef.current = restaurantId

    // 새 room 입장
    socket.emit('subscribe:restaurant', restaurantId)
    console.log(`[Socket.io] Joined room: restaurant:${restaurantId}`)
  }, [])

  // Restaurant room 퇴장
  const leaveRestaurantRoom = useCallback((restaurantId: string) => {
    const socket = socketRef.current
    if (!socket) return

    socket.emit('unsubscribe:restaurant', restaurantId)
    console.log(`[Socket.io] Left room: restaurant:${restaurantId}`)

    if (currentRestaurantIdRef.current === restaurantId) {
      currentRestaurantIdRef.current = null
      callbacksRef.current = {}
    }
  }, [])

  // 콜백 설정 (크롤링 시작 시 호출)
  const setRestaurantCallbacks = useCallback((callbacks: {
    onMenuCrawlCompleted?: (data: { restaurantId: string }) => void
    onReviewCrawlCompleted?: (data: { restaurantId: string; totalReviews: number }) => void
    onReviewCrawlError?: (data: { restaurantId: string; error: string }) => void
    onReviewSummaryCompleted?: (data: { restaurantId: string }) => void
  }) => {
    callbacksRef.current = callbacks
  }, [])

  // 크롤링 상태 초기화
  const resetCrawlStatus = useCallback(() => {
    setMenuProgress(null)
    setCrawlProgress(null)
    setDbProgress(null)
    setImageProgress(null)
    setIsCrawlInterrupted(false)
    // Sequence 초기화는 공통 유틸에서 관리 (clear는 전체 초기화이므로 생략)
  }, [])

  // 요약 상태 초기화
  const resetSummaryStatus = useCallback(() => {
    setReviewSummaryStatus({ status: 'idle' })
    setSummaryProgress(null)
  }, [])

  // 레스토랑별 Queue 상태 조회
  const getRestaurantQueueStatus = useCallback((restaurantId: number): QueuedJob | null => {
    return queueItems.find(item => item.restaurantId === restaurantId) || null
  }, [queueItems])

  // 레스토랑별 Job 상태 조회
  const getRestaurantJobStatus = useCallback((restaurantId: number): ActiveJob | null => {
    return activeJobs.find(job => job.restaurantId === restaurantId) || null
  }, [activeJobs])

  const value: SocketContextValue = {
    socket: socketRef.current,
    isConnected,
    menuProgress,
    crawlProgress,
    dbProgress,
    imageProgress,
    isCrawlInterrupted,
    reviewSummaryStatus,
    summaryProgress,
    queueItems,
    activeJobs,
    queueStats,
    joinRestaurantRoom,
    leaveRestaurantRoom,
    setRestaurantCallbacks,
    resetCrawlStatus,
    resetSummaryStatus,
    getRestaurantQueueStatus,
    getRestaurantJobStatus,
  }

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

// Hook으로 Socket Context 사용
export const useSocket = (): SocketContextValue => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

