import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import { ProgressIndicator } from '@shared/components'

interface SummaryProgressData {
  current: number
  total: number
  percentage?: number
  completed: number
  failed: number
}

interface SummaryProgressCardProps {
  summaryProgress: SummaryProgressData | null
}

const SummaryProgressCard: React.FC<SummaryProgressCardProps> = ({ summaryProgress }) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]

  if (!summaryProgress) return null

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
      <Text style={[styles.title, { color: colors.text }]}>🤖 AI 리뷰 요약 중...</Text>

      <ProgressIndicator
        label="요약 진행"
        current={summaryProgress.current}
        total={summaryProgress.total}
        percentage={summaryProgress.percentage}
        color="#9c27b0"
      />

      <View style={styles.statsContainer}>
        <Text style={[styles.stat, { color: '#4caf50' }]}>
          ✓ 완료: {summaryProgress.completed}
        </Text>
        {summaryProgress.failed > 0 && (
          <Text style={[styles.stat, { color: '#f44336' }]}>
            ✗ 실패: {summaryProgress.failed}
          </Text>
        )}
      </View>
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
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  stat: {
    fontSize: 13,
    fontWeight: '500',
  },
})

export default SummaryProgressCard
