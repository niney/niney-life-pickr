import React from 'react'
import { View, StyleSheet } from 'react-native'
import { getDefaultApiUrl } from '@shared/services'
import type { ReviewImagesProps } from './types'

const ReviewImages: React.FC<ReviewImagesProps> = ({ images }) => {
  if (!images || images.length === 0) return null

  const apiBaseUrl = getDefaultApiUrl()

  return (
    <View style={styles.container}>
      {images.map((imageUrl: string, idx: number) => {
        const fullImageUrl = `${apiBaseUrl}${imageUrl}`

        return (
          <img
            key={idx}
            src={fullImageUrl}
            alt={`리뷰 이미지 ${idx + 1}`}
            style={{
              width: images.length === 1 ? '100%' : 'calc(50% - 6px)',
              height: 200,
              objectFit: 'cover',
              borderRadius: 8,
              cursor: 'pointer',
            }}
            onClick={() => window.open(fullImageUrl, '_blank')}
          />
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
})

export default ReviewImages
