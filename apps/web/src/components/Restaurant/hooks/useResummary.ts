import { useState, useCallback } from 'react'
import { getDefaultApiUrl } from '@shared/services'

export const useResummary = () => {
  const [resummaryModalVisible, setResummaryModalVisible] = useState(false)
  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(null)
  const [selectedModel, setSelectedModel] = useState<string>('gpt-oss:20b-cloud')
  const [resummaryLoading, setResummaryLoading] = useState(false)

  const availableModels = [
    { value: 'gpt-oss:20b-cloud', label: 'GPT OSS 20B (Cloud)' },
    { value: 'gpt-oss:120b-cloud', label: 'GPT OSS 120B (Cloud)' },
    { value: 'deepseek-v3.1:671b-cloud', label: 'DeepSeek v3.1 671B (Cloud)' },
  ]

  const openResummaryModal = useCallback((reviewId: number) => {
    setSelectedReviewId(reviewId)
    setResummaryModalVisible(true)
  }, [])

  const closeResummaryModal = useCallback(() => {
    setResummaryModalVisible(false)
    setSelectedReviewId(null)
    setSelectedModel('gpt-oss:20b-cloud')
  }, [])

  const handleResummarize = useCallback(
    async (onSuccess: () => Promise<void>) => {
      if (!selectedReviewId) return

      setResummaryLoading(true)
      try {
        const apiBaseUrl = getDefaultApiUrl()
        const response = await fetch(`${apiBaseUrl}/api/reviews/summarize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reviewId: selectedReviewId,
            useCloud: true,
            config: {
              model: selectedModel,
            },
          }),
        })

        if (!response.ok) {
          console.error('❌ 재요약 요청 실패: HTTP', response.status)
          alert('재요약 요청에 실패했습니다.')
          return
        }

        const result = await response.json()
        console.log('✅ 재요약 완료:', result)

        // 리뷰 목록 갱신
        await onSuccess()

        closeResummaryModal()
      } catch (error) {
        console.error('❌ 재요약 실패:', error)
        alert('재요약에 실패했습니다. 다시 시도해주세요.')
      } finally {
        setResummaryLoading(false)
      }
    },
    [selectedReviewId, selectedModel, closeResummaryModal]
  )

  return {
    resummaryModalVisible,
    selectedReviewId,
    selectedModel,
    resummaryLoading,
    availableModels,
    openResummaryModal,
    closeResummaryModal,
    setSelectedModel,
    handleResummarize,
  }
}
