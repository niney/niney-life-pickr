import React, { useState } from 'react'
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native'
import { useTheme } from 'shared/contexts'
import { THEME_COLORS } from 'shared/constants'

interface RecrawlModalProps {
  visible: boolean
  onClose: () => void
  onConfirm: (options: { crawlMenus: boolean; crawlReviews: boolean; createSummary: boolean; resetSummary?: boolean }) => void
  restaurantName: string
}

const RecrawlModal: React.FC<RecrawlModalProps> = ({ visible, onClose, onConfirm, restaurantName }) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]
  const [crawlMenus, setCrawlMenus] = useState(false)
  const [crawlReviews, setCrawlReviews] = useState(false)
  const [createSummary, setCreateSummary] = useState(false)
  const [resetSummary, setResetSummary] = useState(false)

  const handleConfirm = () => {
    onConfirm({
      crawlMenus,
      crawlReviews,
      createSummary,
      resetSummary: createSummary && resetSummary
    })
    onClose()
    setCrawlMenus(false)
    setCrawlReviews(false)
    setCreateSummary(false)
    setResetSummary(false)
  }

  const handleClose = () => {
    onClose()
    setCrawlMenus(false)
    setCrawlReviews(false)
    setCreateSummary(false)
    setResetSummary(false)
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>재크롤링</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{restaurantName}</Text>

          <View style={styles.optionsContainer}>
            <TouchableOpacity style={styles.checkboxRow} onPress={() => setCrawlMenus(!crawlMenus)}>
              <View style={[styles.checkbox, { borderColor: colors.border }]}>
                {crawlMenus && <View style={[styles.checkboxInner, { backgroundColor: colors.primary }]} />}
              </View>
              <Text style={[styles.checkboxLabel, { color: colors.text }]}>메뉴 크롤링</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.checkboxRow} onPress={() => setCrawlReviews(!crawlReviews)}>
              <View style={[styles.checkbox, { borderColor: colors.border }]}>
                {crawlReviews && <View style={[styles.checkboxInner, { backgroundColor: colors.primary }]} />}
              </View>
              <Text style={[styles.checkboxLabel, { color: colors.text }]}>리뷰 크롤링</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.checkboxRow} onPress={() => setCreateSummary(!createSummary)}>
              <View style={[styles.checkbox, { borderColor: colors.border }]}>
                {createSummary && <View style={[styles.checkboxInner, { backgroundColor: colors.primary }]} />}
              </View>
              <Text style={[styles.checkboxLabel, { color: colors.text }]}>리뷰 요약 생성</Text>
            </TouchableOpacity>

            {/* resetSummary 옵션 - createSummary가 true일 때만 표시 */}
            {createSummary && (
              <TouchableOpacity style={[styles.checkboxRow, styles.resetSummaryRow]} onPress={() => setResetSummary(!resetSummary)}>
                <View style={[styles.checkbox, { borderColor: colors.border }]}>
                  {resetSummary && <View style={[styles.checkboxInner, { backgroundColor: colors.primary }]} />}
                </View>
                <View style={styles.resetSummaryContent}>
                  <Text style={[styles.checkboxLabel, { color: colors.text }]}>기존 요약 지우고 다시 생성</Text>
                  <Text style={[styles.resetSummaryDescription, { color: colors.textSecondary }]}>모든 요약을 삭제한 후 처음부터 생성합니다</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]} onPress={handleClose}>
              <Text style={[styles.buttonText, { color: colors.text }]}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleConfirm}
              disabled={!crawlMenus && !crawlReviews && !createSummary}
            >
              <Text style={[styles.buttonText, { color: '#fff', opacity: !crawlMenus && !crawlReviews && !createSummary ? 0.5 : 1 }]}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 24,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxInner: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  checkboxLabel: {
    fontSize: 16,
  },
  resetSummaryRow: {
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(0, 0, 0, 0.1)',
    marginTop: 8,
    paddingTop: 12,
    paddingBottom: 4,
  },
  resetSummaryContent: {
    flex: 1,
  },
  resetSummaryDescription: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '400',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
})

export default RecrawlModal
