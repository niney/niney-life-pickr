import React from 'react'
import { View } from 'react-native'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import type { ReviewHeaderProps } from './types'

const ReviewHeader: React.FC<ReviewHeaderProps> = ({ userName, visitDate, onResummary }) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <span
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: colors.text,
          }}
        >
          {userName || '익명'}
        </span>
        {visitDate && (
          <span
            style={{
              fontSize: 13,
              color: colors.textSecondary,
              display: 'block',
            }}
          >
            {visitDate}
          </span>
        )}
      </View>
      {/* 재요약 버튼 */}
      <button
        onClick={onResummary}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingLeft: 8,
          paddingRight: 8,
          paddingTop: 4,
          paddingBottom: 4,
          borderRadius: 6,
          backgroundColor: 'rgba(156, 39, 176, 0.1)',
          cursor: 'pointer',
          border: 'none',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: '600', color: '#9c27b0' }}>🔄 재요약</span>
      </button>
    </View>
  )
}

export default ReviewHeader
