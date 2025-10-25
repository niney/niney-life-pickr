import { useState, useCallback } from 'react';

/**
 * useKeywordToggle Hook
 *
 * 리뷰별 핵심 키워드 표시 상태를 관리하는 훅
 * 각 리뷰 ID별로 키워드 확장/축소 상태를 추적
 *
 * @returns {Object} 키워드 토글 상태 및 핸들러
 * @returns {Set<number>} expandedKeywords - 확장된 키워드를 가진 리뷰 ID Set
 * @returns {Function} toggleKeywords - 특정 리뷰의 키워드 확장/축소 토글
 *
 * @example
 * ```tsx
 * const { expandedKeywords, toggleKeywords } = useKeywordToggle();
 *
 * // 리뷰 카드에서 사용
 * <TouchableOpacity onPress={() => toggleKeywords(review.id)}>
 *   <Text>핵심 키워드 {expandedKeywords.has(review.id) ? '▼' : '▶'}</Text>
 * </TouchableOpacity>
 * ```
 */
export const useKeywordToggle = () => {
  // 확장된 키워드를 가진 리뷰 ID 관리 (Set 사용)
  const [expandedKeywords, setExpandedKeywords] = useState<Set<number>>(new Set());

  /**
   * 특정 리뷰의 핵심 키워드 표시 상태를 토글
   * - 이미 확장된 경우: Set에서 제거 (축소)
   * - 축소된 경우: Set에 추가 (확장)
   *
   * @param {number} reviewId - 토글할 리뷰 ID
   */
  const toggleKeywords = useCallback((reviewId: number) => {
    setExpandedKeywords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId);
      } else {
        newSet.add(reviewId);
      }
      return newSet;
    });
  }, []);

  return {
    expandedKeywords,
    toggleKeywords,
  };
};
