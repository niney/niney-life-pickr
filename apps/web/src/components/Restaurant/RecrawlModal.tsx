import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator } from 'react-native'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'

interface RecrawlModalProps {
  visible: boolean
  onClose: () => void
  onConfirm: (options: { crawlMenus: boolean; crawlReviews: boolean; createSummary: boolean }) => Promise<void>
  restaurantName: string
}

const RecrawlModal: React.FC<RecrawlModalProps> = ({
  visible,
  onClose,
  onConfirm,
  restaurantName
}) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]

  const [crawlMenus, setCrawlMenus] = useState(false)
  const [crawlReviews, setCrawlReviews] = useState(false)
  const [createSummary, setCrawlSummary] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!crawlMenus && !crawlReviews && !createSummary) {
      alert('최소 하나 이상 선택해주세요')
      return
    }

    setLoading(true)
    try {
      await onConfirm({ crawlMenus, crawlReviews, createSummary })
      onClose()
      // 상태 초기화
      setCrawlMenus(false)
      setCrawlReviews(false)
      setCrawlSummary(false)
    } catch (error) {
      console.error('재크롤링 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            재크롤링
          </Text>
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
            {restaurantName}
          </Text>

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => setCrawlMenus(!crawlMenus)}
            >
              <View style={[styles.checkbox, crawlMenus && { backgroundColor: colors.primary }]}>
                {crawlMenus && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>메뉴</Text>
                <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                  메뉴 정보를 다시 크롤링합니다
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => setCrawlReviews(!crawlReviews)}
            >
              <View style={[styles.checkbox, crawlReviews && { backgroundColor: colors.primary }]}>
                {crawlReviews && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>리뷰</Text>
                <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                  리뷰를 다시 크롤링합니다
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => setCrawlSummary(!createSummary)}
            >
              <View style={[styles.checkbox, createSummary && { backgroundColor: colors.primary }]}>
                {createSummary && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>요약</Text>
                <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                  AI 리뷰 요약을 생성합니다
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton, { backgroundColor: colors.primary }]}
              onPress={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.buttonText, { color: '#fff' }]}>확인</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {},
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
})

export default RecrawlModal
