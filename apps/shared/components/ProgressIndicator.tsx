import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '../contexts'
import { THEME_COLORS } from '../constants'

export interface ProgressIndicatorProps {
  label: string
  current: number
  total: number
  percentage?: number
  color?: string
  showPercentage?: boolean
}

/**
 * 재사용 가능한 진행률 표시 컴포넌트
 *
 * @example
 * ```tsx
 * <ProgressIndicator
 *   label="메뉴 수집"
 *   current={5}
 *   total={10}
 *   color="#4caf50"
 * />
 * ```
 */
export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  label,
  current,
  total,
  percentage,
  color,
  showPercentage = true,
}) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]

  // percentage가 명시적으로 제공되지 않으면 계산
  const calculatedPercentage = percentage ?? (total > 0 ? Math.round((current / total) * 100) : 0)

  // 진행률 색상: props로 지정되거나 기본 primary 색상
  const progressColor = color || colors.primary

  return (
    <View style={[styles.progressCard, { backgroundColor: theme === 'light' ? '#fff' : colors.surface, borderColor: colors.border }]}>
      <View style={styles.progressHeader}>
        <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.progressValue, { color: colors.text }]}>
          {current} / {total}
        </Text>
      </View>

      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${Math.min(calculatedPercentage, 100)}%`,
              backgroundColor: progressColor
            }
          ]}
        />
      </View>

      {showPercentage && (
        <Text style={[styles.progressPercentage, { color: colors.textSecondary }]}>
          {calculatedPercentage}%
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  progressCard: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 13,
    textAlign: 'right',
  },
})
