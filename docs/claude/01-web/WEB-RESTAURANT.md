# WEB-RESTAURANT.md

> **Last Updated**: 2025-10-23 21:45
> **Purpose**: Restaurant component comprehensive documentation (list, detail, crawling, real-time updates)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Restaurant Component (Parent)](#3-restaurant-component-parent)
4. [RestaurantList Component](#4-restaurantlist-component)
5. [RestaurantDetail Component](#5-restaurantdetail-component)
6. [Real-time Updates (Socket.io)](#6-real-time-updates-socketio)
7. [Crawling Features](#7-crawling-features)
8. [Responsive Layout](#8-responsive-layout)
9. [Best Practices](#9-best-practices)
10. [Related Documentation](#10-related-documentation)

---

## 1. Overview

The Restaurant feature is the most complex component in the web application, providing restaurant search, listing, detail view, crawling, and real-time updates. It demonstrates advanced patterns including responsive split-panel layout, Socket.io integration, infinite scroll, and state management.

### Key Features
- **Responsive Layout**: Desktop split-panel (list + detail) vs Mobile route-based toggle
- **Restaurant List**: Category filtering, crawling interface, pagination
- **Restaurant Detail**: Menu/review tabs, infinite scroll, sentiment filter, search
- **Real-time Updates**: Socket.io for crawling progress and completion
- **Crawling Operations**: Restaurant data, menus, reviews, AI summarization
- **Delete & Recrawl**: Management operations with confirmation dialogs

### Component Hierarchy
```
Restaurant (Parent)
├── Header & Drawer
├── Desktop Layout
│   ├── RestaurantList (420px fixed)
│   └── RestaurantDetail (flex)
└── Mobile Layout
    └── Routes
        ├── / → RestaurantList (full screen)
        └── /:id → RestaurantDetail (full screen)
```

---

## 2. Architecture

### 2.1 File Structure

```
apps/web/src/components/
├── Restaurant.tsx                  # Parent component with layout logic
├── Restaurant/
│   ├── RestaurantList.tsx         # List with category filter and crawling
│   ├── RestaurantDetail.tsx       # Detail with tabs (menu/review/statistics/map)
│   └── RecrawlModal.tsx           # Recrawl options modal
└── hooks/
    ├── useRestaurant.ts           # List state management
    └── useRestaurantDetail.ts     # Detail state management
```

### 2.2 State Management Pattern

**Parent Component** (`Restaurant.tsx`):
- **Responsive State**: `isMobile` (window.innerWidth < 768)
- **Drawer State**: `drawerVisible`
- **Socket Callbacks**: Set callbacks for data refresh

**Custom Hooks**:
- **useRestaurant**: List data (categories, restaurants, crawling)
- **useRestaurantDetail**: Detail data (menus, reviews, tabs)
- **useSocket**: Socket.io connection and progress tracking

**No Global State**: All state is local to components/hooks

---

## 3. Restaurant Component (Parent)

### 3.1 File Location

**Location**: `apps/web/src/components/Restaurant.tsx`

### 3.2 Responsibilities

1. **Layout Decision**: Render desktop or mobile layout based on `isMobile`
2. **Socket Setup**: Configure callbacks for data refresh
3. **State Provider**: Pass shared state to child components
4. **Navigation**: Handle routing for mobile layout

### 3.3 Implementation

```typescript
import React, { useState, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { useTheme, useSocket } from '@shared/contexts'
import { THEME_COLORS } from '@shared/constants'
import { useRestaurant } from '../hooks/useRestaurant'
import Header from './Header'
import Drawer from './Drawer'
import RestaurantList from './Restaurant/RestaurantList'
import RestaurantDetail from './Restaurant/RestaurantDetail'

const Restaurant: React.FC<RestaurantProps> = ({ onLogout }) => {
  // State from custom hook
  const restaurantState = useRestaurant()

  // Socket connection
  const { menuProgress, crawlProgress, dbProgress, setRestaurantCallbacks, resetCrawlStatus } = useSocket()

  const { theme } = useTheme()
  const [drawerVisible, setDrawerVisible] = useState(false)
  const colors = THEME_COLORS[theme]
  const location = useLocation()

  // Responsive detection
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Mobile: scroll to top on route change
  useEffect(() => {
    if (isMobile) {
      window.scrollTo(0, 0)
      document.body.scrollTop = 0
      document.documentElement.scrollTop = 0
    }
  }, [location.pathname, isMobile])

  const handleLogout = async () => {
    await onLogout()
    window.location.href = '/login'
  }

  const {
    url, setUrl, loading, categories, categoriesLoading,
    restaurants, restaurantsLoading, total, selectedCategory, setSelectedCategory,
    handleCrawl, handleRestaurantClick, fetchRestaurants, fetchCategories,
  } = restaurantState

  // Crawl with socket callbacks
  const handleCrawlWithSocket = async () => {
    resetCrawlStatus()

    // Set callbacks for data refresh after crawling
    setRestaurantCallbacks({
      onReviewCrawlCompleted: async () => {
        await fetchRestaurants()
        await fetchCategories()
      },
      onReviewCrawlError: async () => {
        await fetchRestaurants()
        await fetchCategories()
      }
    })

    await handleCrawl()
  }

  return (
    <div className="restaurant-grid-container" style={{ backgroundColor: colors.background }}>
      <Header onMenuPress={() => setDrawerVisible(true)} />

      <div className={`restaurant-content ${isMobile ? 'mobile' : 'desktop'}`}>
        {/* Mobile: Route-based toggle */}
        {isMobile ? (
          <Routes>
            <Route index element={<RestaurantList {...props} isMobile={true} />} />
            <Route path=":id" element={<RestaurantDetail isMobile={true} />} />
          </Routes>
        ) : (
          // Desktop: Split-panel with simultaneous view
          <Routes>
            <Route path="*" element={<DesktopLayout {...props} />} />
          </Routes>
        )}
      </div>

      <Drawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} onLogout={handleLogout} />
    </div>
  )
}

// Desktop layout component (inside routing context)
const DesktopLayout: React.FC = (props) => {
  return (
    <>
      <RestaurantList {...props} isMobile={false} />
      <Routes>
        <Route path=":id" element={<RestaurantDetail isMobile={false} />} />
      </Routes>
    </>
  )
}
```

### 3.4 Key Patterns

#### Responsive Detection
```typescript
const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

useEffect(() => {
  const handleResize = () => setIsMobile(window.innerWidth < 768)
  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}, [])
```

#### Socket Callback Setup
```typescript
setRestaurantCallbacks({
  onReviewCrawlCompleted: async () => {
    await fetchRestaurants()  // Refresh list
    await fetchCategories()   // Refresh categories
  },
  onReviewCrawlError: async () => {
    // Also refresh on error (partial data may exist)
    await fetchRestaurants()
    await fetchCategories()
  }
})
```

**Purpose**: When crawling completes (in any tab/window), refresh data in current window

#### Mobile Scroll Reset
```typescript
useEffect(() => {
  if (isMobile) {
    window.scrollTo(0, 0)
    document.body.scrollTop = 0
    document.documentElement.scrollTop = 0
  }
}, [location.pathname, isMobile])
```

**Why**: Prevent scroll position from carrying over between list and detail

---

## 4. RestaurantList Component

### 4.1 File Location

**Location**: `apps/web/src/components/Restaurant/RestaurantList.tsx`

### 4.2 Responsibilities

1. **Crawling Interface**: URL input, crawl button, progress indicators
2. **Category Filter**: Horizontal scrolling category chips
3. **Restaurant Cards**: Clickable cards with name, category, actions
4. **Actions**: Recrawl, delete operations with confirmation
5. **Pagination**: Load more button for additional results

### 4.3 Component Structure

```
RestaurantList
├── Crawling Section
│   ├── URL Input
│   ├── Crawl Button
│   └── Progress Indicators (menu, crawl, db)
├── Category Filter
│   ├── "All" Chip
│   └── Category Chips (scrollable)
├── Restaurant Cards Grid
│   ├── Restaurant Card
│   │   ├── Name
│   │   ├── Category Badge
│   │   ├── Actions (Recrawl, Delete)
│   │   └── Click → Navigate to detail
│   └── ...
└── Load More Button
```

### 4.4 Key Features

#### URL Input and Crawling
```typescript
<TextInput
  style={[searchInputStyle, { borderColor: colors.border, color: colors.text }]}
  value={url}
  onChangeText={setUrl}
  placeholder="네이버 맵 URL을 입력하세요"
  placeholderTextColor={colors.textSecondary}
/>

<TouchableOpacity
  style={[styles.crawlButton, { backgroundColor: colors.primary }]}
  onPress={handleCrawl}
  disabled={loading}
>
  <Text style={styles.crawlButtonText}>
    {loading ? '크롤링 중...' : '크롤링 시작'}
  </Text>
</TouchableOpacity>
```

**Flow**:
1. User pastes Naver Map URL
2. Clicks "크롤링 시작" button
3. API request sent to `/api/crawler/restaurant`
4. Socket.io emits progress updates
5. Progress indicators update in real-time
6. On completion, list refreshes with new restaurant

#### Progress Indicators
```typescript
{menuProgress && (
  <View style={[styles.progressBar, { backgroundColor: colors.surface }]}>
    <Text style={{ color: colors.text }}>
      메뉴 크롤링: {menuProgress.current}/{menuProgress.total} ({menuProgress.percentage}%)
    </Text>
  </View>
)}

{crawlProgress && (
  <View style={[styles.progressBar, { backgroundColor: colors.surface }]}>
    <Text style={{ color: colors.text }}>
      리뷰 크롤링: {crawlProgress.current}/{crawlProgress.total} ({crawlProgress.percentage}%)
    </Text>
  </View>
)}
```

**Socket Data** (from `useSocket()`):
- `menuProgress`: Menu crawling progress
- `crawlProgress`: Review web crawling progress
- `dbProgress`: Review DB saving progress

#### Category Filter
```typescript
<View style={styles.categoryChipsContainer}>
  <TouchableOpacity
    style={[styles.categoryChip, selectedCategory === null && styles.categoryChipActive]}
    onPress={() => setSelectedCategory(null)}
  >
    <Text>전체 ({total})</Text>
  </TouchableOpacity>

  {categories.map((category) => (
    <TouchableOpacity
      key={category.category}
      style={[styles.categoryChip, selectedCategory === category.category && styles.categoryChipActive]}
      onPress={() => handleCategoryClick(category.category)}
    >
      <Text>{category.category} ({category.count})</Text>
    </TouchableOpacity>
  ))}
</View>
```

**Features**:
- "전체" (All) chip shows total count
- Each category chip shows count
- Active chip highlighted with different background
- Clicking active chip deselects (resets filter)
- Horizontal scrollable on mobile

#### Restaurant Card
```typescript
<TouchableOpacity
  style={[styles.restaurantCard, { backgroundColor: colors.surface }]}
  onPress={() => handleRestaurantClick(restaurant)}
>
  <Text style={[styles.restaurantName, { color: colors.text }]}>
    {restaurant.name}
  </Text>

  <View style={styles.restaurantActions}>
    {/* Recrawl button */}
    <TouchableOpacity onPress={(e) => handleRecrawlClick(restaurant, e)}>
      <FontAwesomeIcon icon={faRotate} color={colors.primary} />
    </TouchableOpacity>

    {/* Delete button */}
    <TouchableOpacity onPress={(e) => handleDeleteClick(restaurant, e)}>
      <FontAwesomeIcon icon={faTrash} color={colors.error} />
    </TouchableOpacity>
  </View>
</TouchableOpacity>
```

**Click Behavior**:
- **Card Click**: Navigate to detail view
- **Recrawl Icon**: Open recrawl modal (stop propagation)
- **Delete Icon**: Open delete confirmation (stop propagation)

#### Recrawl Modal
```typescript
<RecrawlModal
  visible={recrawlModalVisible}
  onClose={() => setRecrawlModalVisible(false)}
  onConfirm={handleRecrawlConfirm}
  restaurantName={selectedRestaurant?.name || ''}
/>

// Recrawl options
const handleRecrawlConfirm = async (options: {
  crawlMenus: boolean
  crawlReviews: boolean
  createSummary: boolean
}) => {
  const response = await apiService.recrawlRestaurant(selectedRestaurant.id, options)
  // Refreshes automatically via socket callbacks
}
```

**Options**:
- `crawlMenus`: Recrawl menu data
- `crawlReviews`: Recrawl reviews
- `createSummary`: Generate AI summary after review crawl

#### Delete Confirmation
```typescript
<Modal visible={deleteDialogVisible} transparent>
  <View style={styles.overlay}>
    <View style={styles.dialog}>
      <Text>정말로 삭제하시겠습니까?</Text>
      <Text>{restaurantToDelete?.name}</Text>

      <View style={styles.dialogActions}>
        <TouchableOpacity onPress={() => setDeleteDialogVisible(false)}>
          <Text>취소</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDeleteConfirm}>
          <Text style={{ color: colors.error }}>삭제</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
```

**Flow**:
1. User clicks delete icon
2. Confirmation dialog appears
3. User confirms deletion
4. API call: `DELETE /api/restaurants/:id`
5. List and categories refresh

---

## 5. RestaurantDetail Component

### 5.1 File Location

**Location**: `apps/web/src/components/Restaurant/RestaurantDetail.tsx`

### 5.2 Responsibilities

1. **Tab Navigation**: Menu, Review, Statistics, Map tabs
2. **Menu Display**: Menu items with prices
3. **Review Display**: Reviews with infinite scroll, filters, search
4. **AI Summary**: Display and regenerate review summaries
5. **Real-time Updates**: Socket.io for crawling/summarization progress
6. **Statistics**: Menu mention frequency analysis

### 5.3 Component Structure

```
RestaurantDetail
├── Header (Mobile)
│   ├── Back Button
│   └── Restaurant Name
├── Tab Bar
│   ├── Menu Tab
│   ├── Review Tab
│   ├── Statistics Tab
│   └── Map Tab
└── Tab Content
    ├── Menu Panel
    ├── Review Panel (infinite scroll + filters)
    ├── Statistics Panel
    └── Map Panel
```

### 5.4 Tab System

```typescript
type TabType = 'menu' | 'review' | 'statistics' | 'map'
const [activeTab, setActiveTab] = useState<TabType>('menu')

const handleTabChange = (tab: TabType) => {
  setActiveTab(tab)
  if (scrollContainerRef.current) {
    scrollContainerRef.current.scrollTop = 0  // Reset scroll on tab change
  }
}
```

**Tab Rendering**:
```typescript
<View style={styles.tabBar}>
  {['menu', 'review', 'statistics', 'map'].map((tab) => (
    <TouchableOpacity
      key={tab}
      style={[styles.tab, activeTab === tab && styles.activeTab]}
      onPress={() => handleTabChange(tab)}
    >
      <Text>{TAB_LABELS[tab]}</Text>
    </TouchableOpacity>
  ))}
</View>

{activeTab === 'menu' && <MenuPanel />}
{activeTab === 'review' && <ReviewPanel />}
{activeTab === 'statistics' && <StatisticsPanel />}
{activeTab === 'map' && <MapPanel />}
```

### 5.5 Menu Tab

```typescript
<View>
  {menusLoading ? (
    <ActivityIndicator />
  ) : menus.length === 0 ? (
    <Text>메뉴 정보가 없습니다</Text>
  ) : (
    menus.map((menu) => (
      <View key={menu.id} style={styles.menuCard}>
        {menu.image && <img src={menu.image} style={styles.menuImage} />}
        <Text style={styles.menuName}>{menu.name}</Text>
        <Text style={styles.menuPrice}>{menu.price}</Text>
        {menu.description && <Text>{menu.description}</Text>}
      </View>
    ))
  )}
</View>
```

### 5.6 Review Tab

#### Review List with Infinite Scroll
```typescript
const { reviews, reviewsLoading, hasMoreReviews, loadMoreReviews } = useRestaurantDetail()

// Intersection Observer for infinite scroll
useEffect(() => {
  if (!loadMoreTriggerRef.current) return

  observerRef.current = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !reviewsLoading && hasMoreReviews) {
        loadMoreReviews()  // Load next page
      }
    },
    { threshold: 0.5 }
  )

  observerRef.current.observe(loadMoreTriggerRef.current)

  return () => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }
  }
}, [reviewsLoading, hasMoreReviews])
```

**Scroll Trigger**:
```typescript
{reviews.map((review) => (
  <ReviewCard key={review.id} review={review} />
))}

{/* Infinite scroll trigger */}
{hasMoreReviews && (
  <div ref={loadMoreTriggerRef} style={{ height: 20 }}>
    {reviewsLoading && <ActivityIndicator />}
  </div>
)}
```

#### Sentiment Filter
```typescript
const [sentimentFilter, setSentimentFilter] = useState<'all' | 'positive' | 'negative'>('all')

<View style={styles.filterBar}>
  <TouchableOpacity onPress={() => changeSentimentFilter('all')}>
    <Text>전체</Text>
  </TouchableOpacity>
  <TouchableOpacity onPress={() => changeSentimentFilter('positive')}>
    <Text>긍정</Text>
  </TouchableOpacity>
  <TouchableOpacity onPress={() => changeSentimentFilter('negative')}>
    <Text>부정</Text>
  </TouchableOpacity>
</View>
```

**Filter Logic** (in hook):
```typescript
const filteredReviews = reviews.filter((review) => {
  // Sentiment filter
  if (sentimentFilter === 'positive' && review.sentiment !== 'positive') return false
  if (sentimentFilter === 'negative' && review.sentiment !== 'negative') return false

  // Search filter
  if (searchText && !review.review_text.includes(searchText)) return false

  return true
})
```

#### Review Card
```typescript
<View style={styles.reviewCard}>
  <View style={styles.reviewHeader}>
    <Text style={styles.reviewUser}>{review.user_name}</Text>
    <StarRating rating={review.rating} />
  </View>

  <Text style={styles.reviewText}>{review.review_text}</Text>

  {review.visit_keywords && (
    <View style={styles.keywords}>
      {JSON.parse(review.visit_keywords).map((keyword) => (
        <Text key={keyword} style={styles.keyword}>{keyword}</Text>
      ))}
    </View>
  )}

  {review.ai_summary && (
    <View style={styles.aiSummary}>
      <Text style={styles.aiSummaryLabel}>AI 요약:</Text>
      <Text>{review.ai_summary}</Text>
    </View>
  )}
</View>
```

#### AI Summary Generation
```typescript
// Re-summarize button
<TouchableOpacity onPress={() => handleResummarize(review.id)}>
  <FontAwesomeIcon icon={faRedo} />
  <Text>재요약</Text>
</TouchableOpacity>

// Resummary modal
<Modal visible={resummaryModalVisible}>
  <Select
    value={selectedModel}
    options={availableModels}
    onChange={setSelectedModel}
  />
  <Button onPress={handleResummaryConfirm}>요약 생성</Button>
</Modal>

// API call
const handleResummaryConfirm = async () => {
  await apiService.resummaryReview(selectedReviewId, selectedModel)
  // Socket.io will emit progress and completion
}
```

**Available Models**:
- GPT OSS 20B (Cloud)
- GPT OSS 120B (Cloud)
- DeepSeek v3.1 671B (Cloud)

### 5.7 Statistics Tab

**Menu Mention Frequency**:
```typescript
const fetchMenuStatistics = async (restaurantId: number) => {
  const response = await fetch(`${apiBaseUrl}/api/restaurants/${restaurantId}/menu-statistics?minMentions=1`)
  const result = await response.json()
  setMenuStatistics(result.data)
}

// Display
{menuStatistics?.menuMentions.map((menu) => (
  <View key={menu.menuName} style={styles.statisticsRow}>
    <Text>{menu.menuName}</Text>
    <Text>{menu.mentionCount}회 언급</Text>
    <Text>{menu.totalReviews}개 리뷰</Text>
  </View>
))}
```

**Data**:
- Menu name
- Mention count (how many reviews mention this menu)
- Total reviews analyzed

---

## 6. Real-time Updates (Socket.io)

### 6.1 Socket Connection

**Setup** (in Restaurant component):
```typescript
const { setRestaurantCallbacks, menuProgress, crawlProgress, dbProgress } = useSocket()

// Set callbacks when restaurant room is joined
setRestaurantCallbacks({
  onMenuCrawlCompleted: async () => {
    await fetchMenus(restaurantId)
  },
  onReviewCrawlCompleted: async () => {
    await fetchReviews(restaurantId)
    await fetchRestaurants()  // Refresh list
  },
  onReviewSummaryCompleted: async () => {
    await fetchReviews(restaurantId)  // Refresh to show new summaries
  }
})
```

### 6.2 Room Subscription

**Auto-subscribe** (in RestaurantDetail):
```typescript
useEffect(() => {
  if (id) {
    const restaurantId = parseInt(id, 10)
    joinRestaurantRoom(restaurantId)  // Join room

    return () => {
      leaveRestaurantRoom(restaurantId)  // Leave room on unmount
    }
  }
}, [id])
```

### 6.3 Progress Tracking

**Display Progress**:
```typescript
{menuProgress && (
  <View style={styles.progressIndicator}>
    <Text>메뉴 크롤링 중: {menuProgress.percentage}%</Text>
    <ProgressBar progress={menuProgress.percentage} />
  </View>
)}

{crawlProgress && (
  <View style={styles.progressIndicator}>
    <Text>리뷰 크롤링 중: {crawlProgress.current}/{crawlProgress.total}</Text>
  </View>
)}

{summaryProgress && (
  <View style={styles.progressIndicator}>
    <Text>AI 요약 생성 중: {summaryProgress.completed}/{summaryProgress.total}</Text>
    <Text>실패: {summaryProgress.failed}</Text>
  </View>
)}
```

**Event Types** (from Socket.io):
- `menu:started`, `menu:progress`, `menu:completed`
- `review:started`, `review:crawl_progress`, `review:db_progress`, `review:completed`
- `review_summary:started`, `review_summary:progress`, `review_summary:completed`

---

## 7. Crawling Features

### 7.1 Initial Restaurant Crawl

**Flow**:
1. User enters Naver Map URL
2. Clicks "크롤링 시작" button
3. API: `POST /api/crawler/restaurant`
4. Socket events: `review:started` → `review:crawl_progress` → `review:db_progress` → `review:completed`
5. List refreshes with new restaurant
6. (Optional) Auto-triggers menu/review crawl

### 7.2 Recrawl Operations

**Purpose**: Update existing restaurant data

**Options**:
- **Crawl Menus**: Re-fetch menu information
- **Crawl Reviews**: Re-fetch review data
- **Create Summary**: Generate AI summaries for new reviews

**API**: `POST /api/restaurants/:id/recrawl`

**Body**:
```json
{
  "crawlMenus": true,
  "crawlReviews": true,
  "createSummary": true
}
```

### 7.3 Review Summarization

**Trigger Points**:
1. **During Crawl**: Checkbox in recrawl modal
2. **After Crawl**: Individual review "재요약" button

**Models**:
- GPT OSS 20B (Cloud)
- GPT OSS 120B (Cloud)
- DeepSeek v3.1 671B (Cloud)

**API**: `POST /api/reviews/:id/resummary`

**Socket Events**:
- `review_summary:started`
- `review_summary:progress` (batch processing)
- `review_summary:completed`

---

## 8. Responsive Layout

### 8.1 Desktop Layout (≥768px)

**Structure**:
```
┌─────────────────────────────────────┐
│  Header (48px)                      │
├──────────┬──────────────────────────┤
│          │                          │
│  List    │  Detail                  │
│  420px   │  flex (remaining width)  │
│          │                          │
│  Scroll  │  Scroll                  │
│          │                          │
└──────────┴──────────────────────────┘
```

**CSS**:
```css
.restaurant-content.desktop {
  grid-template-columns: 420px 1fr;
}

.restaurant-scroll-area {
  overflow-y: auto;
  height: 100%;
}
```

**Behavior**:
- Both list and detail visible simultaneously
- Independent scroll areas
- Clicking restaurant in list updates detail panel (URL changes)
- No route transition animation

### 8.2 Mobile Layout (<768px)

**Structure**:
```
List View               Detail View
┌─────────────┐        ┌─────────────┐
│  Header     │        │  Header     │
├─────────────┤        ├─────────────┤
│             │        │ ← Back      │
│  List       │   →    │  Detail     │
│  (100%)     │ Click  │  (100%)     │
│             │        │             │
│  Scroll     │        │  Scroll     │
│             │        │             │
└─────────────┘        └─────────────┘
```

**Routing**:
- `/restaurant` → RestaurantList
- `/restaurant/:id` → RestaurantDetail

**Navigation**:
- Click restaurant card → `navigate(/restaurant/:id)`
- Click back button → `navigate(/restaurant)`

**Behavior**:
- Full-screen toggle
- Route-based navigation
- Scroll resets on route change

---

## 9. Best Practices

### 9.1 Stop Propagation for Action Buttons

**❌ Bad** (card click triggers when clicking action):
```typescript
<TouchableOpacity onPress={() => handleCardClick()}>
  <TouchableOpacity onPress={handleDelete}>
    <Icon /> // Triggers both handleDelete AND handleCardClick
  </TouchableOpacity>
</TouchableOpacity>
```

**✅ Good** (stop propagation):
```typescript
<TouchableOpacity onPress={() => handleCardClick()}>
  <TouchableOpacity onPress={(e) => {
    e.stopPropagation()
    handleDelete()
  }}>
    <Icon /> // Only triggers handleDelete
  </TouchableOpacity>
</TouchableOpacity>
```

### 9.2 Cleanup Socket Listeners

**Pattern**: Always leave room on unmount

```typescript
useEffect(() => {
  if (id) {
    joinRestaurantRoom(id)
    return () => leaveRestaurantRoom(id)  // Cleanup
  }
}, [id])
```

### 9.3 Infinite Scroll with Intersection Observer

**Pattern**: Use ref + IntersectionObserver

```typescript
const loadMoreTriggerRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore()
      }
    },
    { threshold: 0.5 }
  )

  if (loadMoreTriggerRef.current) {
    observer.observe(loadMoreTriggerRef.current)
  }

  return () => observer.disconnect()  // Cleanup
}, [hasMore, loading])
```

### 9.4 Deduplicate Reviews

**Problem**: Infinite scroll can load duplicate reviews

**Solution**: Filter by ID before appending

```typescript
setReviews((prev) => {
  const existingIds = new Set(prev.map(r => r.id))
  const uniqueNewReviews = newReviews.filter(r => !existingIds.has(r.id))
  return [...prev, ...uniqueNewReviews]
})
```

### 9.5 Handle Socket Events with Callbacks

**Pattern**: Set completion/error callbacks BEFORE starting crawl

```typescript
// ✅ CORRECT - Set callbacks first
useEffect(() => {
  if (selectedRestaurant?.id) {
    setRestaurantCallbacks({
      onReviewCrawlCompleted: async () => {
        await fetchRestaurants()  // Refresh data
      },
      onReviewCrawlError: () => {
        Alert.error('Crawl failed')
      }
    })
  }
}, [selectedRestaurant?.id])

// ❌ WRONG - Setting callbacks after crawl starts
const handleCrawl = async () => {
  await crawlReviews()  // Started crawl
  setRestaurantCallbacks({ ... })  // Too late! Won't receive events
}
```

**Why**: Socket events fire immediately after crawl starts. Setting callbacks late means missing initial events.

### 9.6 Reset Status Before New Crawl

**Pattern**: Always reset status before starting new operation

```typescript
const handleCrawl = async () => {
  resetCrawlStatus()  // ✅ Clear previous status first
  resetSummaryStatus()  // ✅ Clear summary status

  // Then start new crawl
  await apiService.crawl({ ... })
}
```

**Why**: Prevents UI confusion from showing old progress/errors during new operation.

---

## 10. Related Documentation

### Web Documentation
- **[WEB-LAYOUT.md](./WEB-LAYOUT.md)**: Responsive layout patterns
- **[WEB-ROUTING.md](./WEB-ROUTING.md)**: Nested routing
- **[WEB-THEME.md](./WEB-THEME.md)**: Theme integration
- **[WEB-PATTERNS.md](./WEB-PATTERNS.md)**: React Native Web patterns

### Shared Documentation
- **[SHARED-HOOKS.md](../03-shared/SHARED-HOOKS.md)**: useReviews, useRestaurantList hooks
- **[SHARED-CONTEXTS.md](../03-shared/SHARED-CONTEXTS.md)**: SocketContext
- **[SHARED-UTILS.md](../03-shared/SHARED-UTILS.md)**: Socket utility types

### Friendly Server Documentation
- **[FRIENDLY-CRAWLER.md](../04-friendly/FRIENDLY-CRAWLER.md)**: Crawler service
- **[FRIENDLY-RESTAURANT.md](../04-friendly/FRIENDLY-RESTAURANT.md)**: Restaurant API
- **[FRIENDLY-REVIEW.md](../04-friendly/FRIENDLY-REVIEW.md)**: Review API
- **[FRIENDLY-REVIEW-SUMMARY.md](../04-friendly/FRIENDLY-REVIEW-SUMMARY.md)**: AI summarization
- **[FRIENDLY-JOB-SOCKET.md](../04-friendly/FRIENDLY-JOB-SOCKET.md)**: Socket.io system

### Core Documentation
- **[ARCHITECTURE.md](../00-core/ARCHITECTURE.md)**: Overall architecture
- **[DATABASE.md](../00-core/DATABASE.md)**: Database schema

---

**Document Version**: 1.0.0
**Covers Files**: `Restaurant.tsx`, `RestaurantList.tsx`, `RestaurantDetail.tsx`, `useRestaurant.ts`, `useRestaurantDetail.ts`
