import { useState, useCallback } from 'react'

export const useKeywordToggle = () => {
  const [expandedKeywords, setExpandedKeywords] = useState<Set<number>>(new Set())

  const toggleKeywords = useCallback((reviewId: number) => {
    setExpandedKeywords((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId)
      } else {
        newSet.add(reviewId)
      }
      return newSet
    })
  }, [])

  return { expandedKeywords, toggleKeywords }
}
