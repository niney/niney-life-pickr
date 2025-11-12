import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from 'shared/contexts';
import { THEME_COLORS } from 'shared/constants';
import { useRestaurantSearch } from 'shared/hooks';
import { SearchForm, SearchResultList } from 'shared/components';

const RestaurantSearchScreen: React.FC = () => {
  const { theme } = useTheme();
  const colors = THEME_COLORS[theme];
  const {
    searchResult,
    isLoading,
    error,
    selectedRestaurantNames,
    extractedPlaceIds,
    isExtracting,
    isAddingToQueue,
    queueResults,
    searchRestaurants,
    toggleRestaurantSelection,
    clearSelection,
    selectAll,
    extractPlaceIds,
    addToQueue,
  } = useRestaurantSearch();

  const handleSearch = async (query: string) => {
    await searchRestaurants({
      keyword: query,
      enableScroll: true,
      headless: true
    });
  };

  const handleExtractPlaceIds = async () => {
    await extractPlaceIds();
  };

  const handleAddToQueue = async () => {
    await addToQueue();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <SearchForm onSearch={handleSearch} />

      {/* 선택된 레스토랑 표시 영역 */}
      {selectedRestaurantNames.length > 0 && (
        <View style={[styles.selectedPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.selectedHeader}>
            <Text style={[styles.selectedTitle, { color: colors.text }]}>
              선택된 맛집 ({selectedRestaurantNames.length}개)
            </Text>
            <View style={styles.selectedActions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={selectAll}
              >
                <Text style={styles.actionButtonText}>전체</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.error }]}
                onPress={clearSelection}
              >
                <Text style={styles.actionButtonText}>해제</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.success }]}
                onPress={handleExtractPlaceIds}
                disabled={isExtracting}
              >
                <Text style={styles.actionButtonText}>
                  {isExtracting ? '추출중...' : 'ID추출'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            horizontal
            style={styles.selectedScroll}
            showsHorizontalScrollIndicator={false}
          >
            <View style={styles.selectedIdContainer}>
              {selectedRestaurantNames.map((name) => (
                <View
                  key={name}
                  style={[styles.selectedIdChip, { backgroundColor: colors.secondary + '20', borderColor: colors.secondary }]}
                >
                  <Text style={[styles.selectedIdText, { color: colors.secondary }]} numberOfLines={1}>
                    {name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => toggleRestaurantSelection(name)}
                    style={styles.removeButton}
                  >
                    <Text style={[styles.removeButtonText, { color: colors.secondary }]}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* 추출된 Place IDs 표시 */}
          {extractedPlaceIds.length > 0 && (
            <View style={styles.extractedSection}>
              <View style={styles.extractedHeader}>
                <Text style={[styles.extractedTitle, { color: colors.text }]}>
                  Place IDs ({extractedPlaceIds.filter(r => r.placeId).length}/{extractedPlaceIds.length})
                </Text>

                {/* 대기열 추가 버튼 */}
                <TouchableOpacity
                  style={[
                    styles.queueButton,
                    {
                      backgroundColor: isAddingToQueue ? colors.textSecondary : colors.primary,
                      opacity: isAddingToQueue || extractedPlaceIds.filter(r => r.placeId).length === 0 ? 0.6 : 1,
                    }
                  ]}
                  onPress={handleAddToQueue}
                  disabled={isAddingToQueue || extractedPlaceIds.filter(r => r.placeId).length === 0}
                >
                  <Text style={styles.queueButtonText}>
                    {isAddingToQueue ? '추가중...' : '대기열 🔄'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Queue 추가 결과 */}
              {(queueResults.success.length > 0 || queueResults.failed.length > 0) && (
                <View style={[styles.queueResultPanel, { backgroundColor: colors.background }]}>
                  {queueResults.success.length > 0 && (
                    <Text style={[styles.queueResultText, { color: colors.success }]}>
                      ✅ {queueResults.success.length}개 성공
                    </Text>
                  )}
                  {queueResults.failed.length > 0 && (
                    <View>
                      <Text style={[styles.queueResultText, { color: colors.error }]}>
                        ❌ {queueResults.failed.length}개 실패
                      </Text>
                      <ScrollView style={styles.queueErrorScrollView}>
                        {queueResults.errors.map((err, idx) => (
                          <Text
                            key={idx}
                            style={[styles.queueErrorText, { color: colors.textSecondary }]}
                          >
                            • {err.name}: {err.error}
                          </Text>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                  <Text style={[styles.queueHintText, { color: colors.textSecondary }]}>
                    💡 맛집 탭에서 진행 상황 확인
                  </Text>
                </View>
              )}

              <ScrollView style={styles.extractedScrollView}>
                {extractedPlaceIds.map((result, index) => (
                  <View
                    key={index}
                    style={[
                      styles.extractedItem,
                      {
                        backgroundColor: result.placeId ? colors.success + '10' : colors.error + '10',
                        borderColor: result.placeId ? colors.success : colors.error
                      }
                    ]}
                  >
                    <Text style={[styles.extractedName, { color: colors.text }]} numberOfLines={1}>
                      {result.name}
                    </Text>
                    {result.placeId ? (
                      <Text
                        style={[styles.extractedPlaceId, { color: colors.success }]}
                        selectable
                      >
                        ID: {result.placeId}
                      </Text>
                    ) : (
                      <Text style={[styles.extractedError, { color: colors.error }]}>
                        추출 실패
                      </Text>
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      <SearchResultList
        results={searchResult?.places || []}
        isLoading={isLoading}
        error={error}
        selectedRestaurantNames={selectedRestaurantNames}
        onToggleSelection={toggleRestaurantSelection}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  selectedPanel: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectedActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  selectedScroll: {
    maxHeight: 100,
  },
  selectedIdContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
  },
  selectedIdChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    maxWidth: 150,
  },
  selectedIdText: {
    fontSize: 12,
    fontWeight: '500',
  },
  removeButton: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 18,
  },
  extractedSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  extractedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  extractedTitle: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  queueButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  queueButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  queueResultPanel: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  queueResultText: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  queueErrorScrollView: {
    maxHeight: 80,
    marginTop: 4,
  },
  queueErrorText: {
    fontSize: 10,
    marginLeft: 8,
    marginTop: 2,
  },
  queueHintText: {
    fontSize: 10,
    marginTop: 8,
    fontStyle: 'italic',
  },
  extractedScrollView: {
    maxHeight: 150,
  },
  extractedItem: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  extractedName: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  extractedPlaceId: {
    fontSize: 11,
    fontFamily: 'monospace',
  },
  extractedError: {
    fontSize: 11,
    fontStyle: 'italic',
  },
});

export default RestaurantSearchScreen;
