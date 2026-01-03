import React, { useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type GestureResponderEvent
} from 'react-native'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMap, faPlus, faRotate, faTimes, faTrash } from '@fortawesome/free-solid-svg-icons'
import { useTheme, useSocket, THEME_COLORS, apiService, Alert, type RestaurantCategory, type RestaurantData } from '@shared'
import { useLocation, useNavigate } from 'react-router-dom'
import RecrawlModal from './RecrawlModal'

interface RestaurantListProps {
  url: string
  setUrl: (url: string) => void
  loading: boolean
  categories: RestaurantCategory[]
  categoriesLoading: boolean
  restaurants: RestaurantData[]
  restaurantsLoading: boolean
  total: number
  selectedCategory: string | null
  setSelectedCategory: (category: string | null) => void
  searchName: string
  setSearchName: (searchName: string) => void
  searchAddress: string
  setSearchAddress: (searchAddress: string) => void
  handleCrawl: () => Promise<void>
  handleRestaurantClick: (restaurant: RestaurantData) => void
  fetchRestaurants: (limit?: number, offset?: number) => Promise<void | RestaurantData[]>
  fetchCategories: () => Promise<void>
  isMobile?: boolean
  showSeoulMap?: boolean
  setShowSeoulMap?: (show: boolean) => void
  onRestaurantUpdate?: (restaurant: RestaurantData) => void  // ✅ 레스토랑 업데이트 콜백
}

const RestaurantList: React.FC<RestaurantListProps> = ({
  url,
  setUrl,
  loading,
  categories,
  categoriesLoading,
  restaurants,
  restaurantsLoading,
  total,
  selectedCategory,
  setSelectedCategory,
  searchName,
  setSearchName,
  searchAddress,
  setSearchAddress,
  handleCrawl,
  handleRestaurantClick,
  fetchRestaurants,
  fetchCategories,
  isMobile = false,
  showSeoulMap = false,
  setShowSeoulMap,
  onRestaurantUpdate,
}) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]
  const location = useLocation()
  const navigate = useNavigate()

  // ✅ Socket Context에서 Queue/Job 상태 가져오기
  const {
    getRestaurantQueueStatus,
    getRestaurantJobStatus,
    jobs,
    queueItems,
    queueStats
  } = useSocket()

  // URL에서 restaurant id 추출 (/restaurant/:id)
  const restaurantId = location.pathname.split('/restaurant/')[1]?.split('/')[0]

  // 재크롤링 모달 상태
  const [recrawlModalVisible, setRecrawlModalVisible] = useState(false)
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantData | null>(null)

  // 카테고리 모달 상태
  const [categoryModalVisible, setCategoryModalVisible] = useState(false)

  // 삭제 확인 다이얼로그 상태
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false)
  const [restaurantToDelete, setRestaurantToDelete] = useState<RestaurantData | null>(null)

  // 카테고리 클릭 핸들러
  const handleCategoryClick = (category: string) => {
    if (selectedCategory === category) {
      setSelectedCategory(null) // 같은 카테고리 클릭 시 필터 해제
    } else {
      setSelectedCategory(category)
    }
    
    // 데스크탑에서는 선택 후 모달 닫기
    if (!isMobile) {
      setCategoryModalVisible(false)
    }
  }

  // 재크롤링 버튼 클릭
  const handleRecrawlClick = (restaurant: RestaurantData, event: GestureResponderEvent) => {
    event.stopPropagation() // 카드 클릭 이벤트 방지
    setSelectedRestaurant(restaurant)
    setRecrawlModalVisible(true)
  }

  // 재크롤링 실행
  const handleRecrawlConfirm = async (options: {
    crawlMenus: boolean
    crawlReviews: boolean
    createSummary: boolean
    useQueue?: boolean
    catchtableId?: string
    crawlCatchtableReviews?: boolean
  }) => {
    if (!selectedRestaurant) return

    try {
      // ✅ 캐치테이블 ID 업데이트 (독립적으로 처리)
      if (options.catchtableId !== undefined) {
        const updateResponse = await apiService.updateRestaurant(selectedRestaurant.id, {
          catchtable_id: options.catchtableId || null
        })

        if (!updateResponse.result) {
          Alert.error('캐치테이블 ID 업데이트 실패', updateResponse.message || '업데이트에 실패했습니다')
        } else if (updateResponse.data && onRestaurantUpdate) {
          // 업데이트된 레스토랑 정보로 로컬 상태 업데이트
          onRestaurantUpdate(updateResponse.data)
        }
      }

      // ✅ 캐치테이블 리뷰 크롤링 (독립적으로 처리)
      if (options.crawlCatchtableReviews) {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
        const response = await fetch(`${API_URL}/api/catchtable/${selectedRestaurant.id}/reviews/crawl`, {
          method: 'POST',
          credentials: 'include',
        })

        const data = await response.json()

        if (!response.ok || !data.result) {
          Alert.error('캐치테이블 리뷰 크롤링 실패', data.message || '크롤링에 실패했습니다')
        } else {
          console.log(`[Catchtable] 리뷰 크롤링 완료: ${data.data?.totalSaved}개 저장`)
        }
      }

      // ✅ 재크롤링 옵션이 없으면 여기서 종료
      if (!options.crawlMenus && !options.crawlReviews && !options.createSummary) {
        return
      }

      // ✅ Queue 방식 선택 시
      if (options.useQueue && options.crawlReviews) {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
        const response = await fetch(`${API_URL}/api/crawler/crawl-queued`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            restaurantId: selectedRestaurant.id,
          }),
        })

        const data = await response.json()

        if (!response.ok || !data.result) {
          Alert.error('Queue 추가 실패', data.message || 'Queue에 추가하지 못했습니다')
          return
        }

        // 성공 시 alert 제거 (백그라운드 실행)
        console.log(`[Queue] Job added: position ${data.data.position}`)
      } else {
        // ✅ 기존 병렬 처리 방식
        const response = await apiService.recrawlRestaurant(selectedRestaurant.id, options)

        if (!response.result) {
          Alert.error('재크롤링 실패', response.message || '재크롤링에 실패했습니다')
        }
      }
    } catch (error) {
      console.error('재크롤링 오류:', error)
      Alert.error('재크롤링 오류', '재크롤링 중 오류가 발생했습니다')
    }
  }

  // 삭제 버튼 클릭
  const handleDeleteClick = (restaurant: RestaurantData, event: GestureResponderEvent) => {
    event.stopPropagation() // 카드 클릭 이벤트 방지
    setRestaurantToDelete(restaurant)
    setDeleteDialogVisible(true)
  }

  // 삭제 실행
  const handleDeleteConfirm = async () => {
    if (!restaurantToDelete) return

    try {
      const response = await apiService.deleteRestaurant(restaurantToDelete.id)

      if (response.result && response.data) {
        // 목록 새로고침
        await Promise.all([
          fetchRestaurants(),
          fetchCategories()
        ])
      } else {
        Alert.error('삭제 실패', response.message || '레스토랑 삭제에 실패했습니다')
      }
    } catch (error) {
      console.error('삭제 오류:', error)
      Alert.error('삭제 오류', '레스토랑 삭제 중 오류가 발생했습니다')
    } finally {
      setDeleteDialogVisible(false)
      setRestaurantToDelete(null)
    }
  }

  return (
    <div
      className={isMobile ? '' : 'restaurant-scroll-area'}
      style={{
        backgroundColor: colors.background,
        borderRight: isMobile ? 'none' : `1px solid ${colors.border}`,
        padding: 20,
      }}
    >
        {/* 데스크탑 전용: 서울 지도 보기 버튼 */}
        {!isMobile && setShowSeoulMap && (
          <TouchableOpacity
            style={[styles.mapButton, {
              backgroundColor: showSeoulMap ? colors.primary : colors.surface,
              borderColor: colors.border
            }]}
            onPress={() => setShowSeoulMap(!showSeoulMap)}
          >
            <FontAwesomeIcon
              icon={faMap}
              style={{ fontSize: 16, color: showSeoulMap ? '#fff' : colors.text, marginRight: 8 }}
            />
            <Text style={[styles.mapButtonText, { color: showSeoulMap ? '#fff' : colors.text }]}>
              {showSeoulMap ? '레스토랑 목록으로' : '서울 지도 보기'}
            </Text>
          </TouchableOpacity>
        )}

        {/* 모바일 전용: 서울 지도 보기 버튼 */}
        {isMobile && (
          <TouchableOpacity
            style={[styles.mapButton, {
              backgroundColor: colors.surface,
              borderColor: colors.border
            }]}
            onPress={() => navigate('/restaurant/map')}
          >
            <FontAwesomeIcon
              icon={faMap}
              style={{ fontSize: 16, color: colors.text, marginRight: 8 }}
            />
            <Text style={[styles.mapButtonText, { color: colors.text }]}>
              서울 지도 보기
            </Text>
          </TouchableOpacity>
        )}

        {/* 크롤링 URL 입력 영역 */}
        <View style={styles.searchSection}>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: theme === 'light' ? '#fff' : colors.surface }]}
            placeholder="네이버 플레이스 URL을 입력하세요"
            placeholderTextColor={colors.textSecondary}
            value={url}
            onChangeText={setUrl}
          />
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={handleCrawl}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <FontAwesomeIcon icon={faPlus} style={{ fontSize: 20, color: '#fff' }} />
            )}
          </TouchableOpacity>
        </View>

        {/* 레스토랑 이름 검색 영역 */}
        <View style={styles.restaurantSearchSection}>
          <View style={{ position: 'relative', flex: 1 }}>
            <TextInput
              style={[styles.restaurantSearchInput, { borderColor: colors.border, color: colors.text, backgroundColor: theme === 'light' ? '#fff' : colors.surface }]}
              placeholder="레스토랑 이름 검색..."
              placeholderTextColor={colors.textSecondary}
              value={searchName}
              onChangeText={setSearchName}
            />
            {searchName.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchName('')}
                style={styles.clearButton}
              >
                <FontAwesomeIcon icon={faTimes} style={{ fontSize: 16, color: colors.textSecondary }} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 레스토랑 주소 검색 영역 */}
        <View style={styles.restaurantSearchSection}>
          <View style={{ position: 'relative', flex: 1 }}>
            <TextInput
              style={[styles.restaurantSearchInput, { borderColor: colors.border, color: colors.text, backgroundColor: theme === 'light' ? '#fff' : colors.surface }]}
              placeholder="레스토랑 주소 검색..."
              placeholderTextColor={colors.textSecondary}
              value={searchAddress}
              onChangeText={setSearchAddress}
            />
            {searchAddress.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchAddress('')}
                style={styles.clearButton}
              >
                <FontAwesomeIcon icon={faTimes} style={{ fontSize: 16, color: colors.textSecondary }} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 카테고리 섹션 */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => !isMobile && categories.length > 0 && setCategoryModalVisible(true)}
            activeOpacity={isMobile ? 1 : 0.7}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              카테고리 {selectedCategory && `· ${selectedCategory}`}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {categoriesLoading && <ActivityIndicator size="small" color={colors.primary} />}
              {!isMobile && categories.length > 0 && (
                <View style={[styles.categoryBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.categoryBadgeText}>{categories.length}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* 모바일: 가로 스크롤 카테고리 */}
          {isMobile && categories.length > 0 && (
            <div style={{ 
              display: 'flex', 
              overflowX: 'auto',
              gap: '10px',
              flexWrap: 'nowrap',
              paddingBottom: '8px',
              WebkitOverflowScrolling: 'touch',
            }}>
              {categories.map((category: RestaurantCategory) => (
                <TouchableOpacity
                  key={category.category}
                  onPress={() => handleCategoryClick(category.category)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.categoryCard, 
                      { 
                        backgroundColor: theme === 'light' ? '#f8f9fa' : colors.surface, 
                        borderColor: selectedCategory === category.category ? colors.primary : colors.border,
                        borderWidth: selectedCategory === category.category ? 2 : 1,
                        flexShrink: 0,
                      }
                    ]}
                  >
                    <Text style={[
                      styles.categoryName, 
                      { color: selectedCategory === category.category ? colors.primary : colors.text }
                    ]}>
                      {category.category}
                    </Text>
                    <Text style={[styles.categoryCount, { color: colors.textSecondary }]}>{category.count}개</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </div>
          )}
          
          {!categoriesLoading && categories.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>등록된 카테고리가 없습니다</Text>
          )}
        </View>

        {/* 큐 및 Job 상태 */}
        {(queueItems.length > 0 || jobs.length > 0) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                📊 진행 상태
              </Text>
            </View>

            {/* 대기열 현황 */}
            {queueItems.length > 0 && (
              <View style={styles.statusCard}>
                <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
                  대기열: {queueStats.waiting}개 대기 / {queueStats.processing}개 처리 중
                </Text>
              </View>
            )}

            {/* 실행 중 Job 현황 */}
            {jobs.length > 0 && (
              <View style={styles.statusCard}>
                <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
                  실행 중: {jobs.filter(j => j.status === 'active').length}개
                </Text>
                {jobs.filter(j => j.isInterrupted).length > 0 && (
                  <Text style={[styles.statusLabel, { color: '#ff9800' }]}>
                    ⚠️ 중단됨: {jobs.filter(j => j.isInterrupted).length}개
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* 레스토랑 목록 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>레스토랑 ({total})</Text>
            {restaurantsLoading && <ActivityIndicator size="small" color={colors.primary} />}
          </View>

          {restaurants.length > 0 ? (
            <View style={styles.restaurantsList}>
              {restaurants.map((restaurant: RestaurantData) => {
                const isSelected = restaurantId === String(restaurant.id)

                // ✅ Queue/Job 상태 조회
                const queueStatus = getRestaurantQueueStatus(restaurant.id)
                const jobStatus = getRestaurantJobStatus(restaurant.id)

                // 우선순위: 중단됨 > Job > Queue
                const hasInterruptedJob = jobStatus && jobStatus.isInterrupted
                const hasActiveJob = jobStatus && jobStatus.status === 'active' && !jobStatus.isInterrupted
                const hasQueueItem = queueStatus && (queueStatus.queueStatus === 'waiting' || queueStatus.queueStatus === 'processing')

                return (
                  <TouchableOpacity
                    key={restaurant.id}
                    style={[
                      styles.restaurantCard,
                      {
                        backgroundColor: isSelected
                          ? (theme === 'light' ? '#f0f7ff' : 'rgba(33, 150, 243, 0.15)')
                          : (theme === 'light' ? '#fff' : colors.surface),
                        borderColor: isSelected ? colors.primary : colors.border,
                        borderWidth: isSelected ? 2 : 1,
                      }
                    ]}
                    onPress={() => handleRestaurantClick(restaurant)}
                  >
                    <View style={styles.restaurantCardContent}>
                      <View style={styles.restaurantInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <Text style={[
                            styles.restaurantName,
                            { color: isSelected ? colors.primary : colors.text }
                          ]}>
                            {restaurant.name}
                          </Text>

                          {/* ✅ 상태 배지 */}
                          {hasInterruptedJob && (
                            <View style={[styles.statusBadge, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                              <Text style={[styles.statusBadgeText, { color: '#f59e0b' }]}>
                                ⚠️ 중단됨
                              </Text>
                            </View>
                          )}
                          {!hasInterruptedJob && hasActiveJob && (
                            <View style={[styles.statusBadge, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                              <Text style={[styles.statusBadgeText, { color: '#10b981' }]}>
                                🔄 처리 중
                              </Text>
                            </View>
                          )}
                          {!hasInterruptedJob && !hasActiveJob && hasQueueItem && (
                            <View style={[styles.statusBadge, { backgroundColor: 'rgba(255, 152, 0, 0.1)' }]}>
                              <Text style={[styles.statusBadgeText, { color: '#ff9800' }]}>
                                ⏳ 대기 중
                                {queueStatus.position && ` (${queueStatus.position}번째)`}
                              </Text>
                            </View>
                          )}
                        </View>

                        {restaurant.category && (
                          <Text style={[styles.restaurantCategory, { color: colors.textSecondary }]}>{restaurant.category}</Text>
                        )}
                        {restaurant.address && (
                          <Text style={[styles.restaurantAddress, { color: colors.textSecondary }]} numberOfLines={1}>
                            {restaurant.address}
                          </Text>
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: colors.border }]}
                          onPress={(e) => handleRecrawlClick(restaurant, e)}
                        >
                          <FontAwesomeIcon icon={faRotate} style={{ fontSize: 14, color: colors.text }} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: '#ff4444' }]}
                          onPress={(e) => handleDeleteClick(restaurant, e)}
                        >
                          <FontAwesomeIcon icon={faTrash} style={{ fontSize: 14, color: '#fff' }} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          ) : !restaurantsLoading ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>등록된 레스토랑이 없습니다</Text>
          ) : null}
        </View>

        <RecrawlModal
          visible={recrawlModalVisible}
          onClose={() => setRecrawlModalVisible(false)}
          onConfirm={handleRecrawlConfirm}
          restaurantName={selectedRestaurant?.name || ''}
          currentCatchtableId={selectedRestaurant?.catchtable_id}
        />

        {/* 삭제 확인 다이얼로그 */}
        <Modal
          visible={deleteDialogVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setDeleteDialogVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.deleteDialogContent, { backgroundColor: colors.surface }]}>
              <View style={styles.deleteDialogHeader}>
                <FontAwesomeIcon icon={faTrash} style={{ fontSize: 24, color: '#ff4444' }} />
              </View>
              <Text style={[styles.deleteDialogTitle, { color: colors.text }]}>레스토랑 삭제</Text>
              <Text style={[styles.deleteDialogMessage, { color: colors.textSecondary }]}>
                {restaurantToDelete?.name}을(를) 삭제하시겠습니까?{'\n'}
                모든 메뉴, 리뷰, 이미지가 함께 삭제되며 복구할 수 없습니다.
              </Text>
              <View style={styles.deleteDialogButtons}>
                <TouchableOpacity
                  style={[styles.deleteDialogButton, styles.cancelButton, { borderColor: colors.border }]}
                  onPress={() => setDeleteDialogVisible(false)}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.text }]}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.deleteDialogButton, styles.confirmButton, { backgroundColor: '#ff4444' }]}
                  onPress={handleDeleteConfirm}
                >
                  <Text style={styles.confirmButtonText}>삭제</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 카테고리 선택 모달 */}
        <Modal
          visible={categoryModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setCategoryModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>카테고리 선택</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setCategoryModalVisible(false)}
                >
                  <FontAwesomeIcon icon={faTimes} style={{ fontSize: 20, color: colors.text }} />
                </TouchableOpacity>
              </View>

              <div style={{ 
                padding: 16, 
                maxHeight: 500, 
                overflowY: 'auto',
                overflowX: 'hidden',
              }}>
                {/* 전체 선택 옵션 */}
                <TouchableOpacity
                  style={[
                    styles.modalCategoryItem,
                    {
                      backgroundColor: !selectedCategory 
                        ? (theme === 'light' ? '#f0f7ff' : 'rgba(33, 150, 243, 0.15)')
                        : 'transparent',
                      borderColor: !selectedCategory ? colors.primary : colors.border,
                    }
                  ]}
                  onPress={() => {
                    setSelectedCategory(null)
                    setCategoryModalVisible(false)
                  }}
                >
                  <Text style={[
                    styles.modalCategoryName,
                    { color: !selectedCategory ? colors.primary : colors.text }
                  ]}>
                    전체
                  </Text>
                  <Text style={[styles.modalCategoryCount, { color: colors.textSecondary }]}>
                    {total}개
                  </Text>
                </TouchableOpacity>

                {/* 카테고리 목록 */}
                {categories.map((category: RestaurantCategory) => (
                  <TouchableOpacity
                    key={category.category}
                    style={[
                      styles.modalCategoryItem,
                      {
                        backgroundColor: selectedCategory === category.category
                          ? (theme === 'light' ? '#f0f7ff' : 'rgba(33, 150, 243, 0.15)')
                          : 'transparent',
                        borderColor: selectedCategory === category.category ? colors.primary : colors.border,
                      }
                    ]}
                    onPress={() => handleCategoryClick(category.category)}
                  >
                    <Text style={[
                      styles.modalCategoryName,
                      { color: selectedCategory === category.category ? colors.primary : colors.text }
                    ]}>
                      {category.category}
                    </Text>
                    <Text style={[styles.modalCategoryCount, { color: colors.textSecondary }]}>
                      {category.count}개
                    </Text>
                  </TouchableOpacity>
                ))}
              </div>
            </View>
          </View>
        </Modal>
    </div>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  desktopContainer: {
    width: 420,
    minWidth: 420,
    maxWidth: 420,
    borderRightWidth: 1,
  },
  mobileContainer: {
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  mapButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restaurantSearchSection: {
    marginBottom: 12,
  },
  restaurantSearchInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingRight: 40,
    fontSize: 15,
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 90,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 13,
  },
  statusCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  restaurantsList: {
    gap: 10,
  },
  restaurantCard: {
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  restaurantCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  restaurantInfo: {
    flex: 1,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recrawlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restaurantName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  restaurantCategory: {
    fontSize: 14,
    marginBottom: 4,
  },
  restaurantAddress: {
    fontSize: 14,
  },
  emptyText: {
    fontSize: 15,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  // 모달 스타일
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
    maxHeight: '80%',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCategoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  modalCategoryName: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalCategoryCount: {
    fontSize: 14,
  },
  // 삭제 다이얼로그 스타일
  deleteDialogContent: {
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
  deleteDialogHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteDialogTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  deleteDialogMessage: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  deleteDialogButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteDialogButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    // backgroundColor set inline
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  interruptedMessage: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 12,
    lineHeight: 20,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
})

export default RestaurantList

