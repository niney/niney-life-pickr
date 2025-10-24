import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import { ProgressIndicator } from '@shared/components'

interface ProgressData {
  current: number
  total: number
  percentage?: number
}

interface CrawlProgressCardProps {
  menuProgress: ProgressData | null
  crawlProgress: ProgressData | null
  imageProgress: ProgressData | null
  dbProgress: ProgressData | null
}

const CrawlProgressCard: React.FC<CrawlProgressCardProps> = ({
  menuProgress,
  crawlProgress,
  imageProgress,
  dbProgress,
}) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme === 'light' ? '#fff' : colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>🔄 크롤링 중...</Text>

      {menuProgress && menuProgress.total > 0 && (
        <ProgressIndicator
          label="메뉴 수집"
          current={menuProgress.current}
          total={menuProgress.total}
          percentage={menuProgress.percentage}
          color="#4caf50"
        />
      )}

      {crawlProgress && (
        <ProgressIndicator
          label="크롤링 진행"
          current={crawlProgress.current}
          total={crawlProgress.total}
          percentage={crawlProgress.percentage}
          color="#2196f3"
        />
      )}

      {imageProgress && (
        <ProgressIndicator
          label="이미지 처리"
          current={imageProgress.current}
          total={imageProgress.total}
          percentage={imageProgress.percentage}
          color="#ff9800"
        />
      )}

      {dbProgress && (
        <ProgressIndicator
          label="DB 저장"
          current={dbProgress.current}
          total={dbProgress.total}
          percentage={dbProgress.percentage}
          color={colors.primary}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    marginHorizontal: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
})

export default CrawlProgressCard
