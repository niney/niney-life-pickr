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
 */
export const ReviewImages: React.FC<ReviewImagesProps> = ({
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
            source={{ uri: `${getDefaultApiUrl()}${images[0]}` }}
            style={styles.reviewImageFull}
            resizeMode="cover"
          />
        </TouchableOpacity>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.reviewImagesScrollView}
          contentContainerStyle={styles.reviewImagesScrollContent}
        >
          {images.map((imageUrl: string, idx: number) => (
            <TouchableOpacity
              key={idx}
              onPress={() => onImagePress(images, idx)}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: `${getDefaultApiUrl()}${imageUrl}` }}
                style={styles.reviewImageScroll}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

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
