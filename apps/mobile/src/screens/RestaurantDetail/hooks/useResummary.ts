import { useState, useCallback } from 'react';
import { getDefaultApiUrl, Alert } from 'shared';

/**
 * AI model configuration
 */
interface ModelOption {
  value: string;
  label: string;
}

/**
 * Dynamic style generators for modal UI
 */
interface StyleGetters {
  getModelOptionStyle: (modelValue: string) => any;
  getModelTextStyle: (modelValue: string) => any;
  getRadioBorderStyle: (modelValue: string) => any;
}

interface UseResummaryReturn {
  resummaryModalVisible: boolean;
  selectedReviewId: number | null;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  resummaryLoading: boolean;
  availableModels: ModelOption[];
  openResummaryModal: (reviewId: number) => void;
  closeResummaryModal: () => void;
  handleResummarize: (restaurantId: number, fetchReviews: (restaurantId: number) => Promise<void>) => Promise<void>;
  styleGetters: StyleGetters;
}

/**
 * Hook for managing review re-summary modal and AI model selection
 *
 * @param colors - Theme colors object
 * @param theme - Current theme ('light' | 'dark')
 * @returns Modal state, functions, and dynamic style generators
 *
 * @example
 * ```tsx
 * const {
 *   resummaryModalVisible,
 *   selectedModel,
 *   availableModels,
 *   openResummaryModal,
 *   closeResummaryModal,
 *   handleResummarize,
 *   styleGetters
 * } = useResummary(colors, theme);
 *
 * // Open modal
 * <TouchableOpacity onPress={() => openResummaryModal(review.id)}>
 *   <Text>🔄 재요약</Text>
 * </TouchableOpacity>
 *
 * // Use in modal
 * <Modal visible={resummaryModalVisible} onRequestClose={closeResummaryModal}>
 *   {availableModels.map(model => (
 *     <TouchableOpacity style={styleGetters.getModelOptionStyle(model.value)}>
 *       <Text style={styleGetters.getModelTextStyle(model.value)}>{model.label}</Text>
 *     </TouchableOpacity>
 *   ))}
 * </Modal>
 * ```
 */
export const useResummary = (
  colors: any,
  theme: 'light' | 'dark'
): UseResummaryReturn => {
  const [resummaryModalVisible, setResummaryModalVisible] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-oss:20b-cloud');
  const [resummaryLoading, setResummaryLoading] = useState(false);

  // Available AI models
  const availableModels: ModelOption[] = [
    { value: 'gpt-oss:20b-cloud', label: 'GPT OSS 20B (Cloud)' },
    { value: 'gpt-oss:120b-cloud', label: 'GPT OSS 120B (Cloud)' },
    { value: 'deepseek-v3.1:671b-cloud', label: 'DeepSeek v3.1 671B (Cloud)' },
  ];

  /**
   * Opens re-summary modal for a specific review
   *
   * @param reviewId - Review ID to re-summarize
   */
  const openResummaryModal = useCallback((reviewId: number) => {
    setSelectedReviewId(reviewId);
    setResummaryModalVisible(true);
  }, []);

  /**
   * Closes re-summary modal and resets state
   */
  const closeResummaryModal = useCallback(() => {
    setResummaryModalVisible(false);
    setSelectedReviewId(null);
    setSelectedModel('gpt-oss:20b-cloud');
  }, []);

  /**
   * Executes re-summary API call with selected model
   *
   * @param restaurantId - Restaurant ID (for refreshing reviews after)
   * @param fetchReviews - Function to refresh reviews after re-summary
   */
  const handleResummarize = useCallback(async (
    restaurantId: number,
    fetchReviews: (restaurantId: number) => Promise<void>
  ) => {
    if (!selectedReviewId) return;

    setResummaryLoading(true);
    try {
      const apiBaseUrl = getDefaultApiUrl();
      const response = await fetch(`${apiBaseUrl}/api/reviews/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewId: selectedReviewId,
          useCloud: true,
          config: {
            model: selectedModel
          }
        })
      });

      if (!response.ok) {
        console.error('❌ 재요약 요청 실패: HTTP', response.status);
        Alert.error('재요약 실패', '재요약 요청에 실패했습니다.');
        return;
      }

      const result = await response.json();
      console.log('✅ 재요약 완료:', result);

      // Refresh reviews list
      await fetchReviews(restaurantId);

      closeResummaryModal();
    } catch (error) {
      console.error('❌ 재요약 실패:', error);
      Alert.error('오류', '재요약에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setResummaryLoading(false);
    }
  }, [selectedReviewId, selectedModel, closeResummaryModal]);

  /**
   * Dynamic style generators for model selection UI
   * These functions generate styles based on selectedModel state
   */
  const styleGetters: StyleGetters = {
    /**
     * Get background and border style for model option
     */
    getModelOptionStyle: useCallback((modelValue: string) => ({
      backgroundColor: selectedModel === modelValue ? colors.primary : (theme === 'light' ? '#f5f5f5' : colors.background),
      borderColor: selectedModel === modelValue ? colors.primary : colors.border
    }), [selectedModel, colors, theme]),

    /**
     * Get text color style for model option
     */
    getModelTextStyle: useCallback((modelValue: string) => ({
      color: selectedModel === modelValue ? '#fff' : colors.text
    }), [selectedModel, colors]),

    /**
     * Get radio button border style
     */
    getRadioBorderStyle: useCallback((modelValue: string) => ({
      borderColor: selectedModel === modelValue ? '#fff' : colors.border
    }), [selectedModel, colors]),
  };

  return {
    resummaryModalVisible,
    selectedReviewId,
    selectedModel,
    setSelectedModel,
    resummaryLoading,
    availableModels,
    openResummaryModal,
    closeResummaryModal,
    handleResummarize,
    styleGetters,
  };
};
