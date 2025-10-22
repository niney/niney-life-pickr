import React, { useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faRotate, faTimes, faTrash } from '@fortawesome/free-solid-svg-icons'
import { useTheme, THEME_COLORS, apiService, Alert, type RestaurantCategory, type RestaurantData } from '@shared'
import { useLocation } from 'react-router-dom'
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
  menuProgress: { current: number; total: number; percentage: number } | null
  crawlProgress: { current: number; total: number; percentage: number } | null
  dbProgress: { current: number; total: number; percentage: number } | null
  handleCrawl: () => Promise<void>
  handleRestaurantClick: (restaurant: RestaurantData) => void
  fetchRestaurants: (limit?: number, offset?: number) => Promise<void | RestaurantData[]>
  fetchCategories: () => Promise<void>
  isMobile?: boolean
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
  menuProgress,
  crawlProgress,
  dbProgress,
  handleCrawl,
  handleRestaurantClick,
  fetchRestaurants,
  fetchCategories,
  isMobile = false,
}) => {
  const { theme } = useTheme()
  const colors = THEME_COLORS[theme]
  const location = useLocation()

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
  const handleRecrawlClick = (restaurant: RestaurantData, event: React.MouseEvent) => {
    event.stopPropagation() // 카드 클릭 이벤트 방지
    setSelectedRestaurant(restaurant)
    setRecrawlModalVisible(true)
  }

  // 재크롤링 실행
  const handleRecrawlConfirm = async (options: { crawlMenus: boolean; crawlReviews: boolean; createSummary: boolean }) => {
    if (!selectedRestaurant) return

    try {
      const response = await apiService.recrawlRestaurant(selectedRestaurant.id, options)

      if (!response.result) {
        Alert.error('재크롤링 실패', response.message || '재크롤링에 실패했습니다')
      }
      // 성공 시 alert 제거 (백그라운드 실행)
    } catch (error) {
      console.error('재크롤링 오류:', error)
      Alert.error('재크롤링 오류', '재크롤링 중 오류가 발생했습니다')
    }
  }

  // 삭제 버튼 클릭
  const handleDeleteClick = (restaurant: RestaurantData, event: React.MouseEvent) => {
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
        Alert.success(
          '삭제 완료',
          `${restaurantToDelete.name}이(가) 삭제되었습니다.\n메뉴 ${response.data.deletedMenus}개, 리뷰 ${response.data.deletedReviews}개가 함께 삭제되었습니다.`
        )

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
        {/* 검색 영역 */}
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

        {/* 크롤링 진행 상황 */}
        {(menuProgress !== null || crawlProgress !== null || dbProgress !== null) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>크롤링 진행 상황</Text>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
            
            {menuProgress && menuProgress.total > 0 && (
              <View style={[styles.progressCard, { backgroundColor: theme === 'light' ? '#fff' : colors.surface, borderColor: colors.border }]}>
                <View style={styles.progressHeader}>
                  <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>메뉴 수집</Text>
                  <Text style={[styles.progressValue, { color: colors.text }]}>
                    {menuProgress.current} / {menuProgress.total}
                  </Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View
                    style={[styles.progressBarFill, { width: `${menuProgress.percentage}%`, backgroundColor: '#4caf50' }]}
                  />
                </View>
                <Text style={[styles.progressPercentage, { color: colors.textSecondary }]}>
                  {menuProgress.percentage}%
                </Text>
              </View>
            )}

            {crawlProgress && crawlProgress.total > 0 && (
              <View style={[styles.progressCard, { backgroundColor: theme === 'light' ? '#fff' : colors.surface, borderColor: colors.border }]}>
                <View style={styles.progressHeader}>
                  <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>리뷰 수집</Text>
                  <Text style={[styles.progressValue, { color: colors.text }]}>
                    {crawlProgress.current} / {crawlProgress.total}
                  </Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View
                    style={[styles.progressBarFill, { width: `${crawlProgress.percentage}%`, backgroundColor: '#2196f3' }]}
                  />
                </View>
                <Text style={[styles.progressPercentage, { color: colors.textSecondary }]}>
                  {crawlProgress.percentage}%
                </Text>
              </View>
            )}

            {dbProgress && dbProgress.total > 0 && (
              <View style={[styles.progressCard, { backgroundColor: theme === 'light' ? '#fff' : colors.surface, borderColor: colors.border }]}>
                <View style={styles.progressHeader}>
                  <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>DB 저장</Text>
                  <Text style={[styles.progressValue, { color: colors.text }]}>
                    {dbProgress.current} / {dbProgress.total}
                  </Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View
                    style={[styles.progressBarFill, { width: `${dbProgress.percentage}%`, backgroundColor: colors.primary }]}
                  />
                </View>
                <Text style={[styles.progressPercentage, { color: colors.textSecondary }]}>
                  {dbProgress.percentage}%
                </Text>
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
                        <Text style={[
                          styles.restaurantName,
                          { color: isSelected ? colors.primary : colors.text }
                        ]}>
                          {restaurant.name}
                        </Text>
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
                          onPress={(e: any) => handleRecrawlClick(restaurant, e)}
                        >
                          <FontAwesomeIcon icon={faRotate} style={{ fontSize: 14, color: colors.text }} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: '#ff4444' }]}
                          onPress={(e: any) => handleDeleteClick(restaurant, e)}
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
  searchSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
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
})

export default RestaurantList

