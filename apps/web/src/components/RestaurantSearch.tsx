import React, { useState, useEffect } from 'react'
import {Routes, Route, useNavigate} from 'react-router-dom'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useTheme } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import { useRestaurantSearch } from '@shared/hooks'
import { SearchForm, SearchResultList } from '@shared/components'
import Header from './Header'
import Drawer from './Drawer'
import SearchResultDetail from './RestaurantSearch/SearchResultDetail'

interface RestaurantSearchProps {
  onLogout: () => Promise<void>
}

// 검색 메인 페이지 컴포넌트
const SearchMainPage: React.FC = () => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]
  const navigate = useNavigate()

  // ==================== 반응형 체크 ====================
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
  } = useRestaurantSearch()

  const handleSearch = async (query: string) => {
    await searchRestaurants({
      keyword: query,
      enableScroll: true,
      headless: true
    })
  }

  const handleExtractPlaceIds = async () => {
    await extractPlaceIds()
  }

  const handleAddToQueue = async () => {
    await addToQueue()
  }

  const handleItemPress = (placeId?: string) => {
    if (placeId) {
      navigate(`/restaurant-search/${placeId}`)
    }
  }

  return (
    <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
      {/* 데스크탑: 2열 레이아웃, 모바일: 1열 레이아웃 */}
      <View style={isMobile ? styles.mobileLayout : styles.desktopLayout}>

        {/* ========== 좌측 영역: 검색 + 선택 패널 ========== */}
        <View style={[styles.leftColumn, isMobile && styles.mobileColumn]}>
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
                    <Text style={styles.actionButtonText}>전체 선택</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.error }]}
                    onPress={clearSelection}
                  >
                    <Text style={styles.actionButtonText}>선택 해제</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.success }]}
                    onPress={handleExtractPlaceIds}
                    disabled={isExtracting}
                  >
                    <Text style={styles.actionButtonText}>
                      {isExtracting ? 'ID 추출 중...' : 'Place ID 추출'}
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
                  <Text style={[styles.selectedIdText, { color: colors.secondary }]}>
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
                  추출된 Place IDs ({extractedPlaceIds.filter(r => r.placeId).length}/{extractedPlaceIds.length}개 성공)
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
                    {isAddingToQueue ? '대기열 추가 중...' : '대기열에 추가 🔄'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Queue 결과 표시 */}
              {(queueResults.success.length > 0 || queueResults.failed.length > 0 || queueResults.alreadyExists.length > 0) && (
                <View style={[styles.queueResultPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.queueResultText, { color: colors.text, fontWeight: 'bold', marginBottom: 8 }]}>
                    대기열 추가 결과
                  </Text>
                  {queueResults.success.length > 0 && (
                    <Text style={[styles.queueResultText, { color: colors.success }]}>
                      ✅ {queueResults.success.length}개 대기열 추가 성공
                    </Text>
                  )}
                  {queueResults.alreadyExists.length > 0 && (
                    <Text style={[styles.queueResultText, { color: '#FFA500' }]}>
                      ℹ️ {queueResults.alreadyExists.length}개 이미 등록된 레스토랑 (건너뜀)
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
                    💡 Job Monitor에서 진행 상황을 확인하세요
                  </Text>
                </View>
              )}              <ScrollView style={styles.extractedScrollView}>
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
                    <Text style={[styles.extractedName, { color: colors.text }]}>
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

              {/* 복사용 텍스트 */}
              <View style={styles.copySection}>
                <Text style={[styles.copyLabel, { color: colors.textSecondary }]}>
                  Place IDs (복사용):
                </Text>
                <Text
                  style={[styles.copyText, { color: colors.text, backgroundColor: colors.background }]}
                  selectable
                >
                  {extractedPlaceIds
                    .filter(r => r.placeId)
                    .map(r => r.placeId)
                    .join(', ')}
                </Text>
              </View>
            </View>
          )}
            </View>
          )}
        </View>

        {/* ========== 우측 영역: 검색 결과 리스트 ========== */}
        <View style={[
          styles.rightColumn,
          isMobile && styles.mobileColumn,
          !isMobile && { borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: 20 }
        ]}>
          <SearchResultList
            results={searchResult?.places || []}
            isLoading={isLoading}
            error={error}
            selectedRestaurantNames={selectedRestaurantNames}
            onToggleSelection={toggleRestaurantSelection}
            onItemPress={handleItemPress}
          />
        </View>
      </View>
    </View>
  )
}

const RestaurantSearch: React.FC<RestaurantSearchProps> = ({ onLogout }) => {
  const { theme } = useTheme()
  const [drawerVisible, setDrawerVisible] = useState(false)

  const colors = THEME_COLORS[theme]

  const handleLogout = async () => {
    await onLogout()
    window.location.href = '/login'
  }

  return (
    <div className="page-container" style={{ backgroundColor: colors.background }}>
      <Header onMenuPress={() => setDrawerVisible(true)} />
      <Drawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onLogout={handleLogout}
      />

      <Routes>
        <Route path="/" element={<SearchMainPage />} />
        <Route path="/:id" element={<SearchResultDetail />} />
      </Routes>
    </div>
  )
}

const styles = StyleSheet.create({
  searchContainer: {
    flex: 1,
  },
  selectedPanel: {
    margin: 16,
    marginTop: 16,
    marginBottom: 16,
    marginLeft: 0,
    marginRight: 0,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    // @ts-expect-error - React Native Web supports these properties
    maxHeight: '80vh',
    overflowY: 'auto',
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectedActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  selectedIdText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'monospace',
  },
  removeButton: {
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 18,
  },
  copySection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  copyLabel: {
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '500',
  },
  copyScrollView: {
    maxHeight: 60,
  },
  copyText: {
    fontSize: 11,
    fontFamily: 'monospace',
    padding: 8,
    borderRadius: 6,
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
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  queueButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  queueButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  queueResultPanel: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  queueResultText: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  queueErrorScrollView: {
    maxHeight: 100,
    marginTop: 4,
  },
  queueErrorText: {
    fontSize: 11,
    marginLeft: 8,
    marginTop: 2,
  },
  queueHintText: {
    fontSize: 11,
    marginTop: 8,
    fontStyle: 'italic',
  },
  extractedScrollView: {
    maxHeight: 200,
  },
  extractedItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  extractedName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  extractedPlaceId: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  extractedError: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  // ==================== 데스크탑 레이아웃 ====================
  mobileLayout: {
    flex: 1,
  },
  desktopLayout: {
    flex: 1,
    flexDirection: 'row',
    gap: 20,
    padding: 16,
  },
  leftColumn: {
    width: '35%',
    minWidth: 320,
    maxWidth: 450,
    paddingRight: 20,
    overflowY: 'auto',
    // @ts-expect-error - React Native Web supports calc
    maxHeight: 'calc(100vh - 80px)', // Header 높이 고려
  },
  rightColumn: {
    flex: 1,
    overflowY: 'auto',
    // @ts-expect-error - React Native Web supports calc
    maxHeight: 'calc(100vh - 80px)', // Header 높이 고려
  },
  mobileColumn: {
    width: '100%',
    maxWidth: '100%',
  },
})

export default RestaurantSearch
