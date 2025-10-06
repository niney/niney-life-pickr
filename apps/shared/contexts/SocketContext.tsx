import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { Platform } from 'react-native'
import { Alert } from '../utils'

interface CrawlProgress {
  current: number
  total: number
  percentage: number
}

interface ReviewCrawlStatus {
  status: 'idle' | 'active' | 'completed' | 'failed'
  error?: string
  reviews: any[]
}

interface SocketContextValue {
  socket: Socket | null
  isConnected: boolean
  reviewCrawlStatus: ReviewCrawlStatus
  crawlProgress: CrawlProgress | null
  dbProgress: CrawlProgress | null
  joinPlaceRoom: (placeId: string) => void
  leavePlaceRoom: (placeId: string) => void
  setPlaceCallbacks: (callbacks: {
    onCompleted?: (data: { placeId: string; totalReviews: number }) => void
    onError?: (data: { placeId: string; error: string }) => void
  }) => void
  resetCrawlStatus: () => void
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined)

interface SocketProviderProps {
  children: React.ReactNode
  serverUrl?: string
}

/**
 * 환경에 따른 서버 URL 결정
 * - Web: 현재 호스트 사용 (동일 도메인)
 * - Android: 10.0.2.2 (에뮬레이터) 또는 실제 IP
 * - iOS: localhost
 */
const getServerUrl = (customUrl?: string): string => {
  if (customUrl) return customUrl

  const isWeb = Platform.OS === 'web'
  
  if (isWeb) {
    // Web: 현재 호스트의 4000 포트 사용
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol
      const hostname = window.location.hostname
      return `${protocol}//${hostname}:4000`
    }
    return 'http://localhost:4000'
  }

  // Android: 에뮬레이터는 10.0.2.2, 실제 기기는 환경변수나 설정 필요
  if (Platform.OS === 'android') {
    // 개발 중: 에뮬레이터
    return 'http://10.0.2.2:4000'
    // 실제 기기 테스트 시: process.env나 config에서 IP 가져오기
    // return `http://${YOUR_DEV_MACHINE_IP}:4000`
  }

  // iOS: localhost 사용
  return 'http://localhost:4000'
}

export const SocketProvider: React.FC<SocketProviderProps> = ({
  children,
  serverUrl
}) => {
  const resolvedServerUrl = getServerUrl(serverUrl)
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [reviewCrawlStatus, setReviewCrawlStatus] = useState<ReviewCrawlStatus>({
    status: 'idle',
    reviews: []
  })
  const [crawlProgress, setCrawlProgress] = useState<CrawlProgress | null>(null)
  const [dbProgress, setDbProgress] = useState<CrawlProgress | null>(null)
  const callbacksRef = useRef<{
    onCompleted?: (data: { placeId: string; totalReviews: number }) => void
    onError?: (data: { placeId: string; error: string }) => void
  }>({})
  const currentPlaceIdRef = useRef<string | null>(null)

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

    // 크롤링 진행 상황
    socket.on('review:crawl_progress', (data: any) => {
      console.log('[Socket.io] Crawl Progress:', data)
      setCrawlProgress({
        current: data.current,
        total: data.total,
        percentage: data.percentage
      })
      setReviewCrawlStatus(prev => ({ ...prev, status: 'active' }))
    })

    // DB 저장 진행 상황
    socket.on('review:db_progress', (data: any) => {
      console.log('[Socket.io] DB Progress:', data)
      setDbProgress({
        current: data.current,
        total: data.total,
        percentage: data.percentage
      })
      setReviewCrawlStatus(prev => ({ ...prev, status: 'active' }))
    })

    // 크롤링 완료
    socket.on('review:completed', (data: any) => {
      console.log('[Socket.io] Completed:', data)
      setReviewCrawlStatus({ status: 'completed', reviews: [] })
      setCrawlProgress(null)
      setDbProgress(null)

      // 콜백 호출
      if (callbacksRef.current.onCompleted) {
        callbacksRef.current.onCompleted({
          placeId: data.placeId,
          totalReviews: data.totalReviews || 0
        })
      }
    })

    // 크롤링 에러
    socket.on('review:error', (data: any) => {
      console.error('[Socket.io] Error:', data)
      const errorMessage = data.error || '크롤링 중 오류가 발생했습니다'
      setReviewCrawlStatus({ status: 'failed', error: errorMessage, reviews: [] })
      setCrawlProgress(null)
      setDbProgress(null)
      Alert.error('크롤링 실패', errorMessage)

      // 콜백 호출
      if (callbacksRef.current.onError) {
        callbacksRef.current.onError({
          placeId: data.placeId,
          error: errorMessage
        })
      }
    })

    return () => {
      socket.off('review:crawl_progress')
      socket.off('review:db_progress')
      socket.off('review:completed')
      socket.off('review:error')
    }
  }, [])

  // Place room 입장
  const joinPlaceRoom = (placeId: string) => {
    const socket = socketRef.current
    if (!socket) {
      console.error('[Socket.io] Socket not initialized')
      return
    }

    // 이전 room 퇴장
    if (currentPlaceIdRef.current && currentPlaceIdRef.current !== placeId) {
      socket.emit('unsubscribe:place', currentPlaceIdRef.current)
      console.log(`[Socket.io] Left room: place:${currentPlaceIdRef.current}`)
    }

    currentPlaceIdRef.current = placeId

    // 새 room 입장
    socket.emit('subscribe:place', placeId)
    console.log(`[Socket.io] Joined room: place:${placeId}`)
  }

  // Place room 퇴장
  const leavePlaceRoom = (placeId: string) => {
    const socket = socketRef.current
    if (!socket) return

    socket.emit('unsubscribe:place', placeId)
    console.log(`[Socket.io] Left room: place:${placeId}`)

    if (currentPlaceIdRef.current === placeId) {
      currentPlaceIdRef.current = null
      callbacksRef.current = {}
    }
  }

  // 콜백 설정 (크롤링 시작 시 호출)
  const setPlaceCallbacks = (callbacks: {
    onCompleted?: (data: { placeId: string; totalReviews: number }) => void
    onError?: (data: { placeId: string; error: string }) => void
  }) => {
    callbacksRef.current = callbacks
  }

  // 크롤링 상태 초기화
  const resetCrawlStatus = () => {
    setReviewCrawlStatus({ status: 'idle', reviews: [] })
    setCrawlProgress(null)
    setDbProgress(null)
  }

  const value: SocketContextValue = {
    socket: socketRef.current,
    isConnected,
    reviewCrawlStatus,
    crawlProgress,
    dbProgress,
    joinPlaceRoom,
    leavePlaceRoom,
    setPlaceCallbacks,
    resetCrawlStatus,
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

