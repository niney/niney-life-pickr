import React from 'react'
import { View, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native'
import { getDefaultApiUrl } from 'shared'

interface ReviewImagesProps {
  images: string[]
  onImagePress: (images: string[], index: number) => void
}

/**
 * Review images gallery component
 * Displays single full-width image or horizontal scrollable gallery
 *
 * ⚡ 성능 최적화: React.memo 적용 + 이미지 최적화
 */
const ReviewImagesComponent: React.FC<ReviewImagesProps> = ({
  images,
  onImagePress,
}) => {
  if (!images || images.length === 0) {
    return null
  }

  return (
    <View style={styles.reviewImagesContainer}>
      {images.length === 1 ? (
        <TouchableOpacity
          onPress={() => onImagePress(images, 0)}
          activeOpacity={0.9}
        >
          <Image
            source={{
              uri: `${getDefaultApiUrl()}${images[0]}`,
              cache: 'force-cache', // 캐시 강제 사용
            }}
            style={styles.reviewImageFull}
            resizeMode="cover"
            resizeMethod="resize" // 디코딩 전 리사이즈로 메모리 절약
            fadeDuration={0} // Android에서 페이드 제거로 성능 향상
          />
        </TouchableOpacity>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.reviewImagesScrollView}
          contentContainerStyle={styles.reviewImagesScrollContent}
          removeClippedSubviews={true} // 화면 밖 뷰 제거로 메모리 절약
          scrollEventThrottle={16}
          decelerationRate="fast"
        >
          {images.map((imageUrl: string, idx: number) => (
            <TouchableOpacity
              key={idx}
              onPress={() => onImagePress(images, idx)}
              activeOpacity={0.9}
            >
              <Image
                source={{
                  uri: `${getDefaultApiUrl()}${imageUrl}`,
                  cache: 'force-cache', // 캐시 강제 사용
                }}
                style={styles.reviewImageScroll}
                resizeMode="cover"
                resizeMethod="resize" // 디코딩 전 리사이즈로 메모리 절약
                fadeDuration={0} // Android에서 페이드 제거로 성능 향상
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

export const ReviewImages = React.memo(ReviewImagesComponent)

const styles = StyleSheet.create({
  reviewImagesContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  reviewImageFull: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  reviewImagesScrollView: {
    marginHorizontal: -16, // 카드 패딩 상쇄
  },
  reviewImagesScrollContent: {
    paddingHorizontal: 16,
    gap: 4,
  },
  reviewImageScroll: {
    width: 160,
    height: 120,
    borderRadius: 12,
    marginRight: 4,
  },
})
