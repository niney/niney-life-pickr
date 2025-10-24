import React from 'react'
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, StyleSheet } from 'react-native'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'

interface ModelOption {
  value: string
  label: string
}

interface ResummaryModalProps {
  visible: boolean
  selectedModel: string
  availableModels: ModelOption[]
  resummaryLoading: boolean
  onClose: () => void
  onSelectModel: (model: string) => void
  onConfirm: () => void
}

const ResummaryModal: React.FC<ResummaryModalProps> = ({
  visible,
  selectedModel,
  availableModels,
  resummaryLoading,
  onClose,
  onSelectModel,
  onConfirm,
}) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>AI 모델 선택</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            리뷰를 재요약할 AI 모델을 선택하세요
          </Text>

          <View style={styles.modelList}>
            {availableModels.map((model) => (
              <TouchableOpacity
                key={model.value}
                style={[
                  styles.modelOption,
                  {
                    backgroundColor:
                      selectedModel === model.value
                        ? colors.primary
                        : theme === 'light'
                          ? '#f5f5f5'
                          : colors.background,
                    borderColor:
                      selectedModel === model.value ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => onSelectModel(model.value)}
              >
                <View style={styles.radioButton}>
                  {selectedModel === model.value && (
                    <View style={[styles.radioButtonInner, { backgroundColor: '#fff' }]} />
                  )}
                </View>
                <Text
                  style={[
                    styles.modelLabel,
                    { color: selectedModel === model.value ? '#fff' : colors.text },
                  ]}
                >
                  {model.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={onClose}
              disabled={resummaryLoading}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton, { backgroundColor: colors.primary }]}
              onPress={onConfirm}
              disabled={resummaryLoading}
            >
              {resummaryLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>재요약 시작</Text>
              )}
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
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  modelList: {
    gap: 12,
    marginBottom: 24,
  },
  modelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    cursor: 'pointer',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  modelLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmButton: {
    minHeight: 48,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
})

export default ResummaryModal
