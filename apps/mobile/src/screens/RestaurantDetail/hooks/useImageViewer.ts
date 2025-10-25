import { useState, useCallback } from 'react';
import { getDefaultApiUrl } from 'shared';

/**
 * useImageViewer Hook
 *
 * 이미지 뷰어 모달 상태를 관리하는 훅
 * react-native-image-viewing 라이브러리와 함께 사용
 *
 * @returns {Object} 이미지 뷰어 상태 및 핸들러
 * @returns {boolean} imageViewerVisible - 이미지 뷰어 모달 표시 여부
 * @returns {number} imageViewerIndex - 현재 표시 중인 이미지 인덱스
 * @returns {string[]} imageViewerUrls - 뷰어에 표시할 이미지 URL 배열
 * @returns {Function} handleImagePress - 이미지 클릭 핸들러
 * @returns {Function} closeImageViewer - 이미지 뷰어 닫기 핸들러
 *
 * @example
 * ```tsx
 * const { imageViewerVisible, imageViewerIndex, imageViewerUrls, handleImagePress, closeImageViewer } = useImageViewer();
 *
 * // 이미지 클릭 시
 * <TouchableOpacity onPress={() => handleImagePress(review.images, 0)}>
 *   <Image source={{ uri: review.images[0] }} />
 * </TouchableOpacity>
 *
 * // 이미지 뷰어 모달
 * <ImageViewing
 *   images={imageViewerUrls.map(uri => ({ uri }))}
 *   imageIndex={imageViewerIndex}
 *   visible={imageViewerVisible}
 *   onRequestClose={closeImageViewer}
 * />
 * ```
 */
export const useImageViewer = () => {
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const [imageViewerUrls, setImageViewerUrls] = useState<string[]>([]);

  /**
   * 이미지 클릭 핸들러
   * - 상대 경로를 절대 경로로 변환
   * - 뷰어 상태 설정 및 모달 표시
   *
   * @param {string[]} images - 이미지 경로 배열 (상대 경로)
   * @param {number} index - 클릭한 이미지의 인덱스
   */
  const handleImagePress = useCallback((images: string[], index: number) => {
    const apiBaseUrl = getDefaultApiUrl();
    const fullUrls = images.map(img => `${apiBaseUrl}${img}`);
    setImageViewerUrls(fullUrls);
    setImageViewerIndex(index);
    setImageViewerVisible(true);
  }, []);

  /**
   * 이미지 뷰어 모달 닫기
   */
  const closeImageViewer = useCallback(() => {
    setImageViewerVisible(false);
  }, []);

  return {
    imageViewerVisible,
    imageViewerIndex,
    imageViewerUrls,
    handleImagePress,
    closeImageViewer,
  };
};
