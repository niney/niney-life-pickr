import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import {
  Alert,
  type ProgressData,
  type SummaryProgress,
  type ReviewSummaryStatus
} from '../utils'
import { getDefaultApiUrl } from '../services'

interface SocketContextValue {
  socket: Socket | null
  isConnected: boolean
  menuProgress: ProgressData | null
  crawlProgress: ProgressData | null
  dbProgress: ProgressData | null
  imageProgress: ProgressData | null
  reviewSummaryStatus: ReviewSummaryStatus
  summaryProgress: SummaryProgress | null
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
  const [reviewSummaryStatus, setReviewSummaryStatus] = useState<ReviewSummaryStatus>({
    status: 'idle'
  })
  const [summaryProgress, setSummaryProgress] = useState<SummaryProgress | null>(null)
  const callbacksRef = useRef<{
    onMenuCrawlCompleted?: (data: { restaurantId: string }) => void
    onReviewCrawlCompleted?: (data: { restaurantId: string; totalReviews: number }) => void
    onReviewCrawlError?: (data: { restaurantId: string; error: string }) => void
    onReviewSummaryCompleted?: (data: { restaurantId: string }) => void
  }>({})
  const currentRestaurantIdRef = useRef<string | null>(null)

  // ✅ Sequence 번호 추적 (순서 보장)
  const lastCrawlSequenceRef = useRef<number>(0)
  const lastDbSequenceRef = useRef<number>(0)
  const lastImageSequenceRef = useRef<number>(0)
  const lastSummarySequenceRef = useRef<number>(0)

  // ✅ 완료된 Job ID와 타임스탬프 추적 (5분 후 자동 삭제) - 타입별 분리
  const completedCrawlJobsRef = useRef<Map<string, number>>(new Map())
  const completedSummaryJobsRef = useRef<Map<string, number>>(new Map())
  const JOB_RETENTION_MS = 5 * 60 * 1000 // 5분

  // ✅ 현재 작업 Job ID 추적
  const currentCrawlJobIdRef = useRef<string | null>(null)
  const currentSummaryJobIdRef = useRef<string | null>(null)

  // ✅ Crawl Job 관리 함수
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

  const isCrawlJobCompleted = (jobId: string): boolean => {
    cleanupCompletedCrawlJobs()
    return completedCrawlJobsRef.current.has(jobId)
  }

  const markCrawlJobAsCompleted = (jobId: string) => {
    completedCrawlJobsRef.current.set(jobId, Date.now())
    console.log(`[Socket.io] Marked crawl job as completed: ${jobId}`)
  }

  // ✅ Summary Job 관리 함수
  const cleanupCompletedSummaryJobs = () => {
    const now = Date.now()
    const jobsToDelete: string[] = []

    completedSummaryJobsRef.current.forEach((timestamp, jobId) => {
      if (now - timestamp > JOB_RETENTION_MS) {
        jobsToDelete.push(jobId)
      }
    })

    jobsToDelete.forEach(jobId => {
      completedSummaryJobsRef.current.delete(jobId)
      console.log(`[Socket.io] Cleaned up old summary job: ${jobId}`)
    })
  }

  const isSummaryJobCompleted = (jobId: string): boolean => {
    cleanupCompletedSummaryJobs()
    return completedSummaryJobsRef.current.has(jobId)
  }

  const markSummaryJobAsCompleted = (jobId: string) => {
    completedSummaryJobsRef.current.set(jobId, Date.now())
    console.log(`[Socket.io] Marked summary job as completed: ${jobId}`)
  }

  // Socket.io 연결 초기화 (앱 전체에서 단 한 번)
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

    // 크롤링 진행 상황 (웹 크롤링 단계, subscribe 시점 + 실시간 업데이트)
    socket.on('review:crawl_progress', (data: any) => {
      console.log('[Socket.io] Crawl Progress:', data)

      const jobId = data.jobId

      // ✅ jobId가 있으면 완료 체크
      if (jobId) {
        if (isCrawlJobCompleted(jobId)) {
          console.warn(`[Socket.io] Ignored - crawl job ${jobId} already completed`)
          return
        }

        // 새로운 Job이면 현재 jobId 업데이트
        if (currentCrawlJobIdRef.current !== jobId) {
          currentCrawlJobIdRef.current = jobId
          console.log(`[Socket.io] New crawl job started: ${jobId}`)
        }
      }

      // ✅ Sequence 체크: 이전 데이터보다 최신인 경우만 업데이트
      const sequence = data.sequence || data.current || 0
      if (sequence < lastCrawlSequenceRef.current) {
        console.warn(`[Socket.io] Outdated crawl progress ignored: ${sequence} < ${lastCrawlSequenceRef.current}`)
        return
      }
      lastCrawlSequenceRef.current = sequence

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

      // ✅ jobId가 있으면 완료 체크 (100% 완료 처리 전)
      if (jobId && isCrawlJobCompleted(jobId)) {
        console.warn(`[Socket.io] Ignored - crawl job ${jobId} already completed`)
        return
      }

      // ✅ Sequence 체크: 이전 데이터보다 최신인 경우만 업데이트
      const sequence = data.sequence || data.current || 0
      if (sequence < lastDbSequenceRef.current) {
        console.warn(`[Socket.io] Outdated db progress ignored: ${sequence} < ${lastDbSequenceRef.current}`)
        return
      }
      lastDbSequenceRef.current = sequence

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
          markCrawlJobAsCompleted(jobId)
          currentCrawlJobIdRef.current = null
        }

        // 모든 진행률 초기화
        setCrawlProgress(null)
        setDbProgress(null)
        setImageProgress(null)
        lastCrawlSequenceRef.current = 0
        lastDbSequenceRef.current = 0
        lastImageSequenceRef.current = 0

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

      // ✅ jobId가 있으면 완료 체크
      if (jobId && isCrawlJobCompleted(jobId)) {
        console.warn(`[Socket.io] Ignored - crawl job ${jobId} already completed`)
        return
      }

      // ✅ Sequence 체크: 이전 데이터보다 최신인 경우만 업데이트
      const sequence = data.sequence || data.current || 0
      if (sequence < lastImageSequenceRef.current) {
        console.warn(`[Socket.io] Outdated image progress ignored: ${sequence} < ${lastImageSequenceRef.current}`)
        return
      }
      lastImageSequenceRef.current = sequence

      // 이미지 처리 진행률 업데이트
      setImageProgress({
        current: data.current || 0,
        total: data.total || 0,
        percentage: data.percentage || 0
      })
    })

    // 크롤링 진행 없음 (subscribe 시점에 활성 Job이 없을 때)
    socket.on('review:no_active_job', (data: any) => {
      console.log('[Socket.io] No Active Crawl Job:', data)
      setCrawlProgress(null)
      setDbProgress(null)
      setImageProgress(null)
      lastCrawlSequenceRef.current = 0 // ✅ Sequence 초기화
      lastDbSequenceRef.current = 0 // ✅ Sequence 초기화
      lastImageSequenceRef.current = 0 // ✅ Sequence 초기화
    })

    // 크롤링 에러
    socket.on('review:error', (data: any) => {
      console.error('[Socket.io] Error:', data)
      const errorMessage = data.error || '크롤링 중 오류가 발생했습니다'
      const jobId = data.jobId

      // ✅ jobId가 있으면 완료로 마킹 (에러도 종료 상태)
      if (jobId) {
        markCrawlJobAsCompleted(jobId)
        currentCrawlJobIdRef.current = null
      }

      setCrawlProgress(null)
      setDbProgress(null)
      setImageProgress(null)
      lastCrawlSequenceRef.current = 0 // ✅ Sequence 초기화
      lastDbSequenceRef.current = 0 // ✅ Sequence 초기화
      lastImageSequenceRef.current = 0 // ✅ Sequence 초기화
      Alert.error('크롤링 실패', errorMessage)

      // 콜백 호출
      if (callbacksRef.current.onReviewCrawlError) {
        callbacksRef.current.onReviewCrawlError({
          restaurantId: data.restaurantId?.toString() || '',
          error: errorMessage
        })
      }
    })

    // 리뷰 요약 진행 (subscribe 시점 + 실시간 업데이트)
    socket.on('review_summary:progress', (data: any) => {
      console.log('[Socket.io] Summary Progress:', data)

      const jobId = data.jobId

      // ✅ jobId가 있으면 완료 체크 (100% 완료 처리 전)
      if (jobId) {
        if (isSummaryJobCompleted(jobId)) {
          console.warn(`[Socket.io] Ignored - summary job ${jobId} already completed`)
          return
        }

        // 새로운 Job이면 현재 jobId 업데이트
        if (currentSummaryJobIdRef.current !== jobId) {
          currentSummaryJobIdRef.current = jobId
          console.log(`[Socket.io] New summary job started: ${jobId}`)
        }
      }

      // ✅ Sequence 체크: 이전 데이터보다 최신인 경우만 업데이트
      const sequence = data.sequence || data.current || 0
      if (sequence < lastSummarySequenceRef.current) {
        console.warn(`[Socket.io] Outdated summary progress ignored: ${sequence} < ${lastSummarySequenceRef.current}`)
        return
      }
      lastSummarySequenceRef.current = sequence

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
          markSummaryJobAsCompleted(jobId)
          currentSummaryJobIdRef.current = null
        }

        setReviewSummaryStatus({ status: 'completed' })
        setSummaryProgress(null)
        lastSummarySequenceRef.current = 0

        // 콜백 호출
        if (callbacksRef.current.onReviewSummaryCompleted) {
          callbacksRef.current.onReviewSummaryCompleted({
            restaurantId: data.restaurantId?.toString() || ''
          })
        }
      }
    })

    // 리뷰 요약 진행 없음 (subscribe 시점에 활성 Job이 없을 때)
    socket.on('review_summary:no_active_job', (data: any) => {
      console.log('[Socket.io] No Active Summary Job:', data)
      setReviewSummaryStatus({ status: 'idle' })
      setSummaryProgress(null)
      lastSummarySequenceRef.current = 0 // ✅ Sequence 초기화
    })

    // 리뷰 요약 에러
    socket.on('review_summary:error', (data: any) => {
      console.error('[Socket.io] Summary Error:', data)
      const errorMessage = data.error || '요약 중 오류가 발생했습니다'
      const jobId = data.jobId

      // ✅ jobId가 있으면 완료로 마킹 (에러도 종료 상태)
      if (jobId) {
        markSummaryJobAsCompleted(jobId)
        currentSummaryJobIdRef.current = null
      }

      setReviewSummaryStatus({ status: 'failed', error: errorMessage })
      setSummaryProgress(null)
      lastSummarySequenceRef.current = 0 // ✅ Sequence 초기화
      Alert.error('요약 실패', errorMessage)
    })

    // ✅ 주기적으로 오래된 완료 Job 정리 (5분마다)
    const cleanupInterval = setInterval(() => {
      cleanupCompletedCrawlJobs()
      cleanupCompletedSummaryJobs()
    }, JOB_RETENTION_MS)

    return () => {
      clearInterval(cleanupInterval)
      socket.off('restaurant:menu_progress')
      socket.off('review:crawl_progress')
      socket.off('review:db_progress')
      socket.off('review:image_progress')
      socket.off('review:no_active_job')
      socket.off('review:error')
      socket.off('review_summary:progress')
      socket.off('review_summary:no_active_job')
      socket.off('review_summary:error')
    }
  }, [])

  // Restaurant room 입장
  const joinRestaurantRoom = (restaurantId: string) => {
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
  }

  // Restaurant room 퇴장
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

  // 콜백 설정 (크롤링 시작 시 호출)
  const setRestaurantCallbacks = (callbacks: {
    onMenuCrawlCompleted?: (data: { restaurantId: string }) => void
    onReviewCrawlCompleted?: (data: { restaurantId: string; totalReviews: number }) => void
    onReviewCrawlError?: (data: { restaurantId: string; error: string }) => void
    onReviewSummaryCompleted?: (data: { restaurantId: string }) => void
  }) => {
    callbacksRef.current = callbacks
  }

  // 크롤링 상태 초기화
  const resetCrawlStatus = () => {
    setMenuProgress(null)
    setCrawlProgress(null)
    setDbProgress(null)
    setImageProgress(null)
    lastCrawlSequenceRef.current = 0 // ✅ Sequence 초기화
    lastDbSequenceRef.current = 0 // ✅ Sequence 초기화
    lastImageSequenceRef.current = 0 // ✅ Sequence 초기화
  }

  // 요약 상태 초기화
  const resetSummaryStatus = () => {
    setReviewSummaryStatus({ status: 'idle' })
    setSummaryProgress(null)
  }

  const value: SocketContextValue = {
    socket: socketRef.current,
    isConnected,
    menuProgress,
    crawlProgress,
    dbProgress,
    imageProgress,
    reviewSummaryStatus,
    summaryProgress,
    joinRestaurantRoom,
    leaveRestaurantRoom,
    setRestaurantCallbacks,
    resetCrawlStatus,
    resetSummaryStatus,
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

