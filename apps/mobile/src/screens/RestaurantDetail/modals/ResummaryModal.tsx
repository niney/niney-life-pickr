import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';

/**
 * AI model option
 */
interface ModelOption {
  value: string;
  label: string;
}

interface ResummaryModalProps {
  visible: boolean;
  onClose: () => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  availableModels: ModelOption[];
  onConfirm: () => Promise<void>;
  loading: boolean;
  colors: any;
  getModelOptionStyle: (modelValue: string) => any;
  getModelTextStyle: (modelValue: string) => any;
  getRadioBorderStyle: (modelValue: string) => any;
}

/**
 * Review re-summary modal component
 *
 * Allows user to select an AI model and trigger re-summary for a review
 *
 * @param visible - Modal visibility state
 * @param onClose - Function to close modal
 * @param selectedModel - Currently selected AI model value
 * @param setSelectedModel - Function to update selected model
 * @param availableModels - Array of available AI models
 * @param onConfirm - Function to execute re-summary
 * @param loading - Loading state during re-summary
 * @param colors - Theme colors object
 * @param getModelOptionStyle - Dynamic style getter for model option
 * @param getModelTextStyle - Dynamic style getter for model text
 * @param getRadioBorderStyle - Dynamic style getter for radio button border
 *
 * @example
 * ```tsx
 * <ResummaryModal
 *   visible={resummaryModalVisible}
 *   onClose={closeResummaryModal}
 *   selectedModel={selectedModel}
 *   setSelectedModel={setSelectedModel}
 *   availableModels={availableModels}
 *   onConfirm={handleResummarize}
 *   loading={resummaryLoading}
 *   colors={colors}
 *   getModelOptionStyle={styleGetters.getModelOptionStyle}
 *   getModelTextStyle={styleGetters.getModelTextStyle}
 *   getRadioBorderStyle={styleGetters.getRadioBorderStyle}
 * />
 * ```
 */
export const ResummaryModal: React.FC<ResummaryModalProps> = ({
  visible,
  onClose,
  selectedModel,
  setSelectedModel,
  availableModels,
  onConfirm,
  loading,
  colors,
  getModelOptionStyle,
  getModelTextStyle,
  getRadioBorderStyle,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <Text style={[styles.modalTitle, { color: colors.text }]}>AI 모델 선택</Text>
          <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
            리뷰를 재요약할 AI 모델을 선택하세요
          </Text>

          {/* Model List */}
          <View style={styles.modelList}>
            {availableModels.map((model) => (
              <TouchableOpacity
                key={model.value}
                style={[
                  styles.modelOption,
                  getModelOptionStyle(model.value)
                ]}
                onPress={() => setSelectedModel(model.value)}
              >
                {/* Radio Button */}
                <View style={[styles.radioButton, getRadioBorderStyle(model.value)]}>
                  {selectedModel === model.value && (
                    <View style={[styles.radioButtonInner, styles.whiteBg]} />
                  )}
                </View>
                {/* Model Label */}
                <Text style={[styles.modelLabel, getModelTextStyle(model.value)]}>
                  {model.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Buttons */}
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton, { backgroundColor: colors.primary }]}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>재요약 시작</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  modelList: {
    marginBottom: 24,
  },
  modelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
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
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
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
  whiteBg: {
    backgroundColor: '#fff',
  },
});
