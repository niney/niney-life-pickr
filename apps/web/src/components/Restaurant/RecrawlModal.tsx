import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, TextInput } from 'react-native'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'

interface RecrawlModalProps {
  visible: boolean
  onClose: () => void
  onConfirm: (options: {
    crawlMenus: boolean
    crawlReviews: boolean
    createSummary: boolean
    resetSummary?: boolean
    useQueue?: boolean  // ✅ Queue 사용 여부
    catchtableId?: string  // ✅ 캐치테이블 ID
    crawlCatchtableReviews?: boolean  // ✅ 캐치테이블 리뷰 크롤링
  }) => Promise<void>
  restaurantName: string
  currentCatchtableId?: string | null  // ✅ 현재 캐치테이블 ID
}

const RecrawlModal: React.FC<RecrawlModalProps> = ({
  visible,
  onClose,
  onConfirm,
  restaurantName,
  currentCatchtableId
}) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]

  const [crawlMenus, setCrawlMenus] = useState(false)
  const [crawlReviews, setCrawlReviews] = useState(false)
  const [createSummary, setCrawlSummary] = useState(false)
  const [resetSummary, setResetSummary] = useState(false)
  const [useQueue, setUseQueue] = useState(false) // ✅ Queue 사용 여부
  const [catchtableId, setCatchtableId] = useState('') // ✅ 캐치테이블 ID
  const [crawlCatchtableReviews, setCrawlCatchtableReviews] = useState(false) // ✅ 캐치테이블 리뷰 크롤링
  const [loading, setLoading] = useState(false)

  // ✅ 모달이 열릴 때 현재 캐치테이블 ID로 초기화 (없으면 빈 문자열)
  useEffect(() => {
    if (visible) {
      setCatchtableId(currentCatchtableId || '')
    }
  }, [visible, currentCatchtableId])

  // ✅ 캐치테이블 ID 변경 여부 확인
  const isCatchtableIdChanged = catchtableId !== (currentCatchtableId || '')

  const handleConfirm = async () => {
    // ✅ 재크롤링 옵션 또는 캐치테이블 ID 변경이 있어야 함
    if (!crawlMenus && !crawlReviews && !createSummary && !crawlCatchtableReviews && !isCatchtableIdChanged) {
      alert('최소 하나 이상 선택하거나 캐치테이블 ID를 변경해주세요')
      return
    }

    // ✅ 캐치테이블 리뷰 크롤링은 캐치테이블 ID가 필요함
    if (crawlCatchtableReviews && !catchtableId && !currentCatchtableId) {
      alert('캐치테이블 리뷰 크롤링을 위해 캐치테이블 ID가 필요합니다')
      return
    }

    setLoading(true)
    try {
      await onConfirm({
        crawlMenus,
        crawlReviews,
        createSummary,
        resetSummary: createSummary && resetSummary,
        useQueue, // ✅ Queue 사용 여부 전달
        catchtableId: isCatchtableIdChanged ? catchtableId : undefined, // ✅ 변경된 경우만 전달
        crawlCatchtableReviews, // ✅ 캐치테이블 리뷰 크롤링
      })
      onClose()
      // 상태 초기화
      setCrawlMenus(false)
      setCrawlReviews(false)
      setCrawlSummary(false)
      setResetSummary(false)
      setUseQueue(false)
      setCatchtableId('')
      setCrawlCatchtableReviews(false)
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

          {/* ✅ 캐치테이블 ID 입력 섹션 */}
          <View style={styles.catchtableSection}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>
              캐치테이블 ID
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  color: colors.text,
                  backgroundColor: colors.background,
                  borderColor: isCatchtableIdChanged ? colors.primary : colors.border
                }
              ]}
              value={catchtableId}
              onChangeText={setCatchtableId}
              placeholder="캐치테이블 ID 입력"
              placeholderTextColor={colors.textSecondary}
            />
            {isCatchtableIdChanged && (
              <Text style={[styles.changeIndicator, { color: colors.primary }]}>
                ✓ 변경됨
              </Text>
            )}

            {/* ✅ 캐치테이블 리뷰 크롤링 체크박스 */}
            <TouchableOpacity
              style={[styles.optionRow, { marginTop: 12 }]}
              onPress={() => setCrawlCatchtableReviews(!crawlCatchtableReviews)}
              disabled={!catchtableId && !currentCatchtableId}
            >
              <View style={[
                styles.checkbox,
                crawlCatchtableReviews && { backgroundColor: colors.primary },
                (!catchtableId && !currentCatchtableId) && { opacity: 0.5 }
              ]}>
                {crawlCatchtableReviews && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.optionText}>
                <Text style={[
                  styles.optionTitle,
                  { color: colors.text },
                  (!catchtableId && !currentCatchtableId) && { opacity: 0.5 }
                ]}>
                  캐치테이블 리뷰
                </Text>
                <Text style={[
                  styles.optionDescription,
                  { color: colors.textSecondary },
                  (!catchtableId && !currentCatchtableId) && { opacity: 0.5 }
                ]}>
                  캐치테이블에서 리뷰를 가져옵니다 (최대 300개)
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionDivider} />

          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            재크롤링 옵션
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

            {/* resetSummary 옵션 - createSummary가 true일 때만 표시 */}
            {createSummary && (
              <TouchableOpacity
                style={[styles.optionRow, styles.resetSummaryOption]}
                onPress={() => setResetSummary(!resetSummary)}
              >
                <View style={[styles.checkbox, resetSummary && { backgroundColor: colors.primary }]}>
                  {resetSummary && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <View style={styles.optionText}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>기존 요약 지우기</Text>
                  <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                    모든 요약을 삭제한 후 처음부터 생성합니다
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* ✅ Queue 옵션 - 리뷰 크롤링이 선택되었을 때만 표시 */}
            {crawlReviews && (
              <View style={styles.queueSection}>
                <View style={styles.queueDivider} />
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => setUseQueue(!useQueue)}
                >
                  <View style={[styles.checkbox, useQueue && { backgroundColor: colors.primary }]}>
                    {useQueue && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionTitle, { color: colors.text }]}>
                      대기열에 추가 🔄
                    </Text>
                    <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                      순차적으로 처리됩니다 (중복 방지, 서버 부하 감소)
                    </Text>
                  </View>
                </TouchableOpacity>
                {!useQueue && (
                  <Text style={[styles.queueWarning, { color: '#ff9800' }]}>
                    ⚠️ 병렬 처리: 즉시 실행되지만 동시 크롤링으로 서버 부하가 발생할 수 있습니다
                  </Text>
                )}
              </View>
            )}
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
    marginBottom: 16,
  },
  catchtableSection: {
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  changeIndicator: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginVertical: 16,
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  resetSummaryOption: {
    paddingLeft: 12,
    paddingTop: 12,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(0, 0, 0, 0.1)',
    marginTop: 8,
  },
  queueSection: {
    marginTop: 8,
  },
  queueDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginVertical: 16,
  },
  queueWarning: {
    fontSize: 12,
    marginTop: 8,
    marginLeft: 36,
    lineHeight: 18,
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
